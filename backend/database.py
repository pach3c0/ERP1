from sqlmodel import SQLModel, create_engine, Session
import os

# --- ATENÇÃO: Adicionei ', Role' aqui ---
from models import User, Customer, Role

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    # Agora ele vai criar Users, Customers e Roles
    SQLModel.metadata.create_all(engine)