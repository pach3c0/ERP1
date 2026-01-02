import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Search, Trash2, Edit } from 'lucide-react';

interface Role { name: string; slug: string; }
interface UserData {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role_name?: string; // Vamos popular manualmente
}

export default function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users/'),
        api.get('/roles/')
      ]);
      
      const rolesMap = new Map(rolesRes.data.map((r: any) => [r.id, r]));
      
      // Enriquece o usuário com o nome do cargo
      const enrichedUsers = usersRes.data.map((u: any) => ({
          ...u,
          role_name: (rolesMap.get(u.role_id) as Role)?.name || 'Sem Cargo',
          role_slug: (rolesMap.get(u.role_id) as Role)?.slug || ''
      }));
      
      setUsers(enrichedUsers);
    } catch (error) { console.error("Erro ao carregar"); }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza? O usuário perderá o acesso.")) {
      try { await api.delete(`/users/${id}`); loadData(); } 
      catch (error: any) { alert(error.response?.data?.detail || "Erro ao excluir"); }
    }
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.includes(searchTerm));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Equipe</h1>
        <button onClick={() => navigate('/users/new')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition shadow-sm">
            <Plus size={20} /> Incluir usuário
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
            <div className="relative flex-1 max-w-md">
                <input type="text" placeholder="Pesquisar por nome ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500"/>
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-800 text-white text-sm uppercase font-semibold">
                        <th className="p-4">Usuário</th>
                        <th className="p-4">E-mail</th>
                        <th className="p-4">Cargo</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {filtered.map(user => (
                        <tr key={user.id} className="hover:bg-blue-50 transition">
                            <td className="p-4 font-medium flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                {user.name}
                            </td>
                            <td className="p-4 text-gray-500">{user.email}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role_name === 'Super Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {user.role_name}
                                </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => navigate(`/users/${user.id}`)} className="p-2 text-blue-600 hover:bg-blue-100 rounded transition" title="Editar"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded transition" title="Excluir"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}