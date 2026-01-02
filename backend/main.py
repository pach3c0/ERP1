from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from jose import JWTError, jwt
from contextlib import asynccontextmanager
from typing import List

from database import create_db_and_tables, get_session, engine
from models import User, Customer, Role
from schemas import UserCreate, UserRead, Token, CustomerCreate, CustomerRead, RoleRead, RoleUpdate
import security

# --- SEED: Permissões Padrão Atualizadas ---
def create_default_roles(session: Session):
    roles = [
        {
            "name": "Super Admin", 
            "slug": "admin", 
            "description": "Acesso total", 
            "permissions": {
                # Módulo Cliente
                "customer_change_status": True,
                "customer_require_approval": False # Admin não precisa de aprovação
            }
        },
        {
            "name": "Gerente", 
            "slug": "manager", 
            "description": "Gestão de equipe", 
            "permissions": {
                "customer_change_status": True,
                "customer_require_approval": False
            }
        },
        {
            "name": "Vendedor", 
            "slug": "sales", 
            "description": "Focado em vendas", 
            "permissions": {
                "customer_change_status": False, # Não pode mudar status manualmente
                "customer_require_approval": True    # Precisa de aprovação ao criar
            }
        }
    ]
    
    for role_data in roles:
        role = session.exec(select(Role).where(Role.slug == role_data["slug"])).first()
        if not role:
            session.add(Role(**role_data))
        else:
            # Atualiza permissões se o cargo já existir (para aplicar a mudança agora)
            role.permissions = role_data["permissions"]
            session.add(role)
                
    session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session: 
        create_default_roles(session)
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

# --- USERS & DASH ---
@app.get("/dashboard/stats")
def get_dashboard_stats(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    query = select(Customer)
    if role_slug == 'sales': query = query.where(Customer.salesperson_id == current_user.id)
    all_customers = session.exec(query).all()
    return {"total": len(all_customers), "pf": len([c for c in all_customers if c.person_type == 'PF']), "pj": len([c for c in all_customers if c.person_type == 'PJ'])}

@app.get("/users/", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session)): return session.exec(select(User)).all()

@app.post("/users/", response_model=UserRead)
def create_user_internal(user_input: UserCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    if session.exec(select(User).where(User.email == user_input.email)).first(): raise HTTPException(status_code=400, detail="Email já cadastrado")
    new_user = User(name=user_input.name, email=user_input.email, password_hash=security.get_password_hash(user_input.password), role_id=user_input.role_id, is_active=True)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) != 'admin': raise HTTPException(status_code=403, detail="Apenas Admins.")
    user = session.get(User, user_id)
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current_user.id: raise HTTPException(status_code=400, detail="Você não pode excluir a si mesmo.")
    session.delete(user)
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
    
    # --- NOVA LÓGICA DE APROVAÇÃO ---
    user_role = session.get(Role, current_user.role_id)
    # Verifica se a permissão "Exigir Aprovação" está True
    if user_role.permissions.get("customer_require_approval", False):
        new_customer.status = 'pendente'
    else:
        # Se não exige aprovação, nasce como ativo (ou respeita o form)
        new_customer.status = 'ativo'

    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)
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

    # --- LÓGICA DE ALTERAÇÃO DE STATUS ---
    if customer_data.status != customer.status:
        user_role = session.get(Role, current_user.role_id)
        # Verifica a permissão 'customer_change_status'
        can_change = user_role.permissions.get("customer_change_status", False) or role_slug == 'admin'
        if not can_change: raise HTTPException(status_code=403, detail="Você não tem permissão para alterar o Status.")

    data = customer_data.dict(exclude_unset=True)
    for key, value in data.items(): setattr(customer, key, value)
    
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer

@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if get_user_role_slug(current_user, session) not in ['admin', 'manager']: raise HTTPException(status_code=403, detail="Apenas Gerentes/Admins.")
    customer = session.get(Customer, customer_id)
    if not customer: raise HTTPException(status_code=404, detail="Não encontrado")
    session.delete(customer)
    session.commit()
    return {"ok": True}