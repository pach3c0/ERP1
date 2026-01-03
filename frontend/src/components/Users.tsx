import { useEffect, useState } from 'react';
import api from '../api';
import { UserPlus, Trash2, Users as UsersIcon } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  slug: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  supervisors?: { id: number; name: string }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    supervisor_ids: [] as number[] // Lista de IDs
  });

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([api.get('/users/'), api.get('/roles/')]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) { console.error("Erro ao carregar:", error); }
  };

  useEffect(() => { loadData(); }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (!formData.role_id) { setMsg({ text: 'Selecione um cargo.', type: 'error' }); return; }

    try {
      await api.post('/users/', formData);
      setMsg({ text: 'Usuário criado com sucesso!', type: 'success' });
      setFormData({ name: '', email: '', password: '', role_id: '', supervisor_ids: [] });
      loadData();
    } catch (error) {
      const err = error as {response?: {data?: {detail?: string}}};
      setMsg({ text: err.response?.data?.detail || 'Erro ao criar', type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza?")) {
      try { await api.delete(`/users/${id}`); loadData(); } 
      catch (error) { const err = error as {response?: {data?: {detail?: string}}}; alert(err.response?.data?.detail || "Erro ao excluir"); }
    }
  };

  const getRoleName = (id: number) => roles.find(r => r.id === id)?.name || 'Sem cargo';

  // Toggle de supervisor no checkbox
  const toggleSupervisor = (id: number) => {
      setFormData(prev => {
          const exists = prev.supervisor_ids.includes(id);
          return {
              ...prev,
              supervisor_ids: exists 
                ? prev.supervisor_ids.filter(x => x !== id) 
                : [...prev.supervisor_ids, id]
          };
      });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestão de Usuários</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UserPlus size={20} /> Novo Usuário
            </h3>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Senha Inicial</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Cargo</label>
                <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
                  <option value="">Selecione...</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </div>

              {/* SELEÇÃO DE SUPERVISORES */}
              <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-1">
                      <UsersIcon size={14}/> Quem pode monitorar este usuário?
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                      {users.length === 0 ? <p className="text-xs text-gray-400">Nenhum outro usuário cadastrado.</p> : 
                        users.map(u => (
                          <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                              <input 
                                type="checkbox" 
                                checked={formData.supervisor_ids.includes(u.id)}
                                onChange={() => toggleSupervisor(u.id)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-gray-700">{u.name}</span>
                          </label>
                      ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Selecione quem terá acesso aos dados deste usuário.</p>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition">Criar Usuário</button>
              {msg.text && <div className={`p-3 text-sm rounded ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg.text}</div>}
            </form>
          </div>
        </div>

        {/* LISTA */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Equipe ({users.length})</h3></div>
            <div className="divide-y divide-gray-100">
              {users.map(user => (
                <div key={user.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getRoleName(user.role_id) === 'Super Admin' ? 'bg-blue-600' : 'bg-gray-400'}`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {/* MOSTRAR SUPERVISORES */}
                      {user.supervisors && user.supervisors.length > 0 && (
                          <div className="flex gap-1 mt-1 text-[10px] text-gray-400">
                              Monitorado por: 
                              {user.supervisors.map(s => (
                                  <span key={s.id} className="bg-gray-100 px-1 rounded">{s.name}</span>
                              ))}
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">{getRoleName(user.role_id)}</span>
                    <button onClick={() => handleDelete(user.id)} className="text-gray-400 hover:text-red-600 transition" title="Excluir Usuário"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}