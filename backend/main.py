from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import Session, select

from database import create_db_and_tables, engine
from models import Role
# IMPORTANTE: Adicionei websockets na lista
from routers import auth, users, customers, feed, websockets 

def create_default_roles():
    with Session(engine) as session:
        roles = [
            {"name": "Super Admin", "slug": "admin", "description": "Acesso total", "permissions": {"all": True, "customer_change_status": True, "customer_require_approval": False}},
            {"name": "Gerente", "slug": "manager", "description": "Gestão", "permissions": {"customer_change_status": True, "customer_require_approval": False}},
            {"name": "Vendedor", "slug": "sales", "description": "Vendas", "permissions": {"customer_change_status": False, "customer_require_approval": True}}
        ]
        for role_data in roles:
            role = session.exec(select(Role).where(Role.slug == role_data["slug"])).first()
            if not role: session.add(Role(**role_data))
            else:
                if not role.permissions:
                    role.permissions = role_data["permissions"]
                    session.add(role)
        session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    create_default_roles()
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
app.include_router(websockets.router) # <--- ESSA LINHA FAZ O SININHO FUNCIONAR