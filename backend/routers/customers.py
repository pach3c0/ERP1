from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session, select
from typing import List
# Ajuste de importação: removido o prefixo 'backend.' pois o container já inicia nesta pasta
from database import get_session
from models import Customer, AuditLog, CustomerNote, User, Notification
from dependencies import get_current_user
import schemas
from schemas import CustomerCreate, CustomerRead
from connection_manager import manager

# NOVO: Import do Service Layer
from services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=CustomerRead)
def create_customer(
    customer_input: CustomerCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Cria um novo cliente usando o Service Layer.
    Toda a lógica de negócio está em CustomerService.
    """
    customer_data = customer_input.dict()
    new_customer = CustomerService.create_customer(
        session=session,
        customer_data=customer_data,
        current_user=current_user
    )
    return new_customer

@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    customer_input: CustomerCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza um cliente existente usando o Service Layer.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    customer_data = customer_input.dict()
    updated_customer = CustomerService.update_customer(
        session=session,
        customer=customer,
        customer_data=customer_data,
        current_user=current_user
    )
    return updated_customer

# [NOVO] Rota específica para alterar apenas o Status (Mais leve e segura para Bulk Actions)
@router.patch("/{customer_id}/status", response_model=CustomerRead)
def update_customer_status(
    customer_id: int,
    status: str = Body(..., embed=True), # Espera JSON: { "status": "novo_status" }
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza apenas o status do cliente usando o Service Layer.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    updated_customer = CustomerService.update_customer_status(
        session=session,
        customer=customer,
        new_status=status,
        current_user=current_user
    )
    return updated_customer

# [NOVO] Endpoint para verificar se documento já existe
@router.get("/verify/{document}")
def verify_document(
    document: str,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Verifica se um documento (CPF/CNPJ) já está cadastrado."""
    existing = CustomerService.check_document_exists(session, document)
    
    if existing:
        return {"exists": True, "name": existing.name, "id": existing.id}
    return {"exists": False}

@router.get("/")
def read_customers(
    skip: int = 0,
    limit: int = 25,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # ITEM 6: Filtra para não mostrar os excluídos na listagem normal
    statement = select(Customer).where(Customer.status != "excluido")
    
    # Filter by salesperson for non-admin and non-manager users
    if current_user.role.slug not in ["admin", "manager"]:
        statement = statement.where(Customer.salesperson_id == current_user.id)
    
    # Conta total de registros (antes da paginação)
    count_statement = statement.with_only_columns(Customer.id)
    total = len(session.exec(count_statement).all())
    
    # Aplica paginação
    statement = statement.offset(skip).limit(limit)
    customers = session.exec(statement).all()
    
    return {
        "items": customers,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/trash", response_model=List[CustomerRead])
def read_trash(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # ITEM 6: Somente Admin acessa a lixeira
    if current_user.role.slug != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    statement = select(Customer).where(Customer.status == "excluido")
    return session.exec(statement).all()

@router.get("/{customer_id}", response_model=CustomerRead)
def read_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Busca um cliente específico por ID."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Verificar permissões: vendedor só pode ver seus próprios clientes
    if current_user.role.slug not in ["admin", "manager"]:
        if customer.salesperson_id != current_user.id:
            raise HTTPException(status_code=403, detail="Você não tem permissão para acessar este cliente")
    
    return customer

@router.delete("/{customer_id}")
def soft_delete_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # Verificar permissão can_delete_customers
    role_permissions = current_user.role.permissions
    can_delete = role_permissions.get("can_delete_customers", False)
    
    if current_user.role.slug != "admin" and not can_delete:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # ITEM 1: Registro de Auditoria da ação de exclusão
    audit = AuditLog(
        table_name="customer",
        record_id=customer_id,
        action="SOFT_DELETE",
        user_id=current_user.id,
        changes={"status_anterior": customer.status, "status_novo": "excluido"}
    )
    
    customer.status = "excluido"
    session.add(customer)
    session.add(audit)
    session.commit()
    return {"detail": "Cliente enviado para a lixeira"}

@router.put("/{customer_id}/restore")
def restore_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # ITEM 6: Somente Admin pode restaurar
    if current_user.role.slug != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if customer.status != "excluido":
        raise HTTPException(status_code=400, detail="Cliente não está na lixeira")
    
    # Registro de Auditoria da restauração
    audit = AuditLog(
        table_name="customer",
        record_id=customer_id,
        action="RESTORE",
        user_id=current_user.id,
        changes={"status_anterior": "excluido", "status_novo": "ativo"}
    )
    
    customer.status = "ativo"
    session.add(customer)
    session.add(audit)
    session.commit()
    return {"detail": "Cliente restaurado com sucesso"}

@router.delete("/{customer_id}/hard")
def hard_delete_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # ITEM 6: Somente Admin pode deletar definitivamente
    if current_user.role.slug != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if customer.status != "excluido":
        raise HTTPException(status_code=400, detail="Cliente deve estar na lixeira para exclusão definitiva")
    
    # Registro de Auditoria da exclusão definitiva
    audit = AuditLog(
        table_name="customer",
        record_id=customer_id,
        action="HARD_DELETE",
        user_id=current_user.id,
        changes={"deleted": True, "customer_data": {
            "name": customer.name,
            "document": customer.document,
            "status": customer.status
        }}
    )
    
    session.add(audit)
    session.delete(customer)
    session.commit()
    return {"detail": "Cliente excluído definitivamente"}

# --- ENDPOINTS DE NOTAS ---
@router.get("/{customer_id}/notes", response_model=List[schemas.NoteRead])
def get_customer_notes(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # Verificar se o usuário tem acesso ao cliente
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Filtrar por vendedor se não for admin/manager
    if current_user.role.slug not in ["admin", "manager"] and customer.salesperson_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    statement = select(CustomerNote, User.name.label("user_name")).join(User, CustomerNote.created_by_id == User.id).where(
        CustomerNote.customer_id == customer_id
    ).order_by(CustomerNote.created_at.desc())
    
    results = session.exec(statement).all()
    notes = []
    for note, user_name in results:
        notes.append(schemas.NoteRead(
            id=note.id,
            content=note.content,
            created_by_id=note.created_by_id,
            created_at=note.created_at,
            user_name=user_name,
            type=note.type,
            target_user_id=note.target_user_id,
            task_status=note.task_status,
            read_at=note.read_at,
            started_at=note.started_at,
            completed_at=note.completed_at
        ))
    
    return notes

@router.post("/{customer_id}/notes", response_model=schemas.NoteRead)
async def create_customer_note(
    customer_id: int,
    note_data: schemas.NoteCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # Verificar se o usuário tem acesso ao cliente
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Filtrar por vendedor se não for admin/manager
    if current_user.role.slug not in ["admin", "manager"] and customer.salesperson_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Processar menções na nota
    import re
    mentions = re.findall(r'@(\w+)', note_data.content)
    if mentions:
        for mention in mentions:
            # Procurar usuário por nome (case insensitive)
            user = session.exec(select(User).where(User.name.ilike(f"%{mention}%"))).first()
            if user and user.id != current_user.id:
                # Criar notificação
                notification = Notification(
                    user_id=user.id,
                    content=f"{current_user.name} mencionou você em uma nota do cliente {customer.name}: {note_data.content[:100]}{'...' if len(note_data.content) > 100 else ''}",
                    link=f"/customers/{customer_id}",
                    related_note_id=None  # Será definido após criar a nota
                )
                session.add(notification)
                session.commit()  # Commit para obter o ID da notificação
                
                # Enviar via WebSocket
                await manager.send_personal_message({
                    "type": "notification",
                    "content": notification.content,
                    "link": notification.link
                }, user.id)
    
    # Criar a nota
    note = CustomerNote(
        content=note_data.content,
        customer_id=customer_id,
        created_by_id=current_user.id,
        target_user_id=note_data.target_user_id,
        type=note_data.type
    )
    session.add(note)
    session.commit()
    session.refresh(note)
    
    # Atualizar related_note_id nas notificações
    if mentions:
        for mention in mentions:
            user = session.exec(select(User).where(User.name.ilike(f"%{mention}%"))).first()
            if user and user.id != current_user.id:
                # Encontrar a notificação criada e atualizar
                notification = session.exec(
                    select(Notification).where(
                        Notification.user_id == user.id,
                        Notification.content.contains(f"mencionou você em uma nota")
                    ).order_by(Notification.id.desc())
                ).first()
                if notification:
                    notification.related_note_id = note.id
                    session.add(notification)
        session.commit()
    
    return schemas.NoteRead(
        id=note.id,
        content=note.content,
        created_by_id=note.created_by_id,
        created_at=note.created_at,
        user_name=current_user.name,
        type=note.type,
        target_user_id=note.target_user_id,
        task_status=note.task_status,
        read_at=note.read_at,
        started_at=note.started_at,
        completed_at=note.completed_at
    )

@router.patch("/{customer_id}/notes/{note_id}/task")
async def update_task_status(
    customer_id: int,
    note_id: int,
    action: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Atualiza o status de uma tarefa (start, complete, reopen)"""
    # Verificar se a nota existe e é uma tarefa
    note = session.get(CustomerNote, note_id)
    if not note or note.customer_id != customer_id:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    if note.type != "task":
        raise HTTPException(status_code=400, detail="Esta nota não é uma tarefa")
    
    # Atualizar status baseado na ação
    from datetime import datetime
    
    if action == "start":
        note.task_status = "in_progress"
        note.started_at = datetime.utcnow()
    elif action == "complete":
        note.task_status = "completed"
        note.completed_at = datetime.utcnow()
    elif action == "reopen":
        note.task_status = "pending"
        note.completed_at = None
    else:
        raise HTTPException(status_code=400, detail="Ação inválida")
    
    session.add(note)
    session.commit()
    session.refresh(note)
    
    return {"message": "Status atualizado com sucesso", "task_status": note.task_status}