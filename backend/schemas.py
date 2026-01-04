from typing import Optional, Dict, List, Any
from datetime import datetime
from pydantic import BaseModel, field_validator
from validate_docbr import CPF, CNPJ

# --- AUDITORIA (NOVO) ---
class AuditLogRead(BaseModel):
    id: int
    table_name: str
    action: str
    user_id: int
    user_name: Optional[str] = "Sistema"
    changes: Dict[str, Any]
    created_at: datetime

# --- FEED E NOTAS ---
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

# --- AUTH & USERS ---
class UserSimple(BaseModel):
    id: int; name: str
class RoleRead(BaseModel):
    id: int; name: str; slug: str; permissions: Dict
class RoleUpdate(BaseModel):
    permissions: Dict
class UserCreate(BaseModel):
    name: str; email: str; password: str; role_id: Optional[int] = None; supervisor_ids: List[int] = []
class UserRead(BaseModel):
    id: int; name: str; email: str; role_id: Optional[int]; supervisors: List[UserSimple] = []
class LoginRequest(BaseModel):
    email: str; password: str
class Token(BaseModel):
    access_token: str; token_type: str; role: str; name: str; email: str

# --- CUSTOMERS ---
class CustomerCreate(BaseModel):
    # Identificação
    name: str
    fantasy_name: Optional[str] = None
    document: str
    person_type: str
    
    # Perfil e Status
    is_customer: bool = True
    is_supplier: bool = False
    status: str = "ativo"
    salesperson_id: Optional[int] = None
    
    # Fiscal
    rg: Optional[str] = None
    issuing_organ: Optional[str] = None
    ie: Optional[str] = None
    municipal_reg: Optional[str] = None
    
    # Contato
    email: Optional[str] = None
    email_nfe: Optional[str] = None
    phone: Optional[str] = None
    cellphone: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    address_line: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    
    # Financeiro e Obs
    credit_limit: Optional[float] = 0.0
    observation: Optional[str] = None

    @field_validator('document')
    def validate_document(cls, v):
        doc_clean = "".join([d for d in v if d.isdigit()])
        if len(doc_clean) == 11:
            if not CPF().validate(doc_clean): raise ValueError('CPF inválido')
            return doc_clean
        elif len(doc_clean) == 14:
            if not CNPJ().validate(doc_clean): raise ValueError('CNPJ inválido')
            return doc_clean
        else: raise ValueError('Documento inválido')

class CustomerRead(CustomerCreate):
    id: int
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime

# --- PRODUTOS PARA LOCAÇÃO ---
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "geral"
    status: str = "disponivel"
    price_daily: float = 0.0
    price_weekly: float = 0.0
    price_monthly: float = 0.0
    cost: float = 0.0
    quantity: int = 1
    serial_number: Optional[str] = None
    notes: Optional[str] = None

class ProductRead(ProductCreate):
    id: int
    created_at: datetime
    updated_at: datetime

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    price_daily: Optional[float] = None
    price_weekly: Optional[float] = None
    price_monthly: Optional[float] = None
    cost: Optional[float] = None
    quantity: Optional[int] = None
    serial_number: Optional[str] = None
    notes: Optional[str] = None

# --- SERVIÇOS ---
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "geral"
    status: str = "ativo"
    price_base: float = 0.0
    price_hourly: Optional[float] = None
    duration_type: Optional[str] = None
    notes: Optional[str] = None

class ServiceRead(ServiceCreate):
    id: int
    created_at: datetime
    updated_at: datetime

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    price_base: Optional[float] = None
    price_hourly: Optional[float] = None
    duration_type: Optional[str] = None
    notes: Optional[str] = None


# ===== QUOTES (Orçamentos) =====

class QuoteItem(BaseModel):
    """Item do orçamento (produto ou serviço)"""
    type: str  # 'product' ou 'service'
    item_id: int  # ID do produto ou serviço
    name: str  # Nome do item
    quantity: int = 1
    unit_price: float
    subtotal: float


class QuoteCreate(BaseModel):
    customer_id: int
    items: List[QuoteItem]
    discount: float = 0.0
    discount_percent: float = 0.0
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    valid_until: Optional[datetime] = None


class QuoteRead(BaseModel):
    id: int
    quote_number: str
    customer_id: int
    items: List[QuoteItem]
    subtotal: float
    discount: float
    discount_percent: float
    total: float
    status: str
    valid_until: Optional[datetime]
    notes: Optional[str]
    payment_terms: Optional[str]
    delivery_terms: Optional[str]
    sent_at: Optional[datetime]
    approved_at: Optional[datetime]
    invoiced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class QuoteUpdate(BaseModel):
    items: Optional[List[QuoteItem]] = None
    discount: Optional[float] = None
    discount_percent: Optional[float] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    valid_until: Optional[datetime] = None