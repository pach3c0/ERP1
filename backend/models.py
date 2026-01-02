from typing import Optional, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON

class BaseModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Role(BaseModel, table=True):
    name: str
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    permissions: Dict = Field(default={}, sa_column=Column(JSON)) 

class User(BaseModel, table=True):
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    is_active: bool = Field(default=True)
    role_id: Optional[int] = Field(default=None, foreign_key="role.id")

class Customer(BaseModel, table=True):
    name: str = Field(index=True)
    document: str = Field(index=True, unique=True)
    person_type: str
    
    # --- MUDANÇA AQUI: Status agora é texto (ativo, inativo, pendente) ---
    status: str = Field(default="ativo") 
    
    salesperson_id: Optional[int] = Field(default=None, foreign_key="user.id") 
    is_customer: bool = Field(default=True)
    is_supplier: bool = Field(default=False)

    rg: Optional[str] = None
    issuing_organ: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    cep: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    address_line: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None

    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")