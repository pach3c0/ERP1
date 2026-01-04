from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Optional

from models import Product, Service, AuditLog, User
from schemas import ProductCreate, ProductRead, ProductUpdate, ServiceCreate, ServiceRead, ServiceUpdate, AuditLogRead
from database import get_session
from dependencies import get_current_user, get_user_role_slug
from utils import create_audit_log

router = APIRouter(prefix="/products", tags=["products"])
service_router = APIRouter(prefix="/services", tags=["services"])

# ===== HELPER FUNCTION =====
def check_permission(current_user: User, session: Session, permission_key: str) -> bool:
    """Verifica se o usuário tem uma permissão específica"""
    role_slug = get_user_role_slug(current_user, session)
    if role_slug == 'admin':
        return True
    return current_user.role.permissions.get(permission_key, False) if current_user.role else False

# ===== PRODUTOS PARA LOCAÇÃO =====

@router.get("/", response_model=List[ProductRead])
def list_products(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Lista produtos - apenas se tem permissão de visualização"""
    if not check_permission(current_user, session, 'can_view_products'):
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar produtos")
    
    products = session.exec(select(Product).order_by(Product.created_at.desc())).all()
    return products

@router.post("/", response_model=ProductRead)
def create_product(product: ProductCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Cria um novo produto"""
    if not check_permission(current_user, session, 'can_create_products'):
        raise HTTPException(status_code=403, detail="Sem permissão para criar produtos")
    
    # Verificar se requer aprovação
    status = "pendente" if current_user.role.permissions.get('product_require_approval', False) else "ativo"
    
    product_data = product.dict()
    product_data.pop('status', None)  # Remove status do dict se existir
    db_product = Product(**product_data, status=status)
    session.add(db_product)
    session.commit()
    session.refresh(db_product)
    
    create_audit_log(
        session=session,
        table_name='product',
        record_id=db_product.id,
        action='CREATE',
        user_id=current_user.id,
        changes={'name': product.name, 'status': status}
    )
    
    return db_product

@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Obtém um produto específico"""
    if not check_permission(current_user, session, 'can_view_products'):
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar produtos")
    
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product

@router.put("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, product: ProductUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Atualiza um produto com validações granulares"""
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Verificar cada campo atualizado
    updates = product.dict(exclude_unset=True)
    
    # Validar permissão para editar dados básicos
    if any(k in updates for k in ['name', 'description']):
        if not check_permission(current_user, session, 'can_edit_product_basic'):
            raise HTTPException(status_code=403, detail="Sem permissão para editar dados básicos do produto")
    
    # Validar permissão para editar preços
    if any(k in updates for k in ['price_daily', 'price_weekly', 'price_monthly']):
        if not check_permission(current_user, session, 'can_edit_product_prices'):
            raise HTTPException(status_code=403, detail="Sem permissão para editar preços do produto")
    
    # Validar permissão para editar quantidade
    if 'quantity' in updates:
        if not check_permission(current_user, session, 'can_edit_product_quantity'):
            raise HTTPException(status_code=403, detail="Sem permissão para editar quantidade do produto")
    
    # Validar permissão para editar status
    if 'status' in updates:
        if not check_permission(current_user, session, 'can_change_product_status'):
            raise HTTPException(status_code=403, detail="Sem permissão para alterar status do produto")
    
    # Rastrear mudanças
    changes = {}
    for key, value in updates.items():
        if value is not None and getattr(db_product, key) != value:
            changes[key] = f"{getattr(db_product, key)} → {value}"
    
    if changes:
        db_product.updated_at = datetime.utcnow()
        for key, value in updates.items():
            if value is not None:
                setattr(db_product, key, value)
        session.add(db_product)
        session.commit()
        session.refresh(db_product)
        
        create_audit_log(
            session=session,
            table_name='product',
            record_id=db_product.id,
            action='UPDATE',
            user_id=current_user.id,
            changes=changes
        )
    
    return db_product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    hard_delete: bool = Body(False, embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Deleta um produto (soft ou hard delete)"""
    db_product = session.get(Product, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if hard_delete:
        # Hard delete - remover completamente
        if not check_permission(current_user, session, 'can_hard_delete_products'):
            raise HTTPException(status_code=403, detail="Sem permissão para deletar permanentemente")
        
        session.delete(db_product)
        action = 'DELETE'
        message = "Produto deletado permanentemente"
    else:
        # Soft delete - mover para lixeira
        if not check_permission(current_user, session, 'can_soft_delete_products'):
            raise HTTPException(status_code=403, detail="Sem permissão para deletar produtos")
        
        db_product.status = "deletado"
        db_product.updated_at = datetime.utcnow()
        session.add(db_product)
        action = 'SOFT_DELETE'
        message = "Produto movido para lixeira"
    
    session.commit()
    
    create_audit_log(
        session=session,
        table_name='product',
        record_id=product_id,
        action=action,
        user_id=current_user.id,
        changes={'name': db_product.name, 'status': 'deletado' if not hard_delete else 'permanentemente removido'}
    )
    
    return {"message": message}

# ===== SERVIÇOS =====

@service_router.get("/", response_model=List[ServiceRead])
def list_services(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Lista serviços - apenas se tem permissão de visualização"""
    if not check_permission(current_user, session, 'can_view_services'):
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar serviços")
    
    services = session.exec(select(Service).order_by(Service.created_at.desc())).all()
    return services

@service_router.post("/", response_model=ServiceRead)
def create_service(service: ServiceCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Cria um novo serviço"""
    if not check_permission(current_user, session, 'can_create_services'):
        raise HTTPException(status_code=403, detail="Sem permissão para criar serviços")
    
    # Verificar se requer aprovação
    status = "pendente" if current_user.role.permissions.get('service_require_approval', False) else "ativo"
    
    service_data = service.dict()
    service_data.pop('status', None)  # Remove status do dict se existir
    db_service = Service(**service_data, status=status)
    session.add(db_service)
    session.commit()
    session.refresh(db_service)
    
    create_audit_log(
        session=session,
        table_name='service',
        record_id=db_service.id,
        action='CREATE',
        user_id=current_user.id,
        changes={'name': service.name, 'status': status}
    )
    
    return db_service

@service_router.get("/{service_id}", response_model=ServiceRead)
def get_service(service_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Obtém um serviço específico"""
    if not check_permission(current_user, session, 'can_view_services'):
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar serviços")
    
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return service

@service_router.put("/{service_id}", response_model=ServiceRead)
def update_service(service_id: int, service: ServiceUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Atualiza um serviço com validações granulares"""
    db_service = session.get(Service, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Verificar cada campo atualizado
    updates = service.dict(exclude_unset=True)
    
    # Validar permissão para editar dados básicos
    if any(k in updates for k in ['name', 'description']):
        if not check_permission(current_user, session, 'can_edit_service_basic'):
            raise HTTPException(status_code=403, detail="Sem permissão para editar dados básicos do serviço")
    
    # Validar permissão para editar preços
    if any(k in updates for k in ['price_base', 'price_hourly']):
        if not check_permission(current_user, session, 'can_edit_service_prices'):
            raise HTTPException(status_code=403, detail="Sem permissão para editar preços do serviço")
    
    # Validar permissão para editar status
    if 'status' in updates:
        if not check_permission(current_user, session, 'can_change_service_status'):
            raise HTTPException(status_code=403, detail="Sem permissão para alterar status do serviço")
    
    # Rastrear mudanças
    changes = {}
    for key, value in updates.items():
        if value is not None and getattr(db_service, key) != value:
            changes[key] = f"{getattr(db_service, key)} → {value}"
    
    if changes:
        db_service.updated_at = datetime.utcnow()
        for key, value in updates.items():
            if value is not None:
                setattr(db_service, key, value)
        session.add(db_service)
        session.commit()
        session.refresh(db_service)
        
        create_audit_log(
            session=session,
            table_name='service',
            record_id=db_service.id,
            action='UPDATE',
            user_id=current_user.id,
            changes=changes
        )
    
    return db_service

@service_router.delete("/{service_id}")
def delete_service(
    service_id: int,
    hard_delete: bool = Body(False, embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Deleta um serviço (soft ou hard delete)"""
    db_service = session.get(Service, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    if hard_delete:
        # Hard delete - remover completamente
        if not check_permission(current_user, session, 'can_hard_delete_services'):
            raise HTTPException(status_code=403, detail="Sem permissão para deletar permanentemente")
        
        session.delete(db_service)
        action = 'DELETE'
        message = "Serviço deletado permanentemente"
    else:
        # Soft delete - mover para lixeira
        if not check_permission(current_user, session, 'can_soft_delete_services'):
            raise HTTPException(status_code=403, detail="Sem permissão para deletar serviços")
        
        db_service.status = "deletado"
        db_service.updated_at = datetime.utcnow()
        session.add(db_service)
        action = 'SOFT_DELETE'
        message = "Serviço movido para lixeira"
    
    session.commit()
    
    create_audit_log(
        session=session,
        table_name='service',
        record_id=service_id,
        action=action,
        user_id=current_user.id,
        changes={'name': db_service.name, 'status': 'deletado' if not hard_delete else 'permanentemente removido'}
    )
    
    return {"message": message}
