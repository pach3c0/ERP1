# ERP Agent MVP

Um sistema ERP com funcionalidades de CRM avançado, focado em gestão de parceiros, controle de acesso granular (RBAC), matriz de supervisão e workflow de tarefas em tempo real.

## 🛠 Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Lucide React (Ícones), Axios.
* **Backend:** Python (FastAPI), SQLModel (SQLAlchemy + Pydantic), Jose (JWT Auth).
* **Banco de Dados:** PostgreSQL.
* **Infraestrutura:** Docker & Docker Compose.
* **Real-Time:** WebSockets (FastAPI + React).

## 🚀 Como Rodar o Projeto

### Comandos Principais

1.  **Iniciar o Projeto:**
    ```bash
    docker-compose up --build
    ```

2.  **Reset Nuclear (Limpar Banco e Recriar Dados):**
    Script utilitário que zera o banco, cria tabelas e popula com dados de teste (Admin, Gerente, Vendedores e Clientes).
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

## 🧩 Funcionalidades Implementadas (O que já temos)

### 1. Arquitetura e Segurança
* **Backend Modular:** Refatorado em roteadores (`routers/`) para escalabilidade.
* **Auditoria Técnica (Logs):** Tabela `AuditLog` registra todas as alterações críticas.
* **RBAC Granular:** Controle de permissões via JSON no banco.

### 2. CRM e Gestão de Clientes
* **Carteira:** Vendedores veem apenas seus clientes.
* **Workflow de Aprovação:** Clientes criados por vendedores nascem com status `Pendente`.
* **Timeline Inteligente (Estilo Bitrix):** Mensagens, Tarefas com ciclo de vida (Play/Check) e Menções.

### 3. Comunicação e Real-Time
* **Feed de Atividades:** Com filtros e controle de privacidade.
* **WebSockets:** Notificações instantâneas (Sininho) e Chat sem refresh.

## 🗺️ Roadmap de Evolução (Próximos Passos)

### 📦 Fase 2: Gestão de Produtos & Serviços (Atual)
* [ ] **Cadastro de Produtos:** Tabela `Product` (SKU, Preço, Estoque).
* [ ] **Cadastro de Serviços:** Tabela `Service` (Valor Hora/Fixo).
* [ ] **Tabelas de Preço:** Diferenciação por perfil de cliente.

### 💰 Fase 3: Motor de Vendas
* [ ] **Oportunidades (Deals):** Funil de vendas vinculado ao cliente.
* [ ] **Kanban Visual:** Arrastar e soltar cards entre fases.
* [ ] **Gerador de Propostas:** Criar orçamentos em PDF/Link.

### 👁️ Fase 4: UX Avançada
* [ ] **Shadowing:** Supervisor logar como Vendedor para suporte.
* [ ] **Agenda:** Visualização de tarefas em calendário.
* [ ] **Busca Global:** Barra de pesquisa universal (Spotlight).

## 📂 Estrutura de Pastas

* `backend/`
    * `main.py`: Entry point limpo.
    * `connection_manager.py`: Gerenciador de WebSockets.
    * `routers/`: Auth, Users, Customers, Feed, WebSockets.
* `frontend/`
    * `src/components/`: CustomerForm (Chat/Timeline), Layout (Sininho), UserForm (Supervisão).