from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from database import get_session
from models import User, Customer, Role, CustomerNote, Notification, UserSupervisor, AuditLog
from schemas import CustomerCreate, CustomerRead, NoteCreate, NoteRead, AuditLogRead
from dependencies import get_current_user, get_user_role_slug
from utils import log_activity, register_audit
from connection_manager import manager

router = APIRouter(tags=["Clientes e CRM"])

# --- FUNÇÕES AUXILIARES ---

async def notify_user_realtime(user_id: int, message: str, link: str):
    """Envia uma notificação via WebSocket em tempo real."""
    await manager.send_personal_message({"content": message, "link": link, "type": "notification"}, user_id)

# --- ROTAS DE CLIENTES ---

@router.get("/customers/verify/{document}")
def verify_document(document: str, session: Session = Depends(get_session)):
    """Verifica se um CPF/CNPJ já existe no banco de dados."""
    doc_clean = "".join([d for d in document if d.isdigit()])
    customer = session.exec(select(Customer).where(Customer.document == doc_clean)).first()
    if customer: 
        return {"exists": True, "id": customer.id, "name": customer.name}
    return {"exists": False}

@router.post("/customers/", response_model=CustomerRead)
def create_customer(
    customer_data: CustomerCreate, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Cria um novo cliente com validação de duplicidade e lógica de aprovação."""
    # Limpa o documento para garantir consistência
    doc_clean = "".join([d for d in customer_data.document if d.isdigit()])
    
    # Verificação de duplicidade
    if session.exec(select(Customer).where(Customer.document == doc_clean)).first():
        raise HTTPException(status_code=400, detail="Este CPF/CNPJ já está cadastrado no sistema.")
    
    new_customer = Customer.from_orm(customer_data)
    new_customer.document = doc_clean
    new_customer.created_by_id = current_user.id
    
    # Se não houver vendedor definido, o criador assume a carteira
    if not new_customer.salesperson_id: 
        new_customer.salesperson_id = current_user.id
    
    user_role = session.get(Role, current_user.role_id)
    permissions = user_role.permissions if user_role and user_role.permissions else {}
    
    # Validação de aprovação pendente baseada em permissão (customer_require_approval)
    if permissions.get("customer_require_approval", False):
        new_customer.status = 'pendente'
        status_msg = "(Pendente)"
        is_pending = True
    else:
        new_customer.status = 'ativo'
        status_msg = "(Ativo)"
        is_pending = False

    session.add(new_customer)
    
    # Log de atividade com visibilidade ajustada
    vis = "admin_manager" if get_user_role_slug(current_user, session) == 'sales' else "public"
    log_activity(session, current_user, f"cadastrou cliente {new_customer.name} {status_msg}", "plus", new_customer.id, visibility=vis)
    
    session.commit()
    session.refresh(new_customer)
    
    # Registro na auditoria técnica
    register_audit(session, current_user, new_customer, {}, "customer", "CREATE")
    session.commit()

    # Notifica supervisores se houver pendência
    if is_pending:
        links = session.exec(select(UserSupervisor).where(UserSupervisor.user_id == current_user.id)).all()
        for link in links:
            msg = f"URGENTE: {current_user.name} cadastrou {new_customer.name} e aguarda aprovação."
            session.add(Notification(user_id=link.supervisor_id, content=msg, link=f"/customers/{new_customer.id}"))
            background_tasks.add_task(notify_user_realtime, link.supervisor_id, msg, f"/customers/{new_customer.id}")
        session.commit()

    return new_customer

@router.get("/customers/", response_model=List[CustomerRead])
def list_customers(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """REQUISITO: Todos os vendedores podem ver todos os clientes."""
    statement = select(Customer).order_by(Customer.id.desc())
    return session.exec(statement).all()

@router.put("/customers/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int, 
    customer_data: CustomerCreate, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Atualiza cliente com validação rigorosa de permissões de carteira."""
    customer = session.get(Customer, customer_id)
    if not customer: 
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    role_slug = get_user_role_slug(current_user, session)
    user_role = session.get(Role, current_user.role_id)
    permissions = user_role.permissions if user_role and user_role.permissions else {}

    # REQUISITO: Regras de permissão de edição por carteira
    is_owner = customer.salesperson_id == current_user.id
    
    if role_slug != 'admin':
        # 1. Editar dados da própria carteira
        if is_owner and not permissions.get("can_edit_own_customers", False):
            raise HTTPException(status_code=403, detail="Você não tem permissão para editar clientes da sua carteira.")
        
        # 2. Editar dados de outras carteiras
        if not is_owner and not permissions.get("can_edit_others_customers", False):
            raise HTTPException(status_code=403, detail="Você não tem permissão para editar clientes de outros vendedores.")

    status_changed = False
    if customer_data.status != customer.status:
        can_change = permissions.get("customer_change_status", False) or role_slug == 'admin'
        if not can_change: 
            raise HTTPException(status_code=403, detail="Você não tem permissão para alterar o status do cliente.")
        status_changed = True

    # Registra o que mudou antes de aplicar na auditoria
    data_to_update = customer_data.dict(exclude_unset=True)
    register_audit(session, current_user, customer, data_to_update, "customer", "UPDATE")
    
    for key, value in data_to_update.items(): 
        setattr(customer, key, value)
    
    session.add(customer)
    
    if status_changed:
        log_activity(session, current_user, f"alterou status de {customer.name} para {customer.status}", "refresh-cw", customer.id, visibility="admin_manager")
        # Notifica o vendedor original se o status foi aprovado por outro
        if customer.status == 'ativo' and customer.salesperson_id and customer.salesperson_id != current_user.id:
             msg = f"Cliente {customer.name} foi APROVADO por {current_user.name}!"
             session.add(Notification(user_id=customer.salesperson_id, content=msg, link=f"/customers/{customer.id}"))
             background_tasks.add_task(notify_user_realtime, customer.salesperson_id, msg, f"/customers/{customer.id}")

    session.commit()
    session.refresh(customer)
    return customer

@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Exclui um cliente (Apenas Administradores e Gerentes)."""
    if get_user_role_slug(current_user, session) not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="Apenas Gerentes e Admins podem excluir cadastros.")
        
    customer = session.get(Customer, customer_id)
    if not customer: 
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
    log_activity(session, current_user, f"excluiu o cliente {customer.name}", "trash", visibility="admin_manager")
    register_audit(session, current_user, customer, {}, "customer", "DELETE")
    
    session.delete(customer)
    session.commit()
    return {"ok": True}

@router.get("/customers/{customer_id}/audit", response_model=List[AuditLogRead])
def get_customer_audit(customer_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Retorna o histórico técnico de alterações do cliente."""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Acesso restrito a Administradores.")
        
    statement = select(AuditLog, User.name).join(User, AuditLog.user_id == User.id).where(AuditLog.table_name == "customer").where(AuditLog.record_id == customer_id).order_by(AuditLog.id.desc())
    results = session.exec(statement).all()
    
    logs = []
    for log, user_name in results:
        logs.append(AuditLogRead(
            id=log.id, 
            table_name=log.table_name, 
            action=log.action, 
            user_id=log.user_id, 
            user_name=user_name, 
            changes=log.changes, 
            created_at=log.created_at
        ))
    return logs

# --- TIMELINE E INTERAÇÕES ---

@router.get("/customers/{customer_id}/notes", response_model=List[NoteRead])
def get_customer_notes(customer_id: int, session: Session = Depends(get_session)):
    """Retorna todas as notas e tarefas da timeline de um cliente."""
    statement = select(CustomerNote, User.name).join(User, CustomerNote.created_by_id == User.id).where(CustomerNote.customer_id == customer_id).order_by(CustomerNote.id.desc())
    results = session.exec(statement).all()
    
    notes = []
    for note, user_name in results:
        notes.append(NoteRead(
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

@router.post("/customers/{customer_id}/notes", response_model=NoteRead)
def create_customer_note(
    customer_id: int, 
    note_data: NoteCreate, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Cria uma nova nota ou tarefa na timeline."""
    customer = session.get(Customer, customer_id)
    if not customer: 
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    new_note = CustomerNote(
        content=note_data.content, 
        customer_id=customer_id, 
        created_by_id=current_user.id, 
        type=note_data.type, 
        target_user_id=note_data.target_user_id
    )
    session.add(new_note)
    session.commit()
    session.refresh(new_note)
    
    # Notificações e Menções
    if "@todos" in note_data.content.lower():
        log_activity(session, current_user, f"mencionou todos em {customer.name}: \"{note_data.content[:30]}...\"", "message-circle", customer_id, visibility="public")
    
    notified_ids = set()

    # Notificação Direta/Tarefa
    if note_data.target_user_id and note_data.target_user_id != current_user.id:
        target_user = session.get(User, note_data.target_user_id)
        if target_user:
            msg_type = "uma Tarefa" if note_data.type == 'task' else "uma Mensagem"
            content = f"{current_user.name} enviou {msg_type} em {customer.name}"
            session.add(Notification(user_id=target_user.id, content=content, link=f"/customers/{customer_id}", related_note_id=new_note.id))
            background_tasks.add_task(notify_user_realtime, target_user.id, content, f"/customers/{customer_id}")
            notified_ids.add(target_user.id)

    # Notificação Automática para o Vendedor Responsável
    if customer.salesperson_id and customer.salesperson_id != current_user.id:
        if customer.salesperson_id not in notified_ids:
            msg = f"{current_user.name} comentou no seu cliente {customer.name}"
            session.add(Notification(user_id=customer.salesperson_id, content=msg, link=f"/customers/{customer_id}", related_note_id=new_note.id))
            background_tasks.add_task(notify_user_realtime, customer.salesperson_id, msg, f"/customers/{customer_id}")
            
    session.commit()
    return NoteRead(
        id=new_note.id, 
        content=new_note.content, 
        created_by_id=new_note.created_by_id, 
        created_at=new_note.created_at, 
        user_name=current_user.name, 
        type=new_note.type, 
        target_user_id=new_note.target_user_id, 
        task_status=new_note.task_status, 
        read_at=new_note.read_at, 
        started_at=new_note.started_at, 
        completed_at=new_note.completed_at
    )

@router.post("/notes/{note_id}/action/{action}")
def task_action(
    note_id: int, 
    action: str, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_user)
):
    """Gerencia o workflow de tarefas (iniciar/finalizar)."""
    note = session.get(CustomerNote, note_id)
    if not note: 
        raise HTTPException(status_code=404, detail="Tarefa/Nota não encontrada")
    
    if action == "start":
        note.task_status = "in_progress"
        note.started_at = datetime.utcnow()
        if note.created_by_id != current_user.id:
             msg = f"{current_user.name} iniciou a tarefa no cliente #{note.customer_id}"
             session.add(Notification(user_id=note.created_by_id, content=msg, link=f"/customers/{note.customer_id}", related_note_id=note.id))
             background_tasks.add_task(notify_user_realtime, note.created_by_id, msg, f"/customers/{note.customer_id}")
             
    elif action == "finish":
        note.task_status = "done"
        note.completed_at = datetime.utcnow()
        if note.created_by_id != current_user.id:
             msg = f"{current_user.name} CONCLUIU a tarefa no cliente #{note.customer_id}!"
             session.add(Notification(user_id=note.created_by_id, content=msg, link=f"/customers/{note.customer_id}", related_note_id=note.id))
             background_tasks.add_task(notify_user_realtime, note.created_by_id, msg, f"/customers/{note.customer_id}")
    
    session.add(note)
    session.commit()
    return {"ok": True}