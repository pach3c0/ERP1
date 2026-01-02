from sqlmodel import SQLModel, create_engine, Session
import os

# --- IMPORTANTE: Importar os modelos aqui ---
from models import User, Customer 

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    # O SQLModel lê todos os modelos importados acima e cria as tabelas
    SQLModel.metadata.create_all(engine)