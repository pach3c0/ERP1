import { useEffect, useState } from 'react';
import api from '../api';
import { Settings as SettingsIcon, Save, Shield, Users } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: {
    customer_change_status?: boolean;
    customer_require_approval?: boolean;
  };
}

export default function Settings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    try { const { data } = await api.get('/roles/'); setRoles(data); } 
    catch (e) { console.error("Erro ao carregar"); }
  };

  const handlePermissionChange = (roleIndex: number, key: string, value: boolean) => {
    const newRoles = [...roles];
    newRoles[roleIndex].permissions = { ...newRoles[roleIndex].permissions, [key]: value };
    setRoles(newRoles);
  };

  const handleSave = async () => {
    setLoading(true); setMsg({ text: '', type: '' });
    try {
      await Promise.all(roles.map(role => api.put(`/roles/${role.id}`, { permissions: role.permissions })));
      setMsg({ text: 'Configurações salvas!', type: 'success' });
    } catch (e) { setMsg({ text: 'Erro ao salvar.', type: 'error' }); } 
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gray-800 text-white rounded-lg shadow-md"><SettingsIcon size={24} /></div>
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Permissões de Acesso</h1>
            <p className="text-gray-500">Defina o que cada perfil pode fazer em cada módulo.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Shield size={18}/> Perfis do Sistema</h3>
            <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                {loading ? 'Salvando...' : <><Save size={16}/> Salvar Alterações</>}
            </button>
        </div>

        {msg.text && <div className={`p-4 text-sm font-medium text-center ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg.text}</div>}

        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roles.map((role, index) => (
                    <div key={role.id} className="border border-gray-200 rounded-xl p-0 overflow-hidden hover:border-blue-300 transition flex flex-col">
                        
                        {/* Header do Card */}
                        <div className="bg-gray-50 p-4 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800">{role.name}</span>
                                <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded uppercase">{role.slug}</span>
                            </div>
                        </div>
                        
                        {/* Corpo do Card */}
                        <div className="p-4 space-y-6 flex-1">
                            
                            {/* MÓDULO CLIENTES */}
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-1"><Users size={12}/> Módulo Clientes</h4>
                                <div className="space-y-3">
                                    {/* Opção 1: Alterar Status */}
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            checked={role.permissions.customer_change_status || false}
                                            onChange={(e) => handlePermissionChange(index, 'customer_change_status', e.target.checked)}
                                            disabled={role.slug === 'admin'}
                                        />
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-700">Alterar Status</span>
                                            <p className="text-xs text-gray-400">Ativar ou inativar clientes manualmente.</p>
                                        </div>
                                    </label>

                                    {/* Opção 2: Exigir Aprovação (Lógica Inversa no texto para facilitar entendimento) */}
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            checked={role.permissions.customer_require_approval || false}
                                            onChange={(e) => handlePermissionChange(index, 'customer_require_approval', e.target.checked)}
                                            disabled={role.slug === 'admin'}
                                        />
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-700">Aguardar Aprovação</span>
                                            <p className="text-xs text-gray-400">Novos cadastros ficam "Pendentes" até aprovação.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Outros Módulos virão aqui... */}

                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}