from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Mapeia ID do Usuário -> Lista de Conexões Ativas
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"🔌 WS: Usuário {user_id} CONECTADO. Total de conexões ativas: {sum(len(v) for v in self.active_connections.values())}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"🔌 WS: Usuário {user_id} DESCONECTADO.")

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            print(f"🔔 WS: Enviando notificação para Usuário {user_id}...")
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"❌ WS: Erro ao enviar: {e}")
        else:
            print(f"⚠️ WS: Usuário {user_id} offline. Mensagem não entregue via socket.")

manager = ConnectionManager()