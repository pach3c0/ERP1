from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, field_validator
from validate_docbr import CPF, CNPJ

# --- CARGOS ---
class RoleRead(BaseModel):
    id: int
    name: str
    slug: str
    permissions: Dict # O Frontend vai receber isso agora

class RoleUpdate(BaseModel):
    permissions: Dict # Para salvar as configs

# ... (Mantenha o restante das classes UserCreate, UserRead, Token, CustomerCreate, CustomerRead IGUAIS) ...
# Vou repetir apenas para garantir que você não apague nada por engano, 
# mas se quiser, copie apenas o bloco acima e mantenha o resto do seu arquivo.

class UserCreate(BaseModel):
    name: str
    email: str
    password: str 
    role_id: Optional[int] = None 

class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role_id: Optional[int]

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class CustomerCreate(BaseModel):
    name: str
    document: str
    person_type: str
    is_customer: bool = True
    is_supplier: bool = False
    
    # Novo campo
    status: str = "ativo" 
    
    salesperson_id: Optional[int] = None
    
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

    @field_validator('document')
    def validate_document(cls, v):
        doc_clean = "".join([d for d in v if d.isdigit()])
        if len(doc_clean) == 11:
            if not CPF().validate(doc_clean):
                raise ValueError('CPF inválido')
            return doc_clean
        elif len(doc_clean) == 14:
            if not CNPJ().validate(doc_clean):
                raise ValueError('CNPJ inválido')
            return doc_clean
        else:
            raise ValueError('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos')

class CustomerRead(CustomerCreate):
    id: int
    created_by_id: Optional[int]
    created_at: datetime

class CustomerRead(CustomerCreate):
    id: int
    created_by_id: Optional[int]
    created_at: datetime