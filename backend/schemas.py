from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, field_validator
from validate_docbr import CPF, CNPJ

# --- AUXILIARES ---
class UserSimple(BaseModel):
    id: int
    name: str

# --- USERS ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str 
    role_id: Optional[int] = None 
    supervisor_ids: List[int] = [] # NOVO: Lista de IDs dos monitores

class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role_id: Optional[int]
    supervisors: List[UserSimple] = [] # NOVO: Retorna quem monitora ele

# --- AUTH ---
class LoginRequest(BaseModel):
    email: str; password: str
class Token(BaseModel):
    access_token: str; token_type: str; role: str; name: str; email: str

# --- ROLES ---
class RoleRead(BaseModel):
    id: int; name: str; slug: str; permissions: Dict
class RoleUpdate(BaseModel):
    permissions: Dict

# --- NOTES & FEED ---
class NoteCreate(BaseModel):
    content: str; type: str = "message"; target_user_id: Optional[int] = None
class NoteRead(BaseModel):
    id: int; content: str; created_by_id: int; created_at: datetime; user_name: Optional[str] = "Sistema"; type: str; target_user_id: Optional[int]; task_status: str; read_at: Optional[datetime]; started_at: Optional[datetime]; completed_at: Optional[datetime]
class FeedCreate(BaseModel):
    content: str
class FeedRead(BaseModel):
    id: int; content: str; icon: str; created_at: datetime; user_name: Optional[str] = "Sistema"; visibility: str
class NotificationRead(BaseModel):
    id: int; content: str; is_read: bool; link: str; created_at: datetime

# --- CUSTOMERS ---
class CustomerCreate(BaseModel):
    name: str; document: str; person_type: str; is_customer: bool = True; is_supplier: bool = False; status: str = "ativo"; salesperson_id: Optional[int] = None
    rg: Optional[str] = None; issuing_organ: Optional[str] = None; ie: Optional[str] = None; email: Optional[str] = None; phone: Optional[str] = None; contact_name: Optional[str] = None; cep: Optional[str] = None; state: Optional[str] = None; city: Optional[str] = None; neighborhood: Optional[str] = None; address_line: Optional[str] = None; number: Optional[str] = None; complement: Optional[str] = None
    @field_validator('document')
    def validate_document(cls, v): return v # Simplificado para brevidade
class CustomerRead(CustomerCreate):
    id: int; created_by_id: Optional[int]; created_at: datetime