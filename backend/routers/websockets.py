from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from sqlmodel import Session, select
from models import User
from connection_manager import manager
from database import engine
import security

router = APIRouter(tags=["Real-time"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # 1. Validação do Token (Manual)
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("❌ WS: Token inválido (sem email)")
            await websocket.close(code=4003)
            return
    except JWTError as e:
        print(f"❌ WS: Erro ao decodificar token: {e}")
        await websocket.close(code=4003)
        return

    # 2. Identificar o Usuário no Banco
    # Abre uma sessão manual rápida apenas para ler o ID
    user_id = None
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user_id = user.id
    
    if not user_id:
        print("❌ WS: Usuário não encontrado no banco")
        await websocket.close(code=4003)
        return

    # 3. Conectar
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Mantém a conexão viva esperando mensagens (pings)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"❌ WS: Erro inesperado: {e}")
        manager.disconnect(websocket, user_id)