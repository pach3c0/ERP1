from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

# --- Modelo Base (Campos comuns) ---
class BaseModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Tabela de Usuários (Quem acessa o sistema) ---
class User(BaseModel, table=True):
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str  # Senha criptografada (NUNCA texto puro)
    role: str = Field(default="user")  # 'admin' ou 'user'
    is_active: bool = Field(default=True)

# --- Tabela de Clientes (O negócio) ---
class Customer(BaseModel, table=True):
    name: str = Field(index=True)
    email: Optional[str] = None
    document: str = Field(index=True, unique=True)  # CPF ou CNPJ
    phone: Optional[str] = None
    address: Optional[str] = None
    
    # Auditoria (quem criou/editou) - Será preenchido pelo Agente
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")