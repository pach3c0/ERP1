from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select
import time
from sqlalchemy.exc import OperationalError

from database import create_db_and_tables, engine
from models import Role
from routers import auth, users, customers, feed, websockets, audit, products 

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
                        "customer_change_status": True, 
                        "customer_require_approval": False,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": True
                    }
                },
                {
                    "name": "Gerente", 
                    "slug": "manager", 
                    "description": "Gestão", 
                    "permissions": {
                        "customer_change_status": True, 
                        "customer_require_approval": False,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": True
                    }
                },
                {
                    "name": "Vendedor", 
                    "slug": "sales", 
                    "description": "Vendas", 
                    "permissions": {
                        "customer_change_status": False, 
                        "customer_require_approval": True,
                        "can_edit_own_customers": True,
                        "can_edit_others_customers": False
                    }
                }
            ]
            for role_data in roles:
                role = session.exec(select(Role).where(Role.slug == role_data["slug"])).first()
                if not role: 
                    print(f"🛠️ Criando cargo: {role_data['name']}")
                    session.add(Role(**role_data))
                else:
                    # Atualiza permissões se necessário
                    if not role.permissions or "can_edit_own_customers" not in role.permissions:
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
app.include_router(products.service_router)