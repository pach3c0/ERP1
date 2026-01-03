from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from database import get_session
from models import AuditLog, User
from dependencies import get_current_user
from schemas import AuditLogRead

router = APIRouter(prefix="/audit", tags=["Auditoria"])

@router.get("/customer/{customer_id}", response_model=List[AuditLogRead])
def get_customer_audit_logs(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    # Only admin can view audit logs
    if current_user.role.slug != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    statement = select(AuditLog, User.name).join(User, AuditLog.user_id == User.id).where(
        AuditLog.table_name == "customer",
        AuditLog.record_id == customer_id
    ).order_by(AuditLog.created_at.desc())
    
    results = session.exec(statement).all()
    
    # Map to AuditLogRead with user_name
    audit_logs = []
    for audit, user_name in results:
        audit_logs.append(AuditLogRead(
            id=audit.id,
            table_name=audit.table_name,
            action=audit.action,
            user_id=audit.user_id,
            user_name=user_name,
            changes=audit.changes,
            created_at=audit.created_at
        ))
    
    return audit_logs