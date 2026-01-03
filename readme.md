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
    Script utilitário que zera o banco, cria tabelas e popula com dados de teste (Admin, Gerente, Vendedores e Clientes).
    *Útil caso tenhas problemas de login ou dados inconsistentes.*
    ```bash
    python3 reset_erp.py
    ```

3.  **Acessar a Aplicação:**
    * Frontend: http://localhost:5173
    * Backend Docs: http://localhost:8000/docs

## 🔐 Credenciais Padrão (Geradas pelo reset_erp.py)

* **Admin:** `pacheco@rhynoproject.com.br` / `123`
* **Gerente:** `gerente@erp.com` / `123`
* **Vendedor 1:** `carlos@vendas.com` / `123`
* **Vendedor 2:** `ana@vendas.com` / `123`

## 🧩 Funcionalidades Implementadas (Status Atual)

### 1. Arquitetura e Segurança
* **Backend Modular:** Lógica dividida em roteadores (`auth`, `users`, `customers`, `feed`, `websockets`).
* **Auditoria Técnica:** Logs de alterações críticas e sistema de login robusto (compatível com Docker).
* **RBAC Granular:** Controle de permissões via JSON no banco.

### 2. CRM e Gestão de Clientes
* **Carteira:** Vendedores veem apenas seus clientes (ou hierarquia).
* **Workflow:** Clientes pendentes vs. Ativos.
* **Timeline Inteligente:** Mensagens e Tarefas (estilo Bitrix) com histórico completo.

### 3. Comunicação e Real-Time (Estável)
* **WebSockets Robustos:** Sistema de notificações ("Sininho") e chat atualizam sem recarregar a página (F5).
* **Reconexão Automática:** O Frontend deteta queda de conexão e reconecta sozinho.
* **Logs de Diagnóstico:** O Backend informa exatamente quem está online e se a mensagem foi entregue.

## 🗺️ Roadmap de Evolução

### ✅ Concluído Recentemente (Fase de Estabilização)
* [x] **Debug WebSocket:** Correção de erro 403 (Token Expirado) e implementação de Heartbeat.
* [x] **Dependências:** Adição de `validate-docbr` e `uvicorn[standard]` para suporte a sockets.
* [x] **Login:** Migração para `pbkdf2_sha256` resolvendo incompatibilidade do `bcrypt` no Docker.

### 📦 Fase 2: Gestão de Produtos & Serviços (Próximo Passo)
* [ ] **Modelagem:** Criar tabelas `Product` e `Service`.
* [ ] **Backend:** Criar rotas de CRUD para catálogo.
* [ ] **Frontend:** Criar formulário moderno ("Single Page Scroll") para cadastro de itens.
* [ ] **Tabelas de Preço:** Diferenciação por perfil de cliente.

### 💰 Fase 3: Motor de Vendas (Futuro)
* [ ] **Oportunidades (Deals):** Funil de vendas.
* [ ] **Kanban Visual:** Arrastar e soltar cards.
* [ ] **Gerador de Propostas:** PDF/Link.

## 📂 Estrutura de Pastas Chave

* `backend/`
    * `main.py`: Configuração inicial e resiliência de conexão com BD.
    * `connection_manager.py`: Gerenciador de conexões ativas (Sockets).
    * `routers/websockets.py`: Endpoint de real-time com validação de token.
* `frontend/`
    * `src/components/Layout.tsx`: Lógica global de notificações e conexão WS persistente.
    * `src/components/CustomerForm.tsx`: Formulário de clientes com Chat integrado.