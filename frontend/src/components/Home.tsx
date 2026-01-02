import { useEffect, useState } from 'react';
import api from '../api';
import { Users, Building2, User, Activity, Edit, Trash2, MessageSquare, Plus, AtSign, RefreshCw, Send, Filter, X } from 'lucide-react';

interface FeedItem {
  id: number;
  content: string;
  icon: string;
  created_at: string;
  user_name: string;
  visibility: string;
}

interface SystemUser { id: number; name: string; }

export default function Home() {
  const [stats, setStats] = useState({ total: 0, pf: 0, pj: 0 });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Postagem
  const [newPost, setNewPost] = useState('');
  
  // Filtros
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [filterUser, setFilterUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const userRole = localStorage.getItem('role') || 'visitante';
  const isSales = userRole === 'sales';

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  useEffect(() => {
      loadFeed();
  }, [filterUser, startDate, endDate]);

  const loadData = async () => {
    try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
        loadFeed();
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
      try { const { data } = await api.get('/users/'); setUsers(data); } catch(e){}
  };

  const loadFeed = async () => {
      let query = '/feed/?';
      if (filterUser) query += `user_id=${filterUser}&`;
      if (startDate) query += `start_date=${startDate}&`;
      if (endDate) query += `end_date=${endDate}&`;
      
      try { const { data } = await api.get(query); setFeed(data); } catch(e){}
  };

  const handlePost = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newPost.trim()) return;
      try {
          await api.post('/feed/', { content: newPost });
          setNewPost('');
          loadFeed();
      } catch(e) { alert("Erro ao postar."); }
  };

  const clearFilters = () => {
      setFilterUser('');
      setStartDate('');
      setEndDate('');
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'plus': return <Plus size={16} className="text-green-600"/>;
          case 'trash': return <Trash2 size={16} className="text-red-600"/>;
          case 'refresh-cw': return <RefreshCw size={16} className="text-orange-600"/>;
          case 'message-circle': return <MessageSquare size={16} className="text-blue-600"/>;
          case 'at-sign': return <AtSign size={16} className="text-purple-600"/>;
          default: return <Activity size={16} className="text-gray-600"/>;
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna Esquerda: Stats */}
      <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Visão Geral</h1>
            <p className="text-gray-500">
              {isSales ? 'Acompanhe o desempenho da sua carteira.' : 'Visão global dos parceiros cadastrados.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">Total</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.total}</p></div>
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">PF</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.pf}</p></div>
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><User size={20} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">PJ</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.pj}</p></div>
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><Building2 size={20} /></div>
            </div>
          </div>
      </div>

      {/* Coluna Direita: FEED */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
          
          {/* Header Feed */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><Activity size={18}/> Feed de Atividades</h3>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded hover:bg-gray-200 transition ${showFilters ? 'bg-gray-200 text-blue-600' : 'text-gray-500'}`}>
                  <Filter size={16}/>
              </button>
          </div>

          {/* Área de Postagem */}
          <div className="p-4 border-b border-gray-100 bg-white">
              <form onSubmit={handlePost} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Escreva algo no mural..." 
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                  />
                  <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"><Send size={16}/></button>
              </form>
          </div>

          {/* Filtros Expansíveis */}
          {showFilters && (
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3 text-sm animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase">
                      <span>Filtrar por</span>
                      <button onClick={clearFilters} className="text-red-500 hover:underline flex items-center gap-1"><X size={12}/> Limpar</button>
                  </div>
                  <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full p-2 border rounded bg-white">
                      <option value="">Todos os Usuários</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-gray-400">De:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-white"/></div>
                      <div><label className="text-xs text-gray-400">Até:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded bg-white"/></div>
                  </div>
              </div>
          )}

          {/* Lista do Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {feed.length === 0 ? <p className="text-gray-400 text-sm text-center mt-10">Nenhuma atividade encontrada.</p> : feed.map(item => (
                  <div key={item.id} className="flex gap-3 items-start text-sm group">
                      <div className="mt-1 min-w-[24px] h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition">
                          {getIcon(item.icon)}
                      </div>
                      <div>
                          <p className="text-gray-800 leading-snug">
                              <span className="font-semibold">{item.user_name}</span> {item.content.replace(item.user_name, '')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                              {item.visibility === 'admin_manager' && <span className="text-[10px] border border-gray-200 text-gray-400 px-1 rounded">Privado</span>}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}