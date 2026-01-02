from sqlmodel import Session
from models import User, FeedItem, AuditLog
from typing import Any, Dict

def log_activity(session: Session, user: User, content: str, icon: str = "activity", customer_id: int = None, visibility: str = "public"):
    feed = FeedItem(
        content=content, 
        icon=icon, 
        user_id=user.id, 
        related_customer_id=customer_id, 
        visibility=visibility
    )
    session.add(feed)

def register_audit(session: Session, user: User, obj: Any, new_data: Dict, table_name: str, action: str = "UPDATE"):
    """
    Compara o objeto atual (obj) com os novos dados (new_data)
    e salva apenas as diferenças na tabela AuditLog.
    """
    changes = {}
    
    if action == "UPDATE":
        # Itera sobre os campos novos
        for key, new_value in new_data.items():
            # Pega valor antigo
            if hasattr(obj, key):
                old_value = getattr(obj, key)
                
                # Se forem diferentes, registra
                if old_value != new_value:
                    changes[key] = {
                        "old": str(old_value), # Converte pra string pra salvar no JSON
                        "new": str(new_value)
                    }
    
    elif action == "DELETE":
        changes = {"deleted": True}
        
    elif action == "CREATE":
        changes = {"created": True}

    # Só salva se houve mudança ou se é create/delete
    if changes:
        audit = AuditLog(
            table_name=table_name,
            record_id=obj.id if hasattr(obj, 'id') else 0,
            action=action,
            user_id=user.id,
            changes=changes
        )
        session.add(audit)