from fastapi import APIRouter, Depends
from sqlmodel import Session, select, or_
from typing import List, Optional
from datetime import datetime

from database import get_session
from models import User, Customer, FeedItem, Notification, CustomerNote
from schemas import FeedRead, FeedCreate, NotificationRead
from dependencies import get_current_user, get_user_role_slug
from utils import log_activity
from connection_manager import manager

router = APIRouter(tags=["Feed e Notificações"])

@router.get("/dashboard/stats")
def get_dashboard_stats(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    query = select(Customer)
    if role_slug == 'sales': query = query.where(Customer.salesperson_id == current_user.id)
    all_customers = session.exec(query).all()
    return {"total": len(all_customers), "pf": len([c for c in all_customers if c.person_type == 'PF']), "pj": len([c for c in all_customers if c.person_type == 'PJ'])}

@router.get("/feed/", response_model=List[FeedRead])
def get_feed(user_id: Optional[int] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    role_slug = get_user_role_slug(current_user, session)
    query = select(FeedItem, User.name).join(User, FeedItem.user_id == User.id).order_by(FeedItem.id.desc())

    if role_slug == 'sales':
        query = query.where(or_(FeedItem.visibility == 'public', FeedItem.user_id == current_user.id))
    
    if user_id: query = query.where(FeedItem.user_id == user_id)
    if start_date: query = query.where(FeedItem.created_at >= start_date)
    if end_date:
        end_date = end_date.replace(hour=23, minute=59, second=59)
        query = query.where(FeedItem.created_at <= end_date)

    query = query.limit(50)
    results = session.exec(query).all()
    
    feed_response = []
    for item, user_name in results:
        feed_response.append(FeedRead(id=item.id, content=item.content, icon=item.icon, created_at=item.created_at, user_name=user_name, visibility=item.visibility))
    return feed_response

@router.post("/feed/", response_model=FeedRead)
async def create_feed_post(feed_data: FeedCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    visibility = "public"
    if "@todos" in feed_data.content: visibility = "public"
    
    # Processar menções
    import re
    mentions = re.findall(r'@(\w+)', feed_data.content)
    if mentions:
        for mention in mentions:
            # Procurar usuário por nome (case insensitive)
            user = session.exec(select(User).where(User.name.ilike(f"%{mention}%"))).first()
            if user and user.id != current_user.id:
                # Criar notificação
                notification = Notification(
                    user_id=user.id,
                    content=f"{current_user.name} mencionou você no feed: {feed_data.content[:100]}{'...' if len(feed_data.content) > 100 else ''}",
                    link=f"/"
                )
                session.add(notification)
                session.commit()  # Commit para obter o ID da notificação
                
                # Enviar via WebSocket
                await manager.send_personal_message({
                    "type": "notification",
                    "content": notification.content,
                    "link": notification.link
                }, user.id)
    
    feed_item = FeedItem(content=feed_data.content, icon="at-sign", user_id=current_user.id, visibility=visibility)
    session.add(feed_item)
    session.commit()
    session.refresh(feed_item)
    
    # Notificar todos os usuários conectados sobre o novo post no feed
    await manager.broadcast({
        "type": "feed_update",
        "action": "new_post",
        "post": {
            "id": feed_item.id,
            "content": feed_item.content,
            "icon": feed_item.icon,
            "created_at": feed_item.created_at.isoformat(),
            "user_name": current_user.name,
            "visibility": visibility
        }
    })
    
    return FeedRead(id=feed_item.id, content=feed_item.content, icon=feed_item.icon, created_at=feed_item.created_at, user_name=current_user.name, visibility=visibility)

@router.get("/notifications/", response_model=List[NotificationRead])
def get_my_notifications(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    return session.exec(select(Notification).where(Notification.user_id == current_user.id).where(Notification.is_read == False).order_by(Notification.id.desc())).all()

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    notif = session.get(Notification, notif_id)
    if notif and notif.user_id == current_user.id:
        notif.is_read = True
        session.add(notif)
        if notif.related_note_id:
            note = session.get(CustomerNote, notif.related_note_id)
            if note and not note.read_at:
                note.read_at = datetime.utcnow()
                session.add(note)
        session.commit()
    return {"ok": True}