from typing import Optional
from pydantic import BaseModel

# --- USUÁRIOS (Já existia) ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str 

class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- CLIENTES (Novo) ---
class CustomerCreate(BaseModel):
    name: str
    document: str # CPF ou CNPJ
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerRead(CustomerCreate):
    id: int
    created_by_id: Optional[int]