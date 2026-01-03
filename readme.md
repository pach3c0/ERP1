Aqui está o seu `README.md` atualizado, com uma nova seção específica para o **Fluxo de Versionamento**, ensinando como subir as atualizações para o Git/GitHub de forma organizada.

```markdown
# ERP Agent MVP

Um sistema ERP com funcionalidades de CRM avançado, focado em gestão de parceiros, controle de acesso granular (RBAC), matriz de supervisão e workflow de tarefas em tempo real.

## 🛠 Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Lucide React (Ícones), Axios.
* **Backend:** Python (FastAPI), SQLModel (SQLAlchemy + Pydantic).
* **Auth & Segurança:** Jose (JWT), Passlib (PBKDF2 SHA256).
* **Bibliotecas Chave:** `websockets` (Real-time), `validate-docbr` (CPF/CNPJ).
* **Banco de Dados:** PostgreSQL.
* **Infraestrutura:** Docker & Docker Compose.

## 🚀 Como Rodar o Projeto

### Comandos Principais

1.  **Iniciar o Projeto (Rebuildar se houver mudanças em dependências):**
    ```bash
    docker-compose up --build
    ```

2.  **Reset Nuclear (Limpar Banco e Recriar Dados):**
    ```bash
    python3 reset_erp.py
    ```

3.  **Acessar a Aplicação:**
    * Frontend: http://localhost:5173
    * Backend Docs: http://localhost:8000/docs

## 🆙 Como Atualizar Versão no Git (GitHub)

Sempre que terminar uma funcionalidade ou correção, utilize os comandos abaixo para subir seu código:


# Adiciona todas as modificações (Backend modular, Auditoria, WebSockets e Documentação)
git add .

# Registra a versão com uma mensagem clara sobre o estado atual
git commit -m "feat: refatoração modular, auditoria técnica e infraestrutura websocket"

# Envia para o repositório remoto no GitHub
git push



## 🔐 Credenciais Padrão (Geradas pelo reset_erp.py)

* **Admin:** `pacheco@rhynoproject.com.br` / `123`
* **Gerente:** `gerente@erp.com` / `123`
* **Vendedor 1:** `carlos@vendas.com` / `123`
* **Vendedor 2:** `ana@vendas.com` / `123`

## 🧩 Funcionalidades Implementadas (Status Atual)

### 1. Arquitetura e Segurança

* **Backend Modular:** Lógica dividida em roteadores (`auth`, `users`, `customers`, `feed`, `websockets`).
* **Auditoria Técnica:** Logs de alterações críticas e sistema de login robusto.
* **RBAC Granular:** Controle de permissões via JSON no banco.

### 2. CRM e Gestão de Clientes

* **Carteira:** Vendedores veem apenas seus clientes (ou hierarquia).
* **Workflow:** Clientes pendentes vs. Ativos.
* **Timeline Inteligente:** Mensagens e Tarefas com histórico completo.

### 3. Comunicação e Real-Time (Estabilizada ✅)

* **WebSockets Robustos:** Sistema de notificações ("Sininho") e chat atualizam sem recarregar a página.
* **Resiliência:** Implementado Heartbeat e Reconexão Automática no `Layout.tsx`.

## 🗺️ Roadmap de Evolução

### ✅ Concluído Recentemente

* [x] **Estabilização do WebSocket:** Resolvido o problema de delay/F5 nas notificações.
* [x] **Login Docker:** Migração para `pbkdf2_sha256` concluída com sucesso.

### 📦 Fase 2: Gestão de Produtos & Serviços (EM FOCO 🎯)

* [ ] **Modelagem:** Criar tabelas `Product` e `Service` (SQLModel/Pydantic).
* [ ] **Backend:** Criar rotas de CRUD para catálogo em `backend/routers/products.py`.
* [ ] **Frontend:** Criar formulário moderno ("Single Page Scroll") para cadastro de itens.
* [ ] **Tabelas de Preço:** Diferenciação por perfil de cliente.

### 💰 Fase 3: Motor de Vendas (Futuro)

* [ ] **Oportunidades (Deals):** Funil de vendas.
* [ ] **Kanban Visual:** Arrastar e soltar cards.

## 📂 Estrutura de Pastas Chave

* `backend/`
* `main.py`: Configuração inicial.
* `connection_manager.py`: Gerenciador de conexões Sockets.
* `routers/`: Módulos da API.


* `frontend/`
* `src/components/Layout.tsx`: Hub global de notificações.



```

```