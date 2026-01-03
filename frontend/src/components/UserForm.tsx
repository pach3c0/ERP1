import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Save, User, Mail, Lock, Shield, Users } from 'lucide-react';

interface Role { id: number; name: string; }
interface SystemUser { id: number; name: string; }
interface UserFromAPI { id: number; name: string; email: string; role_id: number; supervisors?: {id: number}[]; }

export default function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [roles, setRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]); // Para lista de supervisores
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    supervisor_ids: [] as number[]
  });

  const loadMetaData = useCallback(async () => {
    try {
        const [rolesRes, usersRes] = await Promise.all([api.get('/roles/'), api.get('/users/')]);
        setRoles(rolesRes.data);
        setAllUsers(usersRes.data);
    } catch (error) { console.error('Erro ao carregar metadados:', error); }
  }, []);

  const loadUser = useCallback(async () => {
    try {
        // Como o backend GET /users/ retorna lista, vamos filtrar no front (idealmente seria GET /users/:id)
        const { data } = await api.get('/users/');
        const user = data.find((u: UserFromAPI) => u.id === Number(id));
        
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Senha não vem do back por segurança
                role_id: user.role_id,
                // Mapeia os objetos de supervisor para apenas IDs
                supervisor_ids: user.supervisors ? user.supervisors.map((s: {id: number}) => s.id) : []
            });
        }
    } catch (error) { console.error('Erro ao carregar usuário:', error); navigate('/users'); }
  }, [id, navigate]);

  useEffect(() => {
    loadMetaData();
    if (isEditing) loadUser();
  }, [loadMetaData, isEditing, loadUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = { ...formData };
        // Se estiver editando e senha estiver vazia, não manda (backend trata)
        if (isEditing && !payload.password) delete (payload as {password?: string}).password;

        if (isEditing) await api.put(`/users/${id}`, payload);
        else await api.post('/users/', payload);
        
        navigate('/users');
    } catch (error) {
        const err = error as {response?: {data?: {detail?: string}}};
        alert(err.response?.data?.detail || "Erro ao salvar");
    }
  };

  const toggleSupervisor = (supId: number) => {
      setFormData(prev => {
          const exists = prev.supervisor_ids.includes(supId);
          return {
              ...prev,
              supervisor_ids: exists 
                ? prev.supervisor_ids.filter(id => id !== supId) 
                : [...prev.supervisor_ids, supId]
          };
      });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={24} className="text-gray-600"/></button>
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Editar: ${formData.name}` : 'Novo Usuário'}</h1>
        </div>
        <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm">
            <Save size={18} /> Salvar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-8 space-y-8">
            
            {/* Seção 1: Dados de Acesso */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Dados de Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><User size={16}/> Nome Completo</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Mail size={16}/> E-mail de Login</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500" required />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Lock size={16}/> {isEditing ? 'Nova Senha (Deixe em branco para manter)' : 'Senha Inicial'}</label>
                        <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500" required={!isEditing} />
                    </div>
                </div>
            </div>

            {/* Seção 2: Função e Permissões */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Função na Empresa</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Shield size={16}/> Cargo / Perfil</label>
                    <select value={formData.role_id} onChange={e => setFormData({...formData, role_id: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 bg-white" required>
                        <option value="">Selecione...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">O cargo define as permissões básicas (ex: Admin pode tudo, Vendedor tem restrições).</p>
                </div>
            </div>

            {/* Seção 3: Matriz de Supervisão */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Matriz de Supervisão</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Users size={16}/> Quem pode monitorar este usuário?
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allUsers.filter(u => u.id !== Number(id)).map(u => ( // Não mostrar a si mesmo
                            <label key={u.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${formData.supervisor_ids.includes(u.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={formData.supervisor_ids.includes(u.id)}
                                    onChange={() => toggleSupervisor(u.id)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">{u.name}</span>
                            </label>
                        ))}
                        {allUsers.length <= (isEditing ? 1 : 0) && <p className="text-sm text-gray-400 italic">Nenhum outro usuário disponível para ser supervisor.</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        * Usuários selecionados poderão ver a carteira, mensagens e receber notificações deste usuário.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}