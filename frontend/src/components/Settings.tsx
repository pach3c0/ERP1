import { useEffect, useState } from 'react';
import api from '../api';
import { Shield, Save, CheckCircle, XCircle, Info } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: {
    customer_change_status?: boolean;
    customer_require_approval?: boolean;
    can_edit_own_customers?: boolean;
    can_edit_others_customers?: boolean;
    [key: string]: unknown;
  };
}

export default function Settings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles/');
      setRoles(data);
    } catch (error) {
      console.error("Erro ao carregar cargos", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (roleId: number, permissionKey: string) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permissionKey]: !role.permissions[permissionKey]
          }
        };
      }
      return role;
    }));
  };

  const savePermissions = async (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    try {
      await api.put(`/roles/${roleId}/permissions`, { permissions: role.permissions });
      setMessage({ type: 'success', text: `Permissões de ${role.name} atualizadas!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar permissões.' });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-indigo-600" /> Configurações de Acesso (RBAC)
        </h1>
        <p className="text-gray-500 text-sm">Defina o que cada nível de usuário pode visualizar ou editar no sistema.</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{role.name}</h3>
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{role.slug}</span>
              </div>
              <button 
                onClick={() => savePermissions(role.id)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Save size={16} /> Salvar Alterações
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Permissões de Edição (Novas) */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                <input 
                  type="checkbox" 
                  id={`own-${role.id}`}
                  checked={!!role.permissions.can_edit_own_customers}
                  onChange={() => handlePermissionChange(role.id, 'can_edit_own_customers')}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={`own-${role.id}`} className="cursor-pointer">
                  <span className="block text-sm font-bold text-gray-700">Editar dados da própria carteira</span>
                  <span className="text-xs text-gray-500">Permite ao vendedor alterar dados de clientes que ele cadastrou.</span>
                </label>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                <input 
                  type="checkbox" 
                  id={`others-${role.id}`}
                  checked={!!role.permissions.can_edit_others_customers}
                  onChange={() => handlePermissionChange(role.id, 'can_edit_others_customers')}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={`others-${role.id}`} className="cursor-pointer">
                  <span className="block text-sm font-bold text-gray-700">Editar dados de outras carteiras</span>
                  <span className="text-xs text-gray-500">Permite alterar dados de clientes vinculados a outros vendedores.</span>
                </label>
              </div>

              {/* Permissões Existentes */}
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                <input 
                  type="checkbox" 
                  id={`status-${role.id}`}
                  checked={!!role.permissions.customer_change_status}
                  onChange={() => handlePermissionChange(role.id, 'customer_change_status')}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={`status-${role.id}`} className="cursor-pointer">
                  <span className="block text-sm font-bold text-gray-700">Alterar Status do Cliente</span>
                  <span className="text-xs text-gray-500">Habilita a mudança de 'Pendente' para 'Ativo' ou 'Inativo'.</span>
                </label>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                <input 
                  type="checkbox" 
                  id={`approval-${role.id}`}
                  checked={!!role.permissions.customer_require_approval}
                  onChange={() => handlePermissionChange(role.id, 'customer_require_approval')}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor={`approval-${role.id}`} className="cursor-pointer">
                  <span className="block text-sm font-bold text-gray-700">Novos Cadastros exigem aprovação</span>
                  <span className="text-xs text-gray-500">O cliente entra como 'Pendente' até um supervisor aprovar.</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="text-blue-500 shrink-0" size={20} />
        <p className="text-sm text-blue-700">
          <strong>Dica:</strong> Administradores têm permissão total por padrão, independente destas marcações no banco de dados.
        </p>
      </div>
    </div>
  );
}