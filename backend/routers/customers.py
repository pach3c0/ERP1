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

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=CustomerRead)
def create_customer(
    customer_input: CustomerCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # Verificar documento duplicado
    existing = session.exec(select(Customer).where(Customer.document == customer_input.document)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Documento já cadastrado no sistema")
    
    # Verificar se o role do usuário exige aprovação para novos cadastros
    role_permissions = current_user.role.permissions
    require_approval = role_permissions.get("customer_require_approval", False)
    
    # Criar o cliente
    customer_data = customer_input.dict()
    
    # Definir status baseado na permissão de aprovação
    # Admin sempre cria como ativo, outros roles dependem da configuração
    if current_user.role.slug == "admin":
        # Admin não precisa de aprovação
        customer_data["status"] = "ativo"
    else:
        # Para outros usuários, verificar a permissão
        if require_approval:
            customer_data["status"] = "pendente"
        else:
            customer_data["status"] = "ativo"
    
    # Admin DEVE ter um salesperson_id para poder gerenciar
    if current_user.role.slug == "admin" and not customer_data.get("salesperson_id"):
        # Se não fornecido, usar o próprio ID do admin (se tiver)
        customer_data["salesperson_id"] = current_user.id
    
    # Garantir que todos os campos obrigatórios estão presentes
    for field in ["status", "person_type", "name", "document"]:
        if field not in customer_data or customer_data[field] is None:
            raise HTTPException(status_code=400, detail=f"Campo obrigatório faltando: {field}")
    
    new_customer = Customer(**customer_data)
    new_customer.created_by_id = current_user.id
    
    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)
    
    # Log de auditoria para criação
    audit = AuditLog(
        table_name="customer",
        record_id=new_customer.id,
        action="CREATE",
        user_id=current_user.id,
        changes={
            "created": True, 
            "status": new_customer.status,
            "require_approval": require_approval
        }
    )
    session.add(audit)
    session.commit()
    
    return new_customer

@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    customer_input: CustomerCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Check permissions
    role_permissions = current_user.role.permissions
    can_edit_own = role_permissions.get("can_edit_own_customers", False)
    can_edit_others = role_permissions.get("can_edit_others_customers", False)
    
    if current_user.role.slug == "admin":
        # Admin can edit all
        pass
    elif can_edit_own and customer.salesperson_id == current_user.id:
        # Can edit own customers
        pass
    elif can_edit_others:
        # Can edit others' customers
        pass
    else:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar este cliente")
    
    # Capturar valores antigos
    old_values = {key: getattr(customer, key) for key in customer_input.dict().keys()}
    
    # Update the customer
    changes = {}
    for key, value in customer_input.dict().items():
        old_value = getattr(customer, key)
        if old_value != value:
            changes[key] = {"old": old_value, "new": value}
        setattr(customer, key, value)
    
    session.add(customer)
    session.commit()
    session.refresh(customer)
    
    # Log de auditoria para atualização, se houve mudanças
    if changes:
        audit = AuditLog(
            table_name="customer",
            record_id=customer.id,
            action="UPDATE",
            user_id=current_user.id,
            changes=changes
        )
        session.add(audit)
        session.commit()
    
    return customer

# [NOVO] Rota específica para alterar apenas o Status (Mais leve e segura para Bulk Actions)
@router.patch("/{customer_id}/status", response_model=CustomerRead)
def update_customer_status(
    customer_id: int,
    status: str = Body(..., embed=True), # Espera JSON: { "status": "novo_status" }
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Verificação de permissão
    role_slug = current_user.role.slug
    role_permissions = current_user.role.permissions
    can_change_status = role_permissions.get("customer_change_status", False)
    
    # Admin sempre pode alterar
    if role_slug == "admin":
        pass
    # Para outros roles, verificar se tem a permissão específica
    elif not can_change_status:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar status de clientes")
    # Se tem permissão, verificar se é o dono do cliente
    elif customer.salesperson_id != current_user.id:
        # Manager pode alterar qualquer cliente
        if role_slug != "manager":
            raise HTTPException(status_code=403, detail="Você só pode alterar o status dos seus próprios clientes")

    # Auditoria da mudança
    old_status = customer.status
    if old_status != status:
        customer.status = status
        session.add(customer)
        
        audit = AuditLog(
            table_name="customer",
            record_id=customer.id,
            action="UPDATE_STATUS",
            user_id=current_user.id,
            changes={"status": {"old": old_status, "new": status}}
        )
        session.add(audit)
        session.commit()
        session.refresh(customer)
        
    return customer

# [NOVO] Endpoint para verificar se documento já existe
@router.get("/verify/{document}")
def verify_document(
    document: str,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """Verifica se um documento (CPF/CNPJ) já está cadastrado."""
    statement = select(Customer).where(Customer.document == document)
    existing = session.exec(statement).first()
    
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