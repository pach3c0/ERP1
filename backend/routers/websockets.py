from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from sqlmodel import Session, select
from models import User
from connection_manager import manager
from database import engine
import security
import sys # Importante para garantir que os logs aparecem

router = APIRouter(tags=["Real-time"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # 1. Validação do Token (Manual)
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("❌ WS: Token inválido (sem email no payload)", flush=True)
            await websocket.close(code=4003)
            return
    except JWTError as e:
        # O flush=True força a mensagem a aparecer no terminal do Docker imediatamente
        print(f"❌ WS: Erro ao decodificar token: {e}", flush=True)
        await websocket.close(code=4003)
        return

    # 2. Identificar o Usuário no Banco
    user_id = None
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user_id = user.id
    
    if not user_id:
        print(f"❌ WS: Email {email} não encontrado no banco de dados", flush=True)
        await websocket.close(code=4003)
        return

    # 3. Conectar
    # Se chegou aqui, o 'crachá' é válido!
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Mantém a conexão viva esperando mensagens
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"❌ WS: Erro inesperado na conexão: {e}", flush=True)
        manager.disconnect(websocket, user_id)