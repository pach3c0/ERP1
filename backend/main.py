from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select
import time
from sqlalchemy.exc import OperationalError

from database import create_db_and_tables, engine
from models import Role
from routers import auth, users, customers, feed, websockets, audit, products, services, quotes, dashboard 

def create_default_roles():
    """Cria os cargos padrão se não existirem."""
    try:
        with Session(engine) as session:
            roles = [
                {
                    "name": "Super Admin", 
                    "slug": "admin", 
                    "description": "Acesso total", 
                    "permissions": {
                        "all": True,
                        # Clientes
                        "customer_change_status": True, 
                        "customer_require_approval": False,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": True,
                        "can_delete_customers": True,
                        # Produtos
                        "can_create_products": True,
                        "can_edit_products": True,
                        "can_delete_products": True,
                        "can_change_product_status": True,
                        # Serviços
                        "can_create_services": True,
                        "can_edit_services": True,
                        "can_delete_services": True,
                        "can_change_service_status": True,
                        "can_edit_service_basic": True,
                        # Orçamentos
                        "can_create_quotes": True,
                        "can_edit_quotes": True,
                        "can_delete_quotes": True,
                        "can_change_quote_status": True,
                        "can_view_all_quotes": True,
                    }
                },
                {
                    "name": "Gerente", 
                    "slug": "manager", 
                    "description": "Gestão", 
                    "permissions": {
                        # Clientes
                        "customer_change_status": True, 
                        "customer_require_approval": False,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": True,
                        "can_delete_customers": True,
                        # Produtos
                        "can_create_products": True,
                        "can_edit_products": True,
                        "can_delete_products": True,
                        "can_change_product_status": True,
                        # Serviços
                        "can_create_services": True,
                        "can_edit_services": True,
                        "can_delete_services": True,
                        "can_change_service_status": True,
                        "can_edit_service_basic": True,
                        # Orçamentos
                        "can_create_quotes": True,
                        "can_edit_quotes": True,
                        "can_delete_quotes": True,
                        "can_change_quote_status": True,
                        "can_view_all_quotes": True,
                    }
                },
                {
                    "name": "Vendedor", 
                    "slug": "sales", 
                    "description": "Vendas", 
                    "permissions": {
                        # Clientes
                        "customer_change_status": False, 
                        "customer_require_approval": True,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": False,
                        "can_delete_customers": False,
                        # Produtos
                        "can_create_products": False,
                        "can_edit_products": False,
                        "can_delete_products": False,
                        "can_change_product_status": False,
                        # Serviços
                        "can_create_services": False,
                        "can_edit_services": False,
                        "can_delete_services": False,
                        "can_change_service_status": False,
                        "can_edit_service_basic": False,
                        # Orçamentos
                        "can_create_quotes": True,
                        "can_edit_quotes": True,
                        "can_delete_quotes": False,
                        "can_change_quote_status": False,
                        "can_view_all_quotes": False,
                    }
                }
            ]
            for role_data in roles:
                role = session.exec(select(Role).where(Role.slug == role_data["slug"])).first()
                if not role: 
                    print(f"🛠️ Criando cargo: {role_data['name']}")
                    session.add(Role(**role_data))
                else:
                    # Sempre atualiza permissões para adicionar novas
                    print(f"📝 Atualizando permissões do cargo: {role_data['name']}")
                    role.permissions = role_data["permissions"]
                    session.add(role)
            session.commit()
            print("✅ Cargos padrão verificados/criados com sucesso.")
    except Exception as e:
        print(f"❌ Erro ao criar cargos: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tenta conectar ao banco com retries
    max_retries = 10
    for i in range(max_retries):
        try:
            print(f"⏳ Tentando conectar ao banco ({i+1}/{max_retries})...")
            create_db_and_tables()
            create_default_roles()
            break
        except OperationalError:
            print("⚠️ Banco de dados ainda não está pronto. Aguardando 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"❌ Erro crítico ao iniciar banco: {e}")
            break
    yield

app = FastAPI(lifespan=lifespan, title="ERP Agent MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INCLUI ROTEADORES ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(customers.router)
app.include_router(feed.router)
app.include_router(websockets.router)
app.include_router(audit.router)
app.include_router(products.router)
app.include_router(services.router)
app.include_router(quotes.router)
app.include_router(dashboard.router)