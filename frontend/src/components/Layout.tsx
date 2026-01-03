import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  LayoutDashboard, Users, LogOut, FolderPlus, 
  ChevronDown, ChevronRight, Shield, UserCircle, UserCog, Settings, Bell 
} from 'lucide-react';

interface LayoutProps {
  onLogout: () => void;
}

interface NotificationItem {
  id: number;
  content: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

export default function Layout({ onLogout }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(true);
  const isCadastroActive = ['/customers', '/products', '/services', '/users'].includes(location.pathname);

  // --- DADOS DO USUÁRIO ---
  const userRole = localStorage.getItem('role') || 'visitante';
  const userName = localStorage.getItem('user_name') || 'Usuário';
  const userEmail = localStorage.getItem('user_email') || '...';
  const token = localStorage.getItem('token');
  
  const roleNames: Record<string, string> = { 'admin': 'Super Admin', 'manager': 'Gerente', 'sales': 'Vendedor', 'user': 'Usuário' };
  const displayRole = roleNames[userRole] || userRole;

  // --- LÓGICA DE NOTIFICAÇÕES (WEBSOCKET ROBUSTO) ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  // Referência para manter a conexão WebSocket persistente entre renderizações
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Busca notificações antigas (Histórico via API REST)
    const fetchNotifs = async () => {
        try { 
            const { data } = await api.get('/notifications/'); 
            setNotifications(data); 
        } catch(e) { 
            console.error("Erro ao buscar notificações antigas:", e); 
        }
    };
    fetchNotifs();

    // 2. Conecta WebSocket para Tempo Real
    if (token) {
        const connectWs = () => {
            // Evita criar múltiplas conexões se já existir uma aberta
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                console.log("🔵 WS: Conexão já existe e está ativa.");
                return;
            }
            
            // Fecha conexão anterior se estiver em estado inconsistente
            if (ws.current) ws.current.close();

            const wsUrl = `ws://localhost:8000/ws?token=${token}`;
            console.log("🔵 WS: Iniciando conexão em", wsUrl);
            
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("🟢 WS: Conexão Estabelecida com Sucesso!");
            };
            
            ws.current.onmessage = (event: MessageEvent) => {
                // Log "fofoqueiro" para vermos o que chega do backend
                console.log("📨 WS Recebeu Dados:", event.data);
                
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'notification') {
                        // Cria objeto de notificação para a UI
                        const newNotif: NotificationItem = {
                            id: Date.now(), // ID temporário para o React renderizar imediatamente
                            content: data.content,
                            link: data.link,
                            is_read: false,
                            created_at: new Date().toISOString()
                        };
                        
                        // Atualiza estado do Sininho
                        setNotifications((prev) => [newNotif, ...prev]);
                        
                        // IMPORTANTE: Dispara evento global para outros componentes (ex: Chat)
                        // Isso permite que o CustomerForm.tsx saiba que chegou mensagem nova
                        console.log("📣 WS: Disparando evento global 'erp-notification'");
                        const customEvent = new CustomEvent('erp-notification', { detail: data });
                        window.dispatchEvent(customEvent);
                    }
                } catch (err) {
                    console.error("❌ WS: Erro ao processar mensagem JSON", err);
                }
            };

            ws.current.onerror = (error) => {
                console.error("❌ WS Erro na conexão:", error);
            };

            ws.current.onclose = (e) => {
                // Lógica de Reconexão Automática (Heartbeat)
                console.log(`🔴 WS Desconectado (Código: ${e.code}). Tentando reconectar em 3s...`);
                setTimeout(() => connectWs(), 3000);
            };
        };
        
        // Inicia a conexão
        connectWs();
    }

    // Cleanup: Fecha a conexão ao desmontar o componente (logout/sair da app)
    return () => {
        if (ws.current) {
            console.log("Saindo do Layout... Fechando WS.");
            ws.current.close();
            ws.current = null;
        }
    };
  }, [token]);

  // Marca notificação como lida ao clicar
  const handleReadNotification = async (notif: NotificationItem) => {
      // Se for ID temporário (timestamp), não tenta marcar no backend pois não existe lá ainda com esse ID
      // IDs reais do banco são pequenos (inteiros), timestamps são enormes.
      if (notif.id < 1000000000000) { 
          try { await api.post(`/notifications/${notif.id}/read`); } catch (error) { console.error('Erro ao marcar notificação como lida:', error); }
      }
      
      // Remove da lista visual
      setNotifications((prev: NotificationItem[]) => prev.filter((n: NotificationItem) => n.content !== notif.content));
      setShowNotifMenu(false);
      navigate(notif.link);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-20">
        <div className="h-auto py-6 flex flex-col justify-center px-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">E</div>
             <span className="font-bold text-gray-800 text-lg tracking-tight">ERP Agent</span>
          </div>
          <div className="mt-2">
             <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                {userRole === 'admin' ? <Shield size={12} className="text-blue-600"/> : <UserCircle size={12}/>}
                <span className="uppercase tracking-wide font-semibold text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">{displayRole}</span>
             </div>
             <p className="text-sm font-bold text-gray-800 truncate" title={userName}>{userName}</p>
             <p className="text-xs text-gray-400 truncate" title={userEmail}>{userEmail}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          <div className="mt-4">
            <button onClick={() => setIsCadastrosOpen(!isCadastrosOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isCadastroActive ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600 hover:bg-gray-50'}`}>
              <div className="flex items-center gap-3"><FolderPlus size={20} /> <span>Cadastros</span></div>
              {isCadastrosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isCadastrosOpen && (
              <div className="mt-1 space-y-1">
                <Link to="/customers" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname.includes('/customers') ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Users size={18} /> Parceiros
                </Link>
                {userRole === 'admin' && (
                  <Link to="/users" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname === '/users' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <UserCog size={18} /> Usuários
                  </Link>
                )}
              </div>
            )}
          </div>

          {userRole === 'admin' && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                 <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sistema</p>
                 <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Settings size={20} /> Configurações
                 </Link>
              </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"><LogOut size={20} /> Sair</button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col bg-gray-50 min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 shadow-sm z-10">
            <div className="relative">
                <button 
                    onClick={() => setShowNotifMenu(!showNotifMenu)} 
                    className={`p-2 rounded-full transition relative ${notifications.length > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Bell size={20} />
                    {notifications.length > 0 && (
                        <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {showNotifMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)}></div>
                        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm flex justify-between">
                                <span>Notificações</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{notifications.length}</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="p-6 text-xs text-gray-400 text-center">Nenhuma notificação nova.</p>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} onClick={() => handleReadNotification(n)} className="p-4 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition">
                                            <p className="text-sm text-gray-800 leading-snug">{n.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
}