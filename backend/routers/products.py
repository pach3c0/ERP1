"""
Rotas HTTP de Produtos
Finas e limpas - toda lógica delegada para ProductService
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlmodel import Session
from typing import Optional, List

from database import get_session
from models import Product
from dependencies import get_current_user
from schemas import ProductCreate, ProductRead, ProductUpdate
from services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductRead)
def create_product(
    product_input: ProductCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Cria um novo produto usando ProductService.
    """
    product_data = product_input.dict()
    new_product = ProductService.create_product(
        session=session,
        product_data=product_data,
        current_user=current_user
    )
    return new_product


@router.get("/")
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Lista produtos com filtros opcionais de status e categoria.
    Retorna paginação com total.
    """
    products = ProductService.get_products_for_user(
        session=session,
        user=current_user,
        skip=skip,
        limit=limit,
        status_filter=status,
        category_filter=category
    )
    
    # Contar total (sem limite)
    all_products = ProductService.get_products_for_user(
        session=session,
        user=current_user,
        status_filter=status,
        category_filter=category
    )
    
    # Serializar produtos manualmente
    items_list = []
    for p in products:
        items_list.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "status": p.status,
            "price_daily": p.price_daily,
            "price_weekly": p.price_weekly,
            "price_monthly": p.price_monthly,
            "cost": p.cost,
            "quantity": p.quantity,
            "serial_number": p.serial_number,
            "notes": p.notes,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    
    return {
        "items": items_list,
        "total": len(all_products),
        "skip": skip,
        "limit": limit
    }


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Busca um produto específico por ID.
    """
    product = ProductService.get_product_by_id(
        session=session,
        product_id=product_id,
        user=current_user
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    return product


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    product_input: ProductUpdate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza um produto existente.
    """
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Filtrar apenas campos preenchidos
    product_data = product_input.dict(exclude_unset=True)
    
    updated_product = ProductService.update_product(
        session=session,
        product=product,
        product_data=product_data,
        current_user=current_user
    )
    
    return updated_product


@router.patch("/{product_id}/status", response_model=ProductRead)
def update_product_status(
    product_id: int,
    status: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza apenas o status do produto (operação leve).
    Status válidos: disponivel, locado, em_manutencao, inativo
    """
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    updated_product = ProductService.update_product_status(
        session=session,
        product=product,
        new_status=status,
        current_user=current_user
    )
    
    return updated_product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Faz soft delete (marca como inativo) de um produto.
    """
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    ProductService.soft_delete_product(
        session=session,
        product=product,
        current_user=current_user
    )
    
    return {"detail": "Produto deletado com sucesso (marcado como inativo)"}


@router.get("/{product_id}/availability")
def check_product_availability(
    product_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Verifica disponibilidade de um produto para locação.
    """
    product = ProductService.get_product_by_id(
        session=session,
        product_id=product_id,
        user=current_user
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    return {
        "product_id": product.id,
        "name": product.name,
        "status": product.status,
        "is_available": product.status == "disponivel",
        "quantity_available": product.quantity if product.status == "disponivel" else 0,
        "price_daily": product.price_daily,
        "price_weekly": product.price_weekly,
        "price_monthly": product.price_monthly
    }
