from typing import Optional
from pydantic import BaseModel, field_validator
from validate_docbr import CPF, CNPJ

# --- USUÁRIOS ---
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

# --- CLIENTES ---
class CustomerCreate(BaseModel):
    name: str
    document: str # CPF ou CNPJ
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    # --- O CÉREBRO: Validador de Documento ---
    @field_validator('document')
    def validate_document(cls, v):
        # 1. Remove tudo que não for número (pontos, traços)
        doc_clean = "".join([d for d in v if d.isdigit()])

        # 2. Verifica se é CPF (11 dígitos)
        if len(doc_clean) == 11:
            cpf_validator = CPF()
            if not cpf_validator.validate(doc_clean):
                raise ValueError('CPF inválido (erro matemático)')
            return doc_clean # Salva limpo no banco
        
        # 3. Verifica se é CNPJ (14 dígitos)
        elif len(doc_clean) == 14:
            cnpj_validator = CNPJ()
            if not cnpj_validator.validate(doc_clean):
                raise ValueError('CNPJ inválido (erro matemático)')
            return doc_clean # Salva limpo no banco

        # 4. Se não for nem 11 nem 14
        else:
            raise ValueError('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos')

class CustomerRead(CustomerCreate):
    id: int
    created_by_id: Optional[int]