import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import {
  LayoutDashboard, Users, LogOut, FolderPlus,
  ChevronDown, ChevronRight, UserCog, Settings, Bell,
  Briefcase
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
  const audioRef = useRef<HTMLAudioElement>(null); // Ref para o elemento de áudio
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(true);
  const isCadastroActive = ['/customers', '/products', '/services', '/users'].includes(location.pathname);

  // --- DADOS DO USUÁRIO ---
  const userRole = localStorage.getItem('role') || 'visitante';
  const userName = localStorage.getItem('user_name') || 'Usuário';
  const userEmail = localStorage.getItem('user_email') || '...';
  const token = localStorage.getItem('token');
  
  const roleNames: Record<string, string> = { 
    'admin': 'Super Admin', 
    'manager': 'Gerente', 
    'sales': 'Vendedor', 
    'user': 'Usuário' 
  };
  const displayRole = roleNames[userRole] || userRole;

  // --- LÓGICA DE NOTIFICAÇÕES (WEBSOCKET ROBUSTO PRESERVADA) ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchNotifs = async () => {
        try { 
            const { data } = await api.get('/notifications/'); 
            setNotifications(data); 
        } catch(e) { 
            console.error("Erro ao buscar notificações antigas:", e); 
        }
    };
    fetchNotifs();

    if (token) {
        const connectWs = () => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                return;
            }
            if (ws.current) ws.current.close();

            const wsUrl = `ws://localhost:8000/ws?token=${token}`;
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("🟢 WS: Conexão Estabelecida!");
            };
            
            ws.current.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WS: Mensagem recebida:', data);
                    if (data.type === 'notification') {
                        console.log('🔔 WS: Nova notificação recebida:', data.content);
                        const newNotif: NotificationItem = {
                            id: Date.now(),
                            content: data.content,
                            link: data.link,
                            is_read: false,
                            created_at: new Date().toISOString()
                        };
                        setNotifications((prev) => [newNotif, ...prev]);
                        const customEvent = new CustomEvent('erp-notification', { detail: data });
                        window.dispatchEvent(customEvent);

                        // Reproduzir som de notificação
                        console.log('🔊 Tentando reproduzir som...');
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0; // Reiniciar o áudio
                            audioRef.current.play()
                                .then(() => console.log('✅ Som reproduzido com sucesso'))
                                .catch(err => console.log('❌ Erro ao reproduzir som:', err));
                        } else {
                            console.log('❌ audioRef.current é null');
                        }
                    } else if (data.type === 'feed_update') {
                        console.log('📢 WS: Feed update recebido, disparando evento:', data);
                        const customEvent = new CustomEvent('erp-notification', { detail: data });
                        window.dispatchEvent(customEvent);
                    }
                } catch (err) {
                    console.error("❌ WS: Erro ao processar mensagem JSON", err);
                }
            };

            ws.current.onclose = () => {
                setTimeout(() => connectWs(), 3000);
            };
        };
        connectWs();
    }

    return () => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
    };
  }, [token]);

  const handleReadNotification = async (notif: NotificationItem) => {
      if (notif.id < 1000000000000) { 
          try { await api.post(`/notifications/${notif.id}/read`); } catch (error) { console.error('Erro:', error); }
      }
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
             {/* AJUSTE: Cargo em local separado com estilo de Badge técnico */}
             <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <span className="uppercase tracking-wide font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded text-blue-600 border border-blue-100 flex items-center gap-1">
                   <Briefcase size={10} />
                   {displayRole}
                </span>
             </div>
             {/* AJUSTE: Apenas Nome e Sobrenome em destaque principal */}
             <p className="text-sm font-bold text-gray-900 truncate" title={userName}>{userName}</p>
             <p className="text-xs text-gray-400 truncate" title={userEmail}>{userEmail}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} /> Home
          </Link>

          <Link to="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
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
                
                <Link to="/products" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname === '/products' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Briefcase size={18} /> Produtos
                </Link>

                <Link to="/services" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname === '/services' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Briefcase size={18} /> Serviços
                </Link>

                <Link to="/quotes" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname.includes('/quotes') ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Briefcase size={18} /> Orçamentos
                </Link>
                
                {/* Novos Itens - Em Desenvolvimento */}
                <div className="opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-400">
                    <Users size={18} /> Fornecedores
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
                  </div>
                </div>
                
                <div className="opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-400">
                    <Users size={18} /> Funcionários
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
                  </div>
                </div>
                
                <div className="opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-400">
                    <Users size={18} /> Contas Financeiras
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
                  </div>
                </div>
                
                <div className="opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-400">
                    <Users size={18} /> Categorias Financeiras
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
                  </div>
                </div>
                
                <div className="opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-400">
                    <Users size={18} /> Formas de pagamento
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VENDAS / SERVIÇOS */}
          <div className="opacity-50">
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
              <div className="flex items-center gap-3"><FolderPlus size={20} /> <span>Serviços</span></div>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
            </div>
          </div>

          {/* FINANCEIRO */}
          <div className="opacity-50">
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed">
              <div className="flex items-center gap-3"><FolderPlus size={20} /> <span>Financeiro</span></div>
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">Em breve</span>
            </div>
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
        {/* Elemento de áudio para notificações */}
        <audio ref={audioRef} src="/notification.mp3" preload="auto" />

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