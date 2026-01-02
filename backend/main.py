from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware # <--- IMPORTAR ISTO
from sqlmodel import Session, select
from jose import JWTError, jwt
from contextlib import asynccontextmanager
from typing import List

from database import create_db_and_tables, get_session
from models import User, Customer
from schemas import UserCreate, UserRead, Token, CustomerCreate, CustomerRead
import security

# Configuração de Auth
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan, title="ERP Agent MVP")

# --- CORREÇÃO CORS AQUI ---
# Permite que o Frontend (localhost:5173) converse com este Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/auth/register", response_model=UserRead)
def register_user(user_input: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_input.email)
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    new_user = User(
        name=user_input.name,
        email=user_input.email,
        password_hash=security.get_password_hash(user_input.password),
        role="admin"
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    token = security.create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/customers/", response_model=CustomerRead)
def create_customer(
    customer_data: CustomerCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if session.exec(select(Customer).where(Customer.document == customer_data.document)).first():
        raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado")

    new_customer = Customer.from_orm(customer_data)
    new_customer.created_by_id = current_user.id
    
    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)
    return new_customer

@app.get("/customers/", response_model=List[CustomerRead])
def list_customers(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    return session.exec(select(Customer)).all()