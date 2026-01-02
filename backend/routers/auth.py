from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from database import get_session
from models import User, Role
from schemas import UserCreate, UserRead, Token
from dependencies import get_user_role_slug
import security

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/register", response_model=UserRead)
def register_user(user_input: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == user_input.email)).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    count = len(session.exec(select(User)).all())
    target_slug = "admin" if count == 0 else "sales"
    role = session.exec(select(Role).where(Role.slug == target_slug)).first()
    
    new_user = User(
        name=user_input.name, email=user_input.email,
        password_hash=security.get_password_hash(user_input.password),
        role_id=role.id if role else None, is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    role_slug = get_user_role_slug(user, session)
    token = security.create_access_token({"sub": user.email, "role": role_slug})
    
    return {
        "access_token": token, "token_type": "bearer", 
        "role": role_slug, "name": user.name, "email": user.email
    }