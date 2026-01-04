# ⚡ Quick Start - Testando as Melhorias

## 🚀 Passo a Passo para Ativar Service Layer + Alembic

### 1️⃣ Reconstruir o Backend (instalar Alembic)

```bash
docker-compose down
docker-compose up --build
```

Aguarde até ver:
```
backend_1  | INFO:     Application startup complete.
```

---

### 2️⃣ Configurar Alembic pela Primeira Vez

**Marcar o estado atual do banco como "aplicado":**

```bash
docker-compose exec backend alembic stamp head
```

Deve retornar:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running stamp_revision  -> head
```

---

### 3️⃣ Testar o Service Layer (Via API Docs)

1. Acesse: http://localhost:8000/docs
2. Faça login com Admin: `pacheco@rhynoproject.com.br` / `123`
3. Teste o endpoint `POST /customers/`
4. Veja nos logs que agora usa `CustomerService`:

```python
# Antes: 60+ linhas de lógica na rota
# Agora: 1 linha delegando para o service
CustomerService.create_customer(...)
```

---

### 4️⃣ Verificar que Tudo Funciona

**Testar criação de cliente:**

```bash
curl -X POST "http://localhost:8000/customers/" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service Layer",
    "document": "12345678901",
    "person_type": "PF",
    "status": "ativo"
  }'
```

**Verificar que auditoria foi criada:**
- Acesse: http://localhost:8000/docs
- Endpoint: `GET /audit/`
- Deve mostrar log `CREATE` com o customer_id

---

## 🧪 Testando Alembic (Exemplo Prático)

### Cenário: Adicionar um campo novo em Customer

**1. Modificar `backend/models.py`:**

```python
class Customer(BaseModel, table=True):
    # ... campos existentes ...
    
    # NOVO CAMPO
    loyalty_points: Optional[int] = Field(default=0)  # Pontos de fidelidade
```

**2. Gerar migração automática:**

```bash
docker-compose exec backend alembic revision --autogenerate -m "add loyalty_points to customer"
```

Você verá algo como:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.autogenerate.compare] Detected added column 'customer.loyalty_points'
  Generating /app/alembic/versions/20260104_1530_abc123_add_loyalty_points_to_customer.py ... done
```

**3. Ver o que será aplicado (sem aplicar):**

```bash
docker-compose exec backend alembic upgrade head --sql
```

**4. Aplicar a migração:**

```bash
docker-compose exec backend alembic upgrade head
```

Resultado:
```
INFO  [alembic.runtime.migration] Running upgrade  -> abc123, add loyalty_points to customer
```

**5. Verificar no PostgreSQL:**

```bash
docker-compose exec db psql -U erp_user -d erp_db -c "\d customer"
```

Deve mostrar a nova coluna `loyalty_points`.

**6. Testar rollback:**

```bash
# Voltar 1 migração
docker-compose exec backend alembic downgrade -1

# Aplicar novamente
docker-compose exec backend alembic upgrade head
```

---

## 📊 Comparação: Antes vs Agora

### ANTES (sem Service Layer)

**Criar cliente via Excel? Copiar código:**
```python
# routers/customers.py - linha 20-80
def create_customer(...):
    # 60 linhas de lógica

# routers/import.py - linha 10-70
def import_excel(...):
    # Mesmas 60 linhas COPIADAS 🤦
```

### AGORA (com Service Layer)

**Criar cliente via Excel? Reutilizar:**
```python
# routers/customers.py
def create_customer(...):
    return CustomerService.create_customer(...)

# routers/import.py
def import_excel(...):
    for row in excel:
        CustomerService.create_customer(...)  # Reutiliza!
```

---

### ANTES (sem Alembic)

**Adicionar coluna:**
```bash
# Editar models.py
# Rodar docker-compose up
# ❌ ERRO: coluna não existe
# Deletar banco inteiro
python3 reset_erp.py
# ❌ Todos os dados perdidos
```

### AGORA (com Alembic)

**Adicionar coluna:**
```bash
# Editar models.py
docker-compose exec backend alembic revision --autogenerate -m "descrição"
docker-compose exec backend alembic upgrade head
# ✅ Coluna adicionada SEM PERDER DADOS
```

---

## 🎯 Checklist de Validação

Execute cada item e marque:

- [ ] Backend iniciou sem erros com `docker-compose up --build`
- [ ] `alembic stamp head` executou com sucesso
- [ ] Endpoint `POST /customers/` cria cliente normalmente
- [ ] Logs mostram que usa `CustomerService`
- [ ] Auditoria é registrada (veja em `GET /audit/`)
- [ ] Migração de teste (`loyalty_points`) gerada com sucesso
- [ ] Migração aplicada: `alembic upgrade head`
- [ ] Rollback funcionou: `alembic downgrade -1`
- [ ] Documentação lida: `ALEMBIC_GUIDE.md` e `SERVICE_LAYER_GUIDE.md`

---

## 🚨 Troubleshooting

### "ModuleNotFoundError: No module named 'services'"

**Solução:** Rebuild do container
```bash
docker-compose down
docker-compose up --build
```

---

### "Target database is not up to date"

**Solução:** Marcar estado atual
```bash
docker-compose exec backend alembic stamp head
```

---

### "Can't locate revision"

**Solução:** Deletar arquivo problemático e recriar
```bash
rm backend/alembic/versions/<arquivo>.py
docker-compose exec backend alembic revision --autogenerate -m "nova versão"
```

---

### Código antigo ainda rodando

**Solução:** Force rebuild
```bash
docker-compose down -v
docker-compose up --build
```

---

## ✅ Próximo Passo

Se tudo funcionou:
1. Commit das mudanças: `git add . && git commit -m "feat: add service layer and alembic"`
2. Ler `ARCHITECTURE_ANALYSIS.md` para entender o roadmap
3. Começar Fase 2 (Produtos) usando o padrão estabelecido

---

## 📞 Se Algo Der Errado

1. Verificar logs: `docker-compose logs backend --tail=100`
2. Verificar banco: `docker-compose exec db psql -U erp_user -d erp_db`
3. Reset completo (último recurso):
   ```bash
   docker-compose down -v
   python3 reset_erp.py
   docker-compose up --build
   docker-compose exec backend alembic stamp head
   ```

---

**Tudo pronto! 🎉 Agora você tem uma arquitetura escalável e preparada para o futuro.**
