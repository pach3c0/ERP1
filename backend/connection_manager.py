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
        
        count = sum(len(v) for v in self.active_connections.values())
        print(f"🟢 WS: Usuário {user_id} CONECTADO. (Total Online: {count}) Users: {list(self.active_connections.keys())}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"🔴 WS: Usuário {user_id} DESCONECTADO.")

    async def send_personal_message(self, message: dict, user_id: int):
        # Log de diagnóstico crucial
        is_online = user_id in self.active_connections
        print(f"🔔 WS Tentativa: Enviar para Usuário {user_id} | Online? {is_online}")

        if is_online:
            # Iterar sobre uma cópia da lista para evitar erros se a conexão cair durante o loop
            connections = self.active_connections[user_id][:]
            for connection in connections:
                try:
                    await connection.send_json(message)
                    print(f"✅ WS: Enviado com sucesso para User {user_id}")
                except Exception as e:
                    print(f"❌ WS: Falha ao enviar para socket específico: {e}")
                    # Opcional: Remover conexão morta
                    # self.disconnect(connection, user_id) 
        else:
            print(f"⚠️ WS: Usuário {user_id} offline. Mensagem não entregue via socket. (Usuários online: {list(self.active_connections.keys())})")

manager = ConnectionManager()