# 🏗️ Service Layer - Arquitetura de Alta Escalabilidade

## Por que Service Layer?

Antes, toda a lógica de negócio estava **presa dentro das rotas HTTP**. Agora, está separada em **Serviços reutilizáveis**.

---

## 🔴 Problema do Código Antigo

### Antes: `routers/customers.py` (60+ linhas)
```python
@router.post("/")
def create_customer(customer_input, session, current_user):
    # Validação de documento
    existing = session.exec(select(Customer).where(...)).first()
    if existing:
        raise HTTPException(...)
    
    # Lógica de aprovação
    role_permissions = current_user.role.permissions
    if role_permissions.get("customer_require_approval"):
        status = "pendente"
    else:
        status = "ativo"
    
    # Criar cliente
    new_customer = Customer(**data)
    session.add(new_customer)
    session.commit()
    
    # Auditoria
    audit = AuditLog(...)
    session.add(audit)
    session.commit()
    
    return new_customer
```

**Problemas:**
1. ❌ Se você precisar criar cliente via **Excel import**, vai copiar esse código.
2. ❌ Se precisar criar cliente via **WebSocket**, vai copiar de novo.
3. ❌ Testes unitários precisam mockar requisições HTTP.
4. ❌ Lógica misturada com validação de HTTP.

---

## ✅ Solução: Service Layer

### Agora: `routers/customers.py` (15 linhas)
```python
@router.post("/")
def create_customer(customer_input, session, current_user):
    """Rota HTTP fina que delega para o Service."""
    customer_data = customer_input.dict()
    new_customer = CustomerService.create_customer(
        session=session,
        customer_data=customer_data,
        current_user=current_user
    )
    return new_customer
```

### `services/customer_service.py` (Lógica isolada)
```python
class CustomerService:
    @staticmethod
    def create_customer(session, customer_data, current_user):
        # 1. Validar documento
        # 2. Aplicar regras de negócio
        # 3. Criar cliente
        # 4. Registrar auditoria
        return new_customer
```

**Benefícios:**
1. ✅ Pode ser usado em **qualquer contexto** (HTTP, WebSocket, CLI, Celery).
2. ✅ Testes unitários diretos: `CustomerService.create_customer(...)`.
3. ✅ Lógica de negócio concentrada e documentada.
4. ✅ Rotas HTTP ficam **finas e legíveis**.

---

## 📂 Estrutura Atual

```
backend/
  routers/
    customers.py       # Apenas HTTP: validação de input, resposta
  services/
    customer_service.py  # Lógica de negócio pura
  models.py            # Estruturas de dados (SQLModel)
```

---

## 🎯 Como Usar o CustomerService

### 1️⃣ Criar Cliente (já refatorado)
```python
# Na rota HTTP
new_customer = CustomerService.create_customer(
    session=session,
    customer_data=customer_input.dict(),
    current_user=current_user
)
```

### 2️⃣ Atualizar Cliente (já refatorado)
```python
updated_customer = CustomerService.update_customer(
    session=session,
    customer=customer,
    customer_data=customer_input.dict(),
    current_user=current_user
)
```

### 3️⃣ Atualizar Status (já refatorado)
```python
CustomerService.update_customer_status(
    session=session,
    customer=customer,
    new_status="ativo",
    current_user=current_user
)
```

### 4️⃣ Verificar Documento (já refatorado)
```python
existing = CustomerService.check_document_exists(session, "12345678901")
if existing:
    print(f"Documento já cadastrado: {existing.name}")
```

### 5️⃣ Listar Clientes com Hierarquia
```python
customers = CustomerService.get_customers_for_user(
    session=session,
    user=current_user,
    skip=0,
    limit=25,
    status_filter="ativo"  # Opcional
)
```

---

## 🚀 Próximos Casos de Uso

### Importar Clientes via Excel
```python
# Novo endpoint: POST /customers/import
@router.post("/import")
def import_customers(file: UploadFile, session, current_user):
    df = pd.read_excel(file)
    
    for _, row in df.iterrows():
        customer_data = row.to_dict()
        # Reutiliza a mesma lógica!
        CustomerService.create_customer(
            session=session,
            customer_data=customer_data,
            current_user=current_user
        )
    
    return {"imported": len(df)}
```

### Criar Cliente via WebSocket
```python
# websockets.py
async def handle_create_customer(data, session, user):
    customer = CustomerService.create_customer(
        session=session,
        customer_data=data,
        current_user=user
    )
    await manager.broadcast({"type": "new_customer", "customer": customer})
```

### Background Task (Celery)
```python
# tasks.py
@celery.task
def create_customer_async(customer_data, user_id):
    session = get_session_sync()
    user = session.get(User, user_id)
    
    customer = CustomerService.create_customer(
        session=session,
        customer_data=customer_data,
        current_user=user
    )
    
    send_welcome_email(customer.email)
```

---

## 🧪 Testando Services (Unitário)

```python
# tests/test_customer_service.py
def test_create_customer_as_admin():
    session = TestSession()
    admin = create_test_user(role="admin")
    
    customer_data = {
        "name": "Test Customer",
        "document": "12345678901",
        "person_type": "PF"
    }
    
    customer = CustomerService.create_customer(
        session=session,
        customer_data=customer_data,
        current_user=admin
    )
    
    assert customer.status == "ativo"  # Admin não precisa aprovação
    assert customer.created_by_id == admin.id
```

---

## 📊 Comparação: Antes vs Agora

| Situação | Antes (Lógica na Rota) | Agora (Service Layer) |
|----------|------------------------|------------------------|
| Criar via HTTP | ✅ | ✅ |
| Criar via Excel | ❌ (copiar código) | ✅ (reutilizar service) |
| Criar via WebSocket | ❌ (copiar código) | ✅ (reutilizar service) |
| Testes unitários | ❌ (precisa mockar HTTP) | ✅ (testa direto) |
| Auditoria automática | ⚠️ (duplicado em cada rota) | ✅ (centralizado) |
| Manutenção | ❌ (mudar em N lugares) | ✅ (mudar em 1 lugar) |

---

## 🎓 Padrão Recomendado

### Estrutura de um Service

```python
class XxxService:
    # 1. Validações
    @staticmethod
    def validate_something(data) -> None:
        if not valid:
            raise HTTPException(...)
    
    # 2. Regras de Negócio
    @staticmethod
    def calculate_something(data) -> Result:
        # Lógica pura
        return result
    
    # 3. Operações CRUD
    @staticmethod
    def create_xxx(session, data, user) -> Xxx:
        # Criar
        # Auditar
        return xxx
    
    # 4. Helpers de Permissão
    @staticmethod
    def can_user_edit_xxx(user, xxx) -> bool:
        return True/False
```

---

## ✅ Checklist para Criar Novos Services

Quando você implementar **Products** (Fase 2):

- [ ] Criar `services/product_service.py`
- [ ] Mover lógica de `routers/products.py` para o service
- [ ] Métodos principais: `create_product`, `update_product`, `calculate_margin`
- [ ] Rotas HTTP apenas delegam para o service
- [ ] Testes unitários do service (sem HTTP)

---

## 🏆 Resultado

Você agora tem uma arquitetura **pronta para escalar**:
- ✅ Lógica reutilizável
- ✅ Testável isoladamente
- ✅ Preparada para Microserviços (se necessário no futuro)
- ✅ Código limpo e manutenível

**Próximo Service:** `ProductService` na Fase 2! 🚀
