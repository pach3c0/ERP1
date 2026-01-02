from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select, or_, and_
from jose import JWTError, jwt
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime

from database import create_db_and_tables, get_session, engine
from models import User, Customer, Role, CustomerNote, FeedItem, Notification, UserSupervisor
from schemas import UserCreate, UserRead, Token, CustomerCreate, CustomerRead, RoleRead, RoleUpdate, NoteCreate, NoteRead, FeedRead, NotificationRead, FeedCreate
import security

# --- HELPERS ---
def create_default_roles(session: Session):
    roles = [
        {"name": "Super Admin", "slug": "admin", "description": "Acesso total", "permissions": {"all": True, "customer_change_status": True, "customer_require_approval": False}},
        {"name": "Gerente", "slug": "manager", "description": "Gestão", "permissions": {"customer_change_status": True, "customer_require_approval": False}},
        {"name": "Vendedor", "slug": "sales", "description": "Vendas", "permissions": {"customer_change_status": False, "customer_require_approval": True}}
    ]
    for role_data in roles:
        role = session.exec(select(Role).where(Role.slug == role_data["slug"])).first()
        if not role: session.add(Role(**role_data))
        else:
            if not role.permissions:
                role.permissions = role_data["permissions"]
                session.add(role)
    session.commit()

def log_activity(session: Session, user: User, content: str, icon: str = "activity", customer_id: int = None, visibility: str = "public"):
    feed = FeedItem(content=content, icon=icon, user_id=user.id, related_customer_id=customer_id, visibility=visibility)
    session.add(feed)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session: create_default_roles(session)
    yield

app = FastAPI(lifespan=lifespan, title="ERP Agent MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        if payload.get("sub") is None: raise credentials_exception
    except JWTError: raise credentials_exception
    user = session.exec(select(User).where(User.email == payload.get("sub"))).first()
    if user is None: raise credentials_exception
    return user

def get_user_role_slug(user: User, session: Session) -> str:
    if not user.role_id: return "user"
    role = session.get(Role, user.role_id)
    return role.slug if role else "user"

# --- AUTH ---
@app.post("/auth/register", response_model=UserRead)
def register_user(user_input: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == user_input.email)).first(): raise HTTPException(status_code=400, detail="Email já cadastrado")
    count = len(session.exec(select(User)).all())
    target_slug = "admin" if count == 0 else "sales"
    role = session.exec(select(Role).where(Role.slug == target_slug)).first()
    new_user = User(name=user_input.name, email=user_input.email, password_hash=security.get_password_hash(user_input.password), role_id=role.id if role else None, is_active=True)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not security.verify_password(form_data.password, user.password_hash): raise HTTPException(status_code=401, detail="Credenciais inválidas")
    role_slug = get_user_role_slug(user, session)
    token = security.create_access_token({"sub": user.email, "role": role_slug})
    return {"access_token": token, "token_type": "bearer", "role": role_slug, "name": user.name, "email": user.email}

# --- ROLES ---
@app.get("/roles/", response_model=List[RoleRead])
def list_roles(session: Session = Depends(get_session)): return session.exec(select(Role)).all()

@app.put("/roles/{role_id}", response_model=RoleRead)
def update_role_permissions(role_id: int, role_data: RoleUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    role = session.get(Role, role_id)
    role.permissions = role_data.permissions
    session.add(role)
    session.commit()
    session.refresh(role)
    return role

# --- USERS ---
@app.get("/users/", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session)): 
    return session.exec(select(User)).all()

@app.post("/users/", response_model=UserRead)
def create_user_internal(user_input: UserCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    if session.exec(select(User).where(User.email == user_input.email)).first(): raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    new_user = User(
        name=user_input.name, 
        email=user_input.email, 
        password_hash=security.get_password_hash(user_input.password), 
        role_id=user_input.role_id, 
        is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # ADICIONAR SUPERVISORES
    if user_input.supervisor_ids:
        for sup_id in user_input.supervisor_ids:
            if sup_id != new_user.id:
                link = UserSupervisor(user_id=new_user.id, supervisor_id=sup_id)
                session.add(link)
        session.commit()
        session.refresh(new_user)

    log_activity(session, current_user, f"criou o usuário {new_user.name}", "user", visibility="admin_manager")
    return new_user

@app.put("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, user_data: UserCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    user = session.get(User, user_id)
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.name = user_data.name
    user.email = user_data.email
    user.role_id = user_data.role_id
    if user_data.password and len(user_data.password.strip()) > 0:
        user.password_hash = security.get_password_hash(user_data.password)

    # Atualiza Supervisores
    existing_links = session.exec(select(UserSupervisor).where(UserSupervisor.user_id == user.id)).all()
    for link in existing_links: session.delete(link)
    
    if user_data.supervisor_ids:
        for sup_id in user_data.supervisor_ids:
            if sup_id != user.id:
                session.add(UserSupervisor(user_id=user.id, supervisor_id=sup_id))

    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    user = session.get(User, user_id)
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    links = session.exec(select(UserSupervisor).where(or_(UserSupervisor.user_id == user_id, UserSupervisor.supervisor_id == user_id))).all()
    for link in links: session.delete(link)
    session.delete(user)
    session.commit()
    return {"ok": True}

# --- FEED ---
@app.get("/dashboard/stats")
def get_dashboard_stats(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    query = select(Customer)
    if role_slug == 'sales': query = query.where(Customer.salesperson_id == current_user.id)
    all_customers = session.exec(query).all()
    return {"total": len(all_customers), "pf": len([c for c in all_customers if c.person_type == 'PF']), "pj": len([c for c in all_customers if c.person_type == 'PJ'])}

@app.get("/feed/", response_model=List[FeedRead])
def get_feed(user_id: Optional[int] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    query = select(FeedItem, User.name).join(User, FeedItem.user_id == User.id).order_by(FeedItem.id.desc())

    if role_slug == 'sales':
        query = query.where(or_(FeedItem.visibility == 'public', FeedItem.user_id == current_user.id))
    
    if user_id: query = query.where(FeedItem.user_id == user_id)
    if start_date: query = query.where(FeedItem.created_at >= start_date)
    if end_date:
        end_date = end_date.replace(hour=23, minute=59, second=59)
        query = query.where(FeedItem.created_at <= end_date)

    query = query.limit(50)
    results = session.exec(query).all()
    
    feed_response = []
    for item, user_name in results:
        feed_response.append(FeedRead(id=item.id, content=item.content, icon=item.icon, created_at=item.created_at, user_name=user_name, visibility=item.visibility))
    return feed_response

@app.post("/feed/", response_model=FeedRead)
def create_feed_post(feed_data: FeedCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    visibility = "public"
    if "@todos" in feed_data.content: visibility = "public"
    feed_item = FeedItem(content=feed_data.content, icon="message-circle", user_id=current_user.id, visibility=visibility)
    session.add(feed_item)
    session.commit()
    session.refresh(feed_item)
    return FeedRead(id=feed_item.id, content=feed_item.content, icon=feed_item.icon, created_at=feed_item.created_at, user_name=current_user.name, visibility=visibility)

# --- NOTIFICAÇÕES ---
@app.get("/notifications/", response_model=List[NotificationRead])
def get_my_notifications(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Notification).where(Notification.user_id == current_user.id).where(Notification.is_read == False).order_by(Notification.id.desc())).all()

@app.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    notif = session.get(Notification, notif_id)
    if notif and notif.user_id == current_user.id:
        notif.is_read = True
        session.add(notif)
        if notif.related_note_id:
            note = session.get(CustomerNote, notif.related_note_id)
            if note and not note.read_at:
                note.read_at = datetime.utcnow()
                session.add(note)
        session.commit()
    return {"ok": True}

# --- CLIENTES ---
@app.get("/customers/verify/{document}")
def verify_document(document: str, session: Session = Depends(get_session)):
    doc_clean = "".join([d for d in document if d.isdigit()])
    customer = session.exec(select(Customer).where(Customer.document == doc_clean)).first()
    if customer: return {"exists": True, "id": customer.id, "name": customer.name}
    return {"exists": False}

@app.post("/customers/", response_model=CustomerRead)
def create_customer(customer_data: CustomerCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if session.exec(select(Customer).where(Customer.document == customer_data.document)).first(): raise HTTPException(status_code=400, detail="Documento já cadastrado")
    new_customer = Customer.from_orm(customer_data)
    new_customer.created_by_id = current_user.id
    if not new_customer.salesperson_id: new_customer.salesperson_id = current_user.id
    
    # 1. Definir Status Inicial
    user_role = session.get(Role, current_user.role_id)
    is_pending = user_role.permissions.get("customer_require_approval", False)
    
    if is_pending:
        new_customer.status = 'pendente'
        status_msg = "(Pendente - Aguardando Aprovação)"
    else:
        new_customer.status = 'ativo'
        status_msg = "(Ativo)"

    session.add(new_customer)
    
    # 2. Registrar no Feed
    vis = "admin_manager" if get_user_role_slug(current_user, session) == 'sales' else "public"
    log_activity(session, current_user, f"cadastrou cliente {new_customer.name} {status_msg}", "plus", new_customer.id, visibility=vis)
    
    session.commit() # Commit para gerar o ID do Cliente
    session.refresh(new_customer)

    # 3. ALERTA PARA OS SUPERVISORES (NOVO)
    # Se o cliente ficou pendente, avisa quem monitora este vendedor
    if is_pending:
        # Busca na tabela de supervisão: Quem monitora o current_user?
        supervisors_links = session.exec(select(UserSupervisor).where(UserSupervisor.user_id == current_user.id)).all()
        
        for link in supervisors_links:
            notif = Notification(
                user_id=link.supervisor_id, # Envia para o Supervisor (Gerente)
                content=f"URGENTE: {current_user.name} cadastrou {new_customer.name} e aguarda aprovação.",
                link=f"/customers/{new_customer.id}"
            )
            session.add(notif)
        
        # Admin sempre recebe se quiser (opcional, mas seguro)
        # (Lógica simplificada: supervisores definidos no cadastro já cobrem isso)
        
        session.commit()

    return new_customer

@app.get("/customers/", response_model=List[CustomerRead])
def list_customers(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    if role_slug == 'sales': statement = select(Customer).where(Customer.salesperson_id == current_user.id).order_by(Customer.id.desc())
    else: statement = select(Customer).order_by(Customer.id.desc())
    return session.exec(statement).all()

@app.put("/customers/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, customer_data: CustomerCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    customer = session.get(Customer, customer_id)
    if not customer: raise HTTPException(status_code=404, detail="Não encontrado")
    role_slug = get_user_role_slug(current_user, session)
    if role_slug == 'sales' and customer.salesperson_id != current_user.id: raise HTTPException(status_code=403, detail="Este cliente não é seu.")

    status_changed = False
    if customer_data.status != customer.status:
        user_role = session.get(Role, current_user.role_id)
        can_change = user_role.permissions.get("customer_change_status", False) or role_slug == 'admin'
        if not can_change: raise HTTPException(status_code=403, detail="Você não tem permissão para alterar o Status.")
        status_changed = True

    data = customer_data.dict(exclude_unset=True)
    for key, value in data.items(): setattr(customer, key, value)
    session.add(customer)
    if status_changed: 
        log_activity(session, current_user, f"alterou status de {customer.name} para {customer.status}", "refresh-cw", customer.id, visibility="admin_manager")
        
        # Se aprovou (Pendente -> Ativo), avisa o dono da carteira
        if customer.status == 'ativo' and customer.salesperson_id and customer.salesperson_id != current_user.id:
             session.add(Notification(user_id=customer.salesperson_id, content=f"Seu cliente {customer.name} foi APROVADO por {current_user.name}!", link=f"/customers/{customer.id}"))

    session.commit()
    session.refresh(customer)
    return customer

@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) not in ['admin', 'manager']: raise HTTPException(status_code=403, detail="Apenas Gerentes/Admins.")
    customer = session.get(Customer, customer_id)
    if not customer: raise HTTPException(status_code=404, detail="Não encontrado")
    log_activity(session, current_user, f"excluiu o cliente {customer.name}", "trash", visibility="admin_manager")
    session.delete(customer)
    session.commit()
    return {"ok": True}

# --- TIMELINE / NOTAS ---
@app.get("/customers/{customer_id}/notes", response_model=List[NoteRead])
def get_customer_notes(customer_id: int, session: Session = Depends(get_session)):
    statement = select(CustomerNote, User.name).join(User, CustomerNote.created_by_id == User.id).where(CustomerNote.customer_id == customer_id).order_by(CustomerNote.id.desc())
    results = session.exec(statement).all()
    notes = []
    for note, user_name in results:
        notes.append(NoteRead(id=note.id, content=note.content, created_by_id=note.created_by_id, created_at=note.created_at, user_name=user_name, type=note.type, target_user_id=note.target_user_id, task_status=note.task_status, read_at=note.read_at, started_at=note.started_at, completed_at=note.completed_at))
    return notes

@app.post("/customers/{customer_id}/notes", response_model=NoteRead)
def create_customer_note(customer_id: int, note_data: NoteCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    customer = session.get(Customer, customer_id)
    if not customer: raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    new_note = CustomerNote(content=note_data.content, customer_id=customer_id, created_by_id=current_user.id, type=note_data.type, target_user_id=note_data.target_user_id)
    session.add(new_note)
    session.commit()
    session.refresh(new_note)
    
    if "@todos" in note_data.content.lower():
        log_activity(session, current_user, f"mencionou todos em {customer.name}: \"{note_data.content[:30]}...\"", "message-circle", customer_id, visibility="public")
    
    if note_data.target_user_id:
        target_user = session.get(User, note_data.target_user_id)
        if target_user:
            msg_type = "uma Tarefa" if note_data.type == 'task' else "uma Mensagem"
            notif = Notification(user_id=target_user.id, content=f"{current_user.name} enviou {msg_type} em {customer.name}", link=f"/customers/{customer_id}", related_note_id=new_note.id)
            session.add(notif)
            
    session.commit()
    return NoteRead(id=new_note.id, content=new_note.content, created_by_id=new_note.created_by_id, created_at=new_note.created_at, user_name=current_user.name, type=new_note.type, target_user_id=new_note.target_user_id, task_status=new_note.task_status, read_at=new_note.read_at, started_at=new_note.started_at, completed_at=new_note.completed_at)

@app.post("/notes/{note_id}/action/{action}")
def task_action(note_id: int, action: str, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    note = session.get(CustomerNote, note_id)
    if not note: raise HTTPException(status_code=404, detail="Item não encontrado")
    if current_user.id not in [note.created_by_id, note.target_user_id]: raise HTTPException(status_code=403, detail="Você não faz parte desta tarefa.")

    if action == "start":
        note.task_status = "in_progress"
        note.started_at = datetime.utcnow()
        if note.created_by_id != current_user.id:
             session.add(Notification(user_id=note.created_by_id, content=f"{current_user.name} iniciou a tarefa em cliente #{note.customer_id}", link=f"/customers/{note.customer_id}", related_note_id=note.id))
    elif action == "finish":
        note.task_status = "done"
        note.completed_at = datetime.utcnow()
        if note.created_by_id != current_user.id:
             session.add(Notification(user_id=note.created_by_id, content=f"{current_user.name} CONCLUIU a tarefa!", link=f"/customers/{note.customer_id}", related_note_id=note.id))
    
    session.add(note)
    session.commit()
    return {"ok": True}

