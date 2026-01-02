# ERP Agent MVP

Um sistema ERP com funcionalidades de CRM, focado em gestão de parceiros (clientes/fornecedores), controle de acesso granular (RBAC) e gestão de carteira de vendas.

## 🛠 Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Lucide React (Ícones), Axios.
* **Backend:** Python (FastAPI), SQLModel (SQLAlchemy + Pydantic), Jose (JWT Auth).
* **Banco de Dados:** PostgreSQL.
* **Infraestrutura:** Docker & Docker Compose.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* Docker e Docker Compose instalados.

### Comandos Principais

1.  **Iniciar o Projeto (Primeira vez ou após alterações no banco):**
    ```bash
    # Reconstrói as imagens e sobe os containers
    docker-compose up --build
    ```

2.  **Reset Nuclear (Limpar Banco e Recriar Dados):**
    Use o script utilitário em Python para zerar o banco e criar usuários padrão (Admin e Vendedores).
    ```bash
    python3 reset_erp.py
    ```

3.  **Acessar a Aplicação:**
    * Frontend: http://localhost:5173
    * Backend Docs (Swagger): http://localhost:8000/docs

## 🔐 Credenciais Padrão (Geradas pelo reset_erp.py)

* **Admin:** `pacheco@rhynoproject.com.br` / `123`
* **Vendedor 1:** `carlos@vendas.com` / `123`
* **Vendedor 2:** `ana@vendas.com` / `123`

## 🧩 Funcionalidades Implementadas

### 1. Autenticação & Permissões (RBAC)
* Sistema de Login com Token JWT.
* **Cargos (Roles):** Tabela no banco com coluna JSON `permissions`.
* **Permissões Granulares:**
    * `can_change_status`: Permite ativar/inativar clientes.
    * `customer_require_approval`: Se true, clientes criados nascem com status "Pendente".

### 2. Gestão de Parceiros (Clientes/Fornecedores)
* Cadastro unificado (Flag `is_customer` / `is_supplier`).
* **Busca de CEP:** Integração automática com ViaCEP.
* **Validação:** CPF/CNPJ válidos obrigatórios.
* **Fluxo de Status:** Ativo, Inativo, Pendente (com cores visuais na lista).

### 3. CRM & Carteira de Vendas
* **Propriedade:** Cada cliente tem um `created_by` (imutável) e um `salesperson_id` (dono atual da carteira).
* **Visão de Vendedor:** Vendedores veem apenas sua própria carteira.
* **Transferência:** Admins/Gerentes podem transferir clientes entre vendedores.

### 4. Interface (UI)
* **Layout:** Sidebar dinâmica (mostra nome/cargo) e navegação estilo "Bling".
* **Listagem:** Tabela com ações rápidas (3 pontinhos), checkboxes e filtros.
* **Configurações:** Tela para Admins alterarem permissões de cargos visualmente.

## 📂 Estrutura de Pastas

* `backend/`
    * `main.py`: Rotas da API e regras de negócio.
    * `models.py`: Tabelas do Banco (SQLModel).
    * `schemas.py`: Contratos de dados (Pydantic).
    * `security.py`: Lógica de Hash de senha e JWT.
    * `database.py`: Conexão com Postgres.
* `frontend/`
    * `src/components/`: Telas e componentes (CustomerList, CustomerForm, Layout, etc).
    * `src/App.tsx`: Configuração de Rotas.