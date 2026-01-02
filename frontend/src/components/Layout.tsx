import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, Wrench, LogOut, FolderPlus, ChevronDown, ChevronRight, Shield, UserCircle, UserCog, Settings 
} from 'lucide-react';

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const location = useLocation();
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(true);
  const isCadastroActive = ['/customers', '/products', '/services', '/users'].includes(location.pathname);

  // LÊ DADOS DO USUÁRIO
  const userRole = localStorage.getItem('role') || 'visitante';
  const userName = localStorage.getItem('user_name') || 'Usuário';
  const userEmail = localStorage.getItem('user_email') || '...';
  
  const roleNames: Record<string, string> = { 'admin': 'Super Admin', 'manager': 'Gerente', 'sales': 'Vendedor', 'user': 'Usuário' };
  const displayRole = roleNames[userRole] || userRole;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        
        {/* HEADER DA SIDEBAR */}
        <div className="h-auto py-6 flex flex-col justify-center px-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">E</div>
             <span className="font-bold text-gray-800 text-lg tracking-tight">ERP Agent</span>
          </div>
          
          {/* Dados do Usuário */}
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
                  <Users size={18} /> Parceiros (Cli/Forn)
                </Link>
                {userRole === 'admin' && (
                  <Link to="/users" className={`flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm transition-colors ${location.pathname === '/users' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <UserCog size={18} /> Usuários
                  </Link>
                )}
                <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-300 cursor-not-allowed"><Package size={18} /> Produtos</div>
                <div className="flex items-center gap-3 px-4 py-2 pl-12 rounded-lg text-sm text-gray-300 cursor-not-allowed"><Wrench size={18} /> Serviços</div>
              </div>
            )}
          </div>

          {/* Configurações (Só Admin) */}
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

      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}