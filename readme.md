# ERP Agent MVP

Um sistema ERP com funcionalidades de CRM avançado, focado em gestão de parceiros, controle de acesso granular (RBAC), matriz de supervisão e workflow de tarefas.

## 🛠 Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Lucide React (Ícones), Axios.
* **Backend:** Python (FastAPI), SQLModel (SQLAlchemy + Pydantic), Jose (JWT Auth).
* **Banco de Dados:** PostgreSQL.
* **Infraestrutura:** Docker & Docker Compose.

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

## 🧩 Funcionalidades Implementadas

### 1. Governança e Acesso
* **RBAC Granular:** Coluna JSON `permissions` define regras exatas (ex: `customer_require_approval`).
* **Matriz de Supervisão:** Tabela `UserSupervisor` (Muitos-para-Muitos) permite que qualquer usuário monitore outro, independente de cargo.
* **Gestão de Usuários:** Interface "Estilo Bling" (Lista e Formulário separados).

### 2. CRM e Gestão de Clientes
* **Carteira:** Vendedores veem apenas seus clientes. Supervisores veem os de seus monitorados.
* **Workflow de Aprovação:** Clientes criados por vendedores nascem com status `Pendente` (Amarelo) e exigem aprovação do Admin/Gerente.
* **Timeline Inteligente (Estilo Bitrix):**
    * Mensagens e Tarefas integradas.
    * Ciclo de vida da Tarefa: Criar -> Iniciar (Play) -> Finalizar (Check).
    * Auditoria de tempos (Visualizado em, Iniciado em, Concluído em).
    * Menções (`@usuario` ou `@todos`).

### 3. Comunicação e Notificações
* **Feed de Atividades:**
    * **Privacidade:** Atividades de vendedores são visíveis apenas para Gerentes/Admins (`visibility='admin_manager'`).
    * **Filtros:** Por Usuário e Período (Data).
    * **Postagem:** Mural de recados na Dashboard.
* **Central de Notificações (Sininho):**
    * Polling automático a cada 15s.
    * Alertas para menções, atribuição de tarefas e novos cadastros pendentes.
    * Marcação de leitura automática ao clicar.

## 📂 Estrutura de Pastas

* `backend/`
    * `main.py`: Rotas da API e regras de negócio.
    * `models.py`: Tabelas (User, Customer, Role, CustomerNote, FeedItem, Notification, UserSupervisor).
    * `schemas.py`: Contratos Pydantic.
    * `security.py`: Auth JWT.
* `frontend/`
    * `src/components/`:
        * `CustomerForm.tsx`: Timeline, Menções, Bloqueios visuais.
        * `UserForm.tsx`: Matriz de Supervisão.
        * `Home.tsx`: Feed com filtros e Dashboard.
        * `Layout.tsx`: Sidebar e Notificações.
    * `src/App.tsx`: Roteamento.