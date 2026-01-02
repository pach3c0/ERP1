from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from jose import JWTError, jwt
from database import get_session
from models import User
import security

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError: raise credentials_exception
        
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None: raise credentials_exception
    return user

def get_user_role_slug(user: User, session: Session) -> str:
    if not user.role_id: return "user"
    
    # --- O SEGREDO ESTÁ AQUI EMBAIXO ---
    # O import tem que ser DENTRO da função para não travar o sistema
    from models import Role 
    
    role = session.get(Role, user.role_id)
    return role.slug if role else "user"