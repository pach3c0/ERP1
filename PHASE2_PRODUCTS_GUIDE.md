# 🎯 Guia Prático: Implementando ProductService (Fase 2)

## 📋 Checklist da Fase 2

Quando você começar a implementar Produtos, siga este guia passo a passo:

---

## 1️⃣ Criar Modelos (models.py)

```python
# backend/models.py

class Product(BaseModel, table=True):
    """Modelo de Produto"""
    
    # Identificação
    name: str = Field(index=True)
    sku: str = Field(unique=True, index=True)  # Código do produto
    description: Optional[str] = None
    
    # Categoria e Tipo
    category: str  # Eletrônicos, Alimentação, etc
    product_type: str = Field(default="product")  # product, service, combo
    
    # Financeiro
    price_base: float = Field(default=0.0)  # Preço base de venda
    cost: float = Field(default=0.0)  # Custo
    margin_percent: Optional[float] = None  # Margem calculada
    
    # Estoque (implementar depois)
    stock_quantity: int = Field(default=0)
    min_stock: int = Field(default=0)
    
    # Status
    status: str = Field(default="ativo")  # ativo, inativo, descontinuado
    is_active: bool = Field(default=True)
    
    # Relacionamentos
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")


class Service(BaseModel, table=True):
    """Modelo de Serviço (diferente de Produto físico)"""
    
    name: str = Field(index=True)
    code: str = Field(unique=True, index=True)
    description: Optional[str] = None
    
    # Financeiro
    price_hour: Optional[float] = None  # Preço por hora
    price_fixed: Optional[float] = None  # Preço fixo
    estimated_hours: Optional[float] = None
    
    # Status
    status: str = Field(default="ativo")
    
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
```

---

## 2️⃣ Gerar Migração

```bash
# Após adicionar os modelos
docker-compose exec backend alembic revision --autogenerate -m "create product and service tables"

# Aplicar
docker-compose exec backend alembic upgrade head
```

**Verificar:**
```bash
docker-compose exec db psql -U erp_user -d erp_db -c "\dt"
```

Deve mostrar as tabelas `product` e `service`.

---

## 3️⃣ Criar Schemas (schemas.py)

```python
# backend/schemas.py

class ProductCreate(SQLModel):
    """Schema para criação de produto"""
    name: str
    sku: str
    description: Optional[str] = None
    category: str
    product_type: str = "product"
    price_base: float
    cost: float
    stock_quantity: int = 0
    min_stock: int = 0
    status: str = "ativo"


class ProductRead(SQLModel):
    """Schema para leitura de produto"""
    id: int
    name: str
    sku: str
    description: Optional[str]
    category: str
    product_type: str
    price_base: float
    cost: float
    margin_percent: Optional[float]
    stock_quantity: int
    min_stock: int
    status: str
    created_at: datetime
    created_by_id: Optional[int]


class ServiceCreate(SQLModel):
    """Schema para criação de serviço"""
    name: str
    code: str
    description: Optional[str] = None
    price_hour: Optional[float] = None
    price_fixed: Optional[float] = None
    estimated_hours: Optional[float] = None
    status: str = "ativo"


class ServiceRead(SQLModel):
    """Schema para leitura de serviço"""
    id: int
    name: str
    code: str
    description: Optional[str]
    price_hour: Optional[float]
    price_fixed: Optional[float]
    estimated_hours: Optional[float]
    status: str
    created_at: datetime
    created_by_id: Optional[int]
```

---

## 4️⃣ Criar Service Layer (services/product_service.py)

```python
# backend/services/product_service.py

"""
Product Service Layer
Lógica de negócio para Produtos e Serviços
"""

from typing import Optional, List
from sqlmodel import Session, select
from fastapi import HTTPException

from models import Product, Service, AuditLog, User


class ProductService:
    """Serviço de gerenciamento de produtos"""
    
    @staticmethod
    def calculate_margin(price: float, cost: float) -> float:
        """
        Calcula a margem percentual.
        
        Formula: ((price - cost) / cost) * 100
        """
        if cost == 0:
            return 0.0
        return ((price - cost) / cost) * 100
    
    @staticmethod
    def check_sku_exists(session: Session, sku: str) -> Optional[Product]:
        """Verifica se um SKU já está cadastrado"""
        return session.exec(
            select(Product).where(Product.sku == sku)
        ).first()
    
    @staticmethod
    def create_product(
        session: Session,
        product_data: dict,
        current_user: User
    ) -> Product:
        """
        Cria um novo produto com validações e auditoria.
        
        Raises:
            HTTPException: Se SKU duplicado
        """
        # 1. Verificar SKU duplicado
        existing = ProductService.check_sku_exists(session, product_data["sku"])
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"SKU {product_data['sku']} já cadastrado"
            )
        
        # 2. Calcular margem
        margin = ProductService.calculate_margin(
            product_data["price_base"],
            product_data["cost"]
        )
        product_data["margin_percent"] = margin
        
        # 3. Criar produto
        new_product = Product(**product_data)
        new_product.created_by_id = current_user.id
        
        session.add(new_product)
        session.commit()
        session.refresh(new_product)
        
        # 4. Auditoria
        audit = AuditLog(
            table_name="product",
            record_id=new_product.id,
            action="CREATE",
            user_id=current_user.id,
            changes={
                "created": True,
                "sku": new_product.sku,
                "margin": margin
            }
        )
        session.add(audit)
        session.commit()
        
        return new_product
    
    @staticmethod
    def update_product(
        session: Session,
        product: Product,
        product_data: dict,
        current_user: User
    ) -> Product:
        """Atualiza um produto existente"""
        
        # Verificar permissão
        role_permissions = current_user.role.permissions
        can_edit_products = role_permissions.get("can_edit_products", False)
        
        if current_user.role.slug not in ["admin", "manager"] and not can_edit_products:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para editar produtos"
            )
        
        # Capturar mudanças
        changes = {}
        for key, value in product_data.items():
            old_value = getattr(product, key)
            if old_value != value:
                changes[key] = {"old": old_value, "new": value}
                setattr(product, key, value)
        
        # Recalcular margem se preço/custo mudaram
        if "price_base" in changes or "cost" in changes:
            product.margin_percent = ProductService.calculate_margin(
                product.price_base,
                product.cost
            )
        
        # Salvar
        if changes:
            session.add(product)
            session.commit()
            session.refresh(product)
            
            # Auditoria
            audit = AuditLog(
                table_name="product",
                record_id=product.id,
                action="UPDATE",
                user_id=current_user.id,
                changes=changes
            )
            session.add(audit)
            session.commit()
        
        return product
    
    @staticmethod
    def get_products(
        session: Session,
        skip: int = 0,
        limit: int = 100,
        category_filter: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Product]:
        """Lista produtos com filtros"""
        
        statement = select(Product)
        
        # Filtros
        if category_filter:
            statement = statement.where(Product.category == category_filter)
        
        if status_filter:
            statement = statement.where(Product.status == status_filter)
        else:
            # Por padrão, não mostrar descontinuados
            statement = statement.where(Product.status != "descontinuado")
        
        # Paginação
        statement = statement.offset(skip).limit(limit)
        
        return list(session.exec(statement).all())


class ServiceService:
    """Serviço de gerenciamento de serviços"""
    
    @staticmethod
    def check_code_exists(session: Session, code: str) -> Optional[Service]:
        """Verifica se um código já está cadastrado"""
        return session.exec(
            select(Service).where(Service.code == code)
        ).first()
    
    @staticmethod
    def create_service(
        session: Session,
        service_data: dict,
        current_user: User
    ) -> Service:
        """Cria um novo serviço"""
        
        # Verificar código duplicado
        existing = ServiceService.check_code_exists(session, service_data["code"])
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Código {service_data['code']} já cadastrado"
            )
        
        # Criar serviço
        new_service = Service(**service_data)
        new_service.created_by_id = current_user.id
        
        session.add(new_service)
        session.commit()
        session.refresh(new_service)
        
        # Auditoria
        audit = AuditLog(
            table_name="service",
            record_id=new_service.id,
            action="CREATE",
            user_id=current_user.id,
            changes={"created": True, "code": new_service.code}
        )
        session.add(audit)
        session.commit()
        
        return new_service
```

---

## 5️⃣ Criar Rotas HTTP (routers/products.py)

**IMPORTANTE:** As rotas devem ser **finas** e delegar para o Service.

```python
# backend/routers/products.py

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List, Optional

from database import get_session
from models import Product, Service
from dependencies import get_current_user
from schemas import ProductCreate, ProductRead, ServiceCreate, ServiceRead
from services.product_service import ProductService, ServiceService

router = APIRouter(prefix="/products", tags=["products"])

# ============ PRODUTOS ============

@router.post("/", response_model=ProductRead)
def create_product(
    product_input: ProductCreate,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Cria um novo produto usando ProductService"""
    product_data = product_input.dict()
    new_product = ProductService.create_product(
        session=session,
        product_data=product_data,
        current_user=current_user
    )
    return new_product


@router.get("/", response_model=List[ProductRead])
def list_products(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Lista produtos com filtros"""
    products = ProductService.get_products(
        session=session,
        skip=skip,
        limit=limit,
        category_filter=category,
        status_filter=status
    )
    return products


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Busca um produto por ID"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    product_input: ProductCreate,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Atualiza um produto"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    product_data = product_input.dict()
    updated_product = ProductService.update_product(
        session=session,
        product=product,
        product_data=product_data,
        current_user=current_user
    )
    return updated_product


# ============ SERVIÇOS ============

@router.post("/services/", response_model=ServiceRead)
def create_service(
    service_input: ServiceCreate,
    session: Session = Depends(get_session),
    current_user = Depends(get_current_user)
):
    """Cria um novo serviço"""
    service_data = service_input.dict()
    new_service = ServiceService.create_service(
        session=session,
        service_data=service_data,
        current_user=current_user
    )
    return new_service
```

---

## 6️⃣ Registrar Rotas (main.py)

```python
# backend/main.py

# ... imports existentes ...
from routers import products  # NOVO

app = FastAPI(...)

# ... rotas existentes ...
app.include_router(products.router)  # NOVO
```

---

## 7️⃣ Testar

### Via API Docs (http://localhost:8000/docs)

1. **Criar produto:**
```json
POST /products/
{
  "name": "Notebook Dell",
  "sku": "NB-DELL-001",
  "description": "Notebook Dell Inspiron",
  "category": "Eletrônicos",
  "price_base": 3500.00,
  "cost": 2800.00,
  "stock_quantity": 10,
  "min_stock": 2
}
```

2. **Listar produtos:**
```
GET /products/?category=Eletrônicos&status=ativo
```

3. **Verificar auditoria:**
```
GET /audit/
```

---

## 8️⃣ Frontend (Próximo Passo)

Criar componentes usando o mesmo padrão:
- `ProductForm.tsx` (já existe, atualizar para usar novos endpoints)
- `ProductList.tsx` (já existe, atualizar)

**Usar React Query:**
```tsx
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products/');
      return response.data;
    }
  });
};
```

---

## ✅ Checklist Final

Antes de considerar a Fase 2 completa:

- [ ] Modelos `Product` e `Service` criados
- [ ] Migração gerada e aplicada
- [ ] Schemas criados em `schemas.py`
- [ ] `ProductService` e `ServiceService` criados
- [ ] Rotas HTTP criadas em `routers/products.py`
- [ ] Rotas registradas em `main.py`
- [ ] Testado via `/docs`: criar, listar, atualizar
- [ ] Auditoria registrada em `audit_log`
- [ ] Frontend atualizado com React Query
- [ ] Documentação atualizada no README

---

**Próximo:** Fase 3 - Motor de Vendas! 🚀
