from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_
from typing import List

from database import get_session
from models import User, Role, UserSupervisor
from schemas import UserRead, UserCreate, RoleRead, RoleUpdate
from dependencies import get_current_user, get_user_role_slug
from utils import log_activity
import security

router = APIRouter(tags=["Usuários e Cargos"])

# --- ROLES (CARGOS) ---

@router.get("/roles/", response_model=List[RoleRead])
def list_roles(session: Session = Depends(get_session)):
    """Lista todos os cargos disponíveis."""
    return session.exec(select(Role)).all()

@router.put("/roles/{role_id}", response_model=RoleRead)
def update_role_general(role_id: int, role_data: RoleUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Rota genérica para atualização de cargo."""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Apenas Admins.")
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    
    role.permissions = role_data.permissions
    session.add(role)
    session.commit()
    session.refresh(role)
    return role

@router.put("/roles/{role_id}/permissions")
def update_role_permissions(role_id: int, role_data: RoleUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """ROTA ESPECÍFICA: Resolve o erro de salvamento do frontend Settings.tsx"""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Apenas Admins podem alterar permissões.")
    
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    
    # Atualiza o campo JSON de permissões
    role.permissions = role_data.permissions
    session.add(role)
    session.commit()
    session.refresh(role)
    return {"ok": True, "permissions": role.permissions}

# --- USERS (USUÁRIOS) ---

@router.get("/users/", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session)):
    """Lista todos os usuários."""
    return session.exec(select(User)).all()

@router.post("/users/", response_model=UserRead)
def create_user_internal(user_input: UserCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Cria um novo usuário e define seus supervisores."""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Apenas Admins.")
    
    if session.exec(select(User).where(User.email == user_input.email)).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    new_user = User(
        name=user_input.name, 
        email=user_input.email,
        password_hash=security.get_password_hash(user_input.password),
        role_id=user_input.role_id, 
        is_active=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Adiciona supervisores se houver IDs fornecidos
    if user_input.supervisor_ids:
        for sup_id in user_input.supervisor_ids:
            if sup_id != new_user.id:
                session.add(UserSupervisor(user_id=new_user.id, supervisor_id=sup_id))
        session.commit()
        session.refresh(new_user)

    log_activity(session, current_user, f"criou o usuário {new_user.name}", "user", visibility="admin_manager")
    return new_user

@router.put("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, user_data: UserCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Atualiza dados do usuário, senha e hierarquia de supervisão."""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Apenas Admins.")
    
    user = session.get(User, user_id)
    if not user: 
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.name = user_data.name
    user.email = user_data.email
    user.role_id = user_data.role_id
    
    if user_data.password and len(user_data.password.strip()) > 0:
        user.password_hash = security.get_password_hash(user_data.password)

    # Atualiza Supervisores (remove antigos e insere novos)
    old_links = session.exec(select(UserSupervisor).where(UserSupervisor.user_id == user.id)).all()
    for link in old_links: 
        session.delete(link)
    
    if user_data.supervisor_ids:
        for sup_id in user_data.supervisor_ids:
            if sup_id != user.id:
                session.add(UserSupervisor(user_id=user.id, supervisor_id=sup_id))

    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Remove um usuário e limpa suas relações de supervisão."""
    if get_user_role_slug(current_user, session) != 'admin':
        raise HTTPException(status_code=403, detail="Apenas Admins.")
    
    user = session.get(User, user_id)
    if not user: 
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Remove dependências na tabela de supervisão (onde ele é subordinado ou supervisor)
    links = session.exec(select(UserSupervisor).where(or_(UserSupervisor.user_id == user_id, UserSupervisor.supervisor_id == user_id))).all()
    for link in links: 
        session.delete(link)
    
    session.delete(user)
    session.commit()
    return {"ok": True}