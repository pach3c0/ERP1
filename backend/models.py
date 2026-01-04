from typing import Optional, Dict, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import JSON

# --- Base ---
class BaseModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- TABELA DE LIGAÇÃO (SUPERVISÃO) ---
class UserSupervisor(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    supervisor_id: int = Field(foreign_key="user.id", primary_key=True)

# --- Tabelas Principais ---
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
    
    role: Optional["Role"] = Relationship()
    
    supervisors: List["User"] = Relationship(
        back_populates="monitoring",
        link_model=UserSupervisor,
        sa_relationship_kwargs={
            "primaryjoin": "User.id==UserSupervisor.user_id",
            "secondaryjoin": "User.id==UserSupervisor.supervisor_id"
        }
    )
    
    monitoring: List["User"] = Relationship(
        back_populates="supervisors",
        link_model=UserSupervisor,
        sa_relationship_kwargs={
            "primaryjoin": "User.id==UserSupervisor.supervisor_id",
            "secondaryjoin": "User.id==UserSupervisor.user_id"
        }
    )

class Customer(BaseModel, table=True):
    # Identificação Básica
    name: str = Field(index=True)
    fantasy_name: Optional[str] = None  # [NOVO] Nome Fantasia
    document: str = Field(index=True, unique=True)
    person_type: str
    status: str = Field(default="ativo") 
    
    # Perfil
    salesperson_id: Optional[int] = Field(default=None, foreign_key="user.id") 
    is_customer: bool = Field(default=True)
    is_supplier: bool = Field(default=False)
    
    # Dados Fiscais
    rg: Optional[str] = None
    issuing_organ: Optional[str] = None
    ie: Optional[str] = None
    municipal_reg: Optional[str] = None # [NOVO] Inscrição Municipal
    
    # Contatos e Web
    email: Optional[str] = None
    email_nfe: Optional[str] = None     # [NOVO] Email para envio de notas
    phone: Optional[str] = None
    cellphone: Optional[str] = None     # [NOVO] Celular / WhatsApp
    website: Optional[str] = None       # [NOVO] Site / Rede Social
    contact_name: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    address_line: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    
    # Financeiro e Observações
    credit_limit: Optional[float] = Field(default=0.0) # [NOVO] Limite de Crédito
    observation: Optional[str] = None   # [NOVO] Observações internas

    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")

# --- TIMELINE E FEED ---
class CustomerNote(BaseModel, table=True):
    content: str 
    customer_id: int = Field(foreign_key="customer.id")
    created_by_id: int = Field(foreign_key="user.id")
    target_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    type: str = Field(default="message") 
    task_status: str = Field(default="pending")
    read_at: Optional[datetime] = None       
    started_at: Optional[datetime] = None    
    completed_at: Optional[datetime] = None  

class FeedItem(BaseModel, table=True):
    content: str
    icon: str = "activity"
    user_id: int = Field(foreign_key="user.id")
    related_customer_id: Optional[int] = Field(default=None, foreign_key="customer.id")
    visibility: str = Field(default="public") 

class Notification(BaseModel, table=True):
    user_id: int = Field(foreign_key="user.id")
    content: str
    is_read: bool = Field(default=False)
    link: str
    related_note_id: Optional[int] = Field(default=None, foreign_key="customernote.id")

# --- NOVO: AUDITORIA TÉCNICA ---
class AuditLog(BaseModel, table=True):
    table_name: str # Ex: 'customer'
    record_id: int  # Ex: 15
    action: str     # CREATE, UPDATE, DELETE
    user_id: int = Field(foreign_key="user.id") # Quem fez
    
    # Guarda o que mudou em formato JSON
    # Ex: {"status": "inativo"}
    changes: Dict = Field(default={}, sa_column=Column(JSON))

# --- PRODUTOS PARA LOCAÇÃO ---
class Product(BaseModel, table=True):
    name: str = Field(index=True)
    description: Optional[str] = None
    category: str = Field(default="geral")  # eletrônicos, equipamentos, móveis, etc
    status: str = Field(default="disponivel")  # disponivel, locado, em_manutencao, inativo
    
    # Preços para locação
    price_daily: float = Field(default=0.0)      # Preço por dia
    price_weekly: float = Field(default=0.0)     # Preço por semana
    price_monthly: float = Field(default=0.0)    # Preço por mês
    cost: float = Field(default=0.0)             # Custo de aquisição
    
    # Informações adicionais
    quantity: int = Field(default=1)             # Quantidade disponível
    serial_number: Optional[str] = None          # Número de série
    notes: Optional[str] = None                  # Observações

# --- SERVIÇOS ---
class Service(BaseModel, table=True):
    name: str = Field(index=True)
    description: Optional[str] = None
    category: str = Field(default="geral")  # consultoria, instalação, suporte, etc
    status: str = Field(default="ativo")    # ativo, inativo
    
    # Preços
    price_base: float = Field(default=0.0)  # Preço base
    price_hourly: Optional[float] = None    # Preço por hora (opcional)
    
    # Informações adicionais
    duration_type: Optional[str] = None     # horaria, diaria, projeto
    notes: Optional[str] = None             # Observações


class Quote(BaseModel, table=True):
    """Orçamento/Cotação para clientes"""
    quote_number: str = Field(unique=True, index=True)  # Ex: ORC-2026-0001
    customer_id: int = Field(foreign_key="customer.id")
    
    # Relacionamentos
    customer: Optional["Customer"] = Relationship()
    
    # Dados do orçamento
    items: str = Field(sa_column=Column(JSON))  # Lista de {type: 'product'|'service', id, quantity, price, subtotal}
    subtotal: float = Field(default=0.0)
    discount: float = Field(default=0.0)  # Desconto em valor
    discount_percent: float = Field(default=0.0)  # Desconto em %
    total: float = Field(default=0.0)
    
    # Status e validade
    status: str = Field(default="rascunho")  # rascunho, enviado, aprovado, recusado, faturado, cancelado
    valid_until: Optional[datetime] = None  # Data de validade do orçamento
    
    # Informações adicionais
    notes: Optional[str] = None  # Observações gerais
    payment_terms: Optional[str] = None  # Condições de pagamento
    delivery_terms: Optional[str] = None  # Condições de entrega
    
    # Datas importantes
    sent_at: Optional[datetime] = None  # Data de envio ao cliente
    approved_at: Optional[datetime] = None  # Data de aprovação
    invoiced_at: Optional[datetime] = None  # Data de faturamento