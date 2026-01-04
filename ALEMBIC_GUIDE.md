# 🔄 Guia de Migrações com Alembic

## O que mudou?

Agora você tem **versionamento de banco de dados** usando Alembic. Não é mais necessário usar `SQLModel.metadata.create_all()` - as mudanças de schema são rastreadas como migrações.

---

## 📋 Comandos Principais

### 1️⃣ Criar uma Nova Migração (Automática)

Quando você adicionar/modificar modelos em `models.py`:

```bash
# Dentro do container backend
docker-compose exec backend alembic revision --autogenerate -m "descrição da mudança"
```

Exemplo:
```bash
docker-compose exec backend alembic revision --autogenerate -m "add credit_limit to customers"
```

Isso criará um arquivo em `backend/alembic/versions/` com as mudanças detectadas.

---

### 2️⃣ Aplicar Migrações

```bash
# Aplicar todas as migrações pendentes
docker-compose exec backend alembic upgrade head
```

---

### 3️⃣ Reverter Migrações

```bash
# Voltar 1 migração
docker-compose exec backend alembic downgrade -1

# Voltar para uma revisão específica
docker-compose exec backend alembic downgrade <revision_id>

# Voltar para o início (CUIDADO: destrói dados)
docker-compose exec backend alembic downgrade base
```

---

### 4️⃣ Ver Histórico de Migrações

```bash
# Ver migrações aplicadas
docker-compose exec backend alembic current

# Ver histórico completo
docker-compose exec backend alembic history --verbose
```

---

## 🎯 Fluxo de Trabalho Recomendado

### Adicionando um Novo Campo

**Antes (Problemático):**
```python
# models.py
class Customer(BaseModel, table=True):
    name: str
    # Adicionar: email_secundario
```

Rodava `docker-compose up --build` e torcia para não quebrar.

**Agora (Correto):**

1. **Modificar o modelo:**
```python
# models.py
class Customer(BaseModel, table=True):
    name: str
    email_secundario: Optional[str] = None  # NOVO
```

2. **Criar migração:**
```bash
docker-compose exec backend alembic revision --autogenerate -m "add email_secundario to customer"
```

3. **Revisar o arquivo gerado** em `backend/alembic/versions/`:
```python
def upgrade() -> None:
    op.add_column('customer', sa.Column('email_secundario', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('customer', 'email_secundario')
```

4. **Aplicar:**
```bash
docker-compose exec backend alembic upgrade head
```

---

## 🚀 Primeira Migração (Setup Inicial)

Como você já tem tabelas criadas, precisa gerar uma migração inicial:

```bash
# 1. Garantir que o banco está atualizado com os modelos atuais
docker-compose up -d

# 2. Criar migração inicial (snapshot do estado atual)
docker-compose exec backend alembic revision --autogenerate -m "initial migration"

# 3. Marcar como aplicada (pois as tabelas já existem)
docker-compose exec backend alembic stamp head
```

**⚠️ IMPORTANTE:** Rode isso ANTES de fazer qualquer mudança nos modelos.

---

## 🏗️ Exemplo Prático: Fase 2 - Produtos

Quando você criar as tabelas de Produtos:

1. **Adicionar os modelos em `models.py`:**
```python
class Product(BaseModel, table=True):
    name: str
    description: Optional[str] = None
    price: float
    cost: float
    category: str
    status: str = Field(default="ativo")
```

2. **Gerar migração:**
```bash
docker-compose exec backend alembic revision --autogenerate -m "create product table"
```

3. **Aplicar:**
```bash
docker-compose exec backend alembic upgrade head
```

4. **Se algo der errado, reverter:**
```bash
docker-compose exec backend alembic downgrade -1
```

---

## 🔍 Troubleshooting

### "Target database is not up to date"
```bash
docker-compose exec backend alembic stamp head
```

### "Can't locate revision identified by 'xyz'"
Deletar o arquivo de migração problemático e recriar:
```bash
rm backend/alembic/versions/<arquivo>.py
docker-compose exec backend alembic revision --autogenerate -m "nova versão"
```

### Ver SQL que será executado (sem aplicar)
```bash
docker-compose exec backend alembic upgrade head --sql
```

---

## 📊 Comparação: Antes vs Agora

| Situação | Antes | Agora |
|----------|-------|-------|
| Adicionar coluna | Dropava tudo e recriava | Alembic adiciona sem perder dados |
| Produção | Impossível fazer rollback | `alembic downgrade -1` |
| Trabalho em equipe | Conflitos de schema | Migrações versionadas no Git |
| Histórico | Nenhum | `alembic history` mostra tudo |

---

## ✅ Checklist para Produção

- [ ] Rodar `alembic upgrade head` no servidor antes do deploy
- [ ] Testar `downgrade` localmente antes de aplicar mudanças críticas
- [ ] Fazer backup do banco antes de migrações grandes
- [ ] Nunca editar migrações já aplicadas (criar uma nova)

---

**Próximo Passo:** Quando você começar a Fase 2 (Produtos), use esse fluxo desde o início!
