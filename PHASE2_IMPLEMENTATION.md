# 🚀 Fase 2: Implementação de Produtos - Guia Prático

**Data de Início:** 4 de Janeiro de 2026  
**Objetivo:** Implementar CRUD completo de Produtos com Service Layer, Alembic e frontend pronto para Fase 3

---

## 📋 Checklist de Implementação

### ✅ Passo 1: Criar Schemas de Produtos (15 min)
- [ ] Adicionar `ProductCreate` em `backend/schemas.py`
- [ ] Adicionar `ProductRead` em `backend/schemas.py`

### ✅ Passo 2: Criar ProductService (30 min)
- [ ] Criar `backend/services/product_service.py`
- [ ] Implementar CRUD methods
- [ ] Implementar permissões e auditoria

### ✅ Passo 3: Criar Rotas de Produtos (20 min)
- [ ] Criar `backend/routers/products.py` (finas, delegando para ProductService)

### ✅ Passo 4: Gerar Migração com Alembic (5 min)
- [ ] `alembic revision --autogenerate -m "create product table"`
- [ ] `alembic upgrade head`

### ✅ Passo 5: Atualizar Frontend (60 min - Opcional para Fase 2)
- [ ] Componentes já existem: `ProductList.tsx`, `ProductForm.tsx`
- [ ] Conectar com API

### ✅ Passo 6: Atualizar Reset Script (10 min)
- [ ] Ativar criação de produtos em `reset_erp.py`

---

## 🎯 Estrutura de Dados (FINAL)

### Product Model (já existe em models.py)
```python
class Product(BaseModel, table=True):
    name: str                  # Nome do produto
    description: Optional[str] # Descrição detalhada
    category: str              # Categoria (eletrônicos, equipamentos, etc)
    status: str                # disponivel, locado, em_manutencao, inativo
    
    # Preços de locação
    price_daily: float         # Preço por dia
    price_weekly: float        # Preço por semana
    price_monthly: float       # Preço por mês
    cost: float                # Custo de aquisição
    
    # Info adicional
    quantity: int              # Quantidade disponível
    serial_number: Optional[str]  # Número de série
    notes: Optional[str]       # Observações
```

---

## 🔄 Fluxo de Implementação (Passo a Passo)

### PASSO 1: Schemas (Validação de Input/Output)

**Arquivo:** `backend/schemas.py`

Adicione no final:

```python
# --- PRODUTOS ---
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "geral"
    price_daily: float = 0.0
    price_weekly: float = 0.0
    price_monthly: float = 0.0
    cost: float = 0.0
    quantity: int = 1
    serial_number: Optional[str] = None
    notes: Optional[str] = None
    status: str = "disponivel"
    
    @field_validator('price_daily', 'price_weekly', 'price_monthly', 'cost')
    def validate_prices(cls, v):
        if v < 0:
            raise ValueError('Preço não pode ser negativo')
        return v
    
    @field_validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantidade deve ser maior que 0')
        return v

class ProductRead(ProductCreate):
    id: int
    created_at: datetime
    updated_at: datetime
```

---

### PASSO 2: ProductService (Lógica de Negócio)

**Arquivo:** `backend/services/product_service.py`

Copie o padrão do `CustomerService` e adapte para Produtos.

**Métodos principais:**
- `create_product()` - Criar com validações
- `update_product()` - Atualizar com auditoria
- `delete_product()` - Soft delete com auditoria
- `get_products_for_user()` - Listagem com permissões
- `check_product_exists()` - Validar duplicatas
- `create_audit_log()` - Registrar mudanças

---

### PASSO 3: Rotas de Produtos

**Arquivo:** `backend/routers/products.py`

Rotas finas que delegam para `ProductService`:

```
POST   /products/              → create_product
GET    /products/              → list products
GET    /products/{id}          → get product
PUT    /products/{id}          → update product
PATCH  /products/{id}/status   → update status
DELETE /products/{id}          → soft delete
```

---

### PASSO 4: Migração Alembic

```bash
# Gerar migração automaticamente
docker-compose exec backend alembic revision --autogenerate -m "create product table"

# Aplicar
docker-compose exec backend alembic upgrade head
```

---

### PASSO 5: Testar via API Docs

1. Acesse: http://localhost:8000/docs
2. Login
3. Teste `POST /products/` - Criar produto
4. Teste `GET /products/` - Listar
5. Verifique auditoria em `GET /audit/`

---

## ✨ Resultado Final

Depois de completar todos os passos, você terá:

- ✅ Produtos completamente funcional com Service Layer
- ✅ Migrações versionadas com Alembic
- ✅ Auditoria automática de todas as mudanças
- ✅ Permissões granulares por role
- ✅ Frontend pronto para se conectar

**Próxima Fase (Fase 3):** Oportunidades (Deals) e Funil de Vendas

---

## 🚀 Próximo Comando

Quando estiver pronto:

```bash
# Começar implementação
# Siga os passos acima na ordem
```

**Pronto?** Me diga quando quiser que eu implemente cada passo! 🎉
