import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  ArrowLeft, Search, User, Building2,
  RotateCcw, Trash2, AlertTriangle, History
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  document: string;
  city: string;
  state: string;
  phone: string;
  salesperson_id: number;
  status: string;
  person_type: 'fisica' | 'juridica';
  created_at: string;
}

interface SystemUser {
  id: number;
  name: string;
}

export default function TrashView() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('role')?.toLowerCase() || 'visitante';
  const [auditCustomerId, setAuditCustomerId] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [trashRes, usersRes] = await Promise.all([
        api.get('/customers/trash'),
        api.get('/users/')
      ]);
      setCustomers(trashRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados da lixeira", error);
    } finally {
      setLoading(false);
    }
  };

  const getSalespersonName = (id: number) => {
    return users.find(u => u.id === id)?.name || 'N/A';
  };

  const handleViewAudit = async (customerId: number) => {
    setAuditLoading(true);
    try {
      const response = await api.get(`/audit/customer/${customerId}`);
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Erro ao carregar auditoria', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRestore = async (customerId: number, customerName: string) => {
    if (!confirm(`Tem certeza que deseja restaurar o cliente "${customerName}"?`)) return;

    try {
      await api.put(`/customers/${customerId}/restore`);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      alert('Cliente restaurado com sucesso!');
    } catch (error) {
      console.error('Erro ao restaurar cliente', error);
      alert('Erro ao restaurar cliente');
    }
  };

  const handleHardDelete = async (customerId: number, customerName: string) => {
    if (!confirm(`ATENÇÃO: Esta ação não pode ser desfeita!\n\nTem certeza que deseja EXCLUIR DEFINITIVAMENTE o cliente "${customerName}"?\n\nTodos os dados serão perdidos permanentemente.`)) return;

    try {
      await api.delete(`/customers/${customerId}/hard`);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      alert('Cliente excluído definitivamente!');
    } catch (error) {
      console.error('Erro ao excluir cliente definitivamente', error);
      alert('Erro ao excluir cliente definitivamente');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={24} className="text-orange-500" />
            Lixeira de Cadastros
          </h1>
          <p className="text-gray-500 text-sm">Clientes excluídos - Restaure ou exclua definitivamente</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-800">Atenção</h3>
            <p className="text-sm text-orange-700 mt-1">
              Os clientes nesta lista foram excluídos do sistema. Você pode restaurá-los para uso normal ou
              excluí-los definitivamente. A exclusão definitiva remove permanentemente todos os dados e não pode ser desfeita.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou documento..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                <th className="px-6 py-4">Cidade/UF</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Excluído em</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                  {customers.length === 0 ? 'Nenhum cliente na lixeira' : 'Nenhum cliente encontrado'}
                </td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                        {customer.person_type === 'fisica' ? <User size={16} /> : <Building2 size={16} />}
                      </div>
                      <span className="font-medium text-gray-700">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{customer.document}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{customer.city}/{customer.state}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getSalespersonName(customer.salesperson_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(customer.created_at)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setAuditCustomerId(customer.id);
                              handleViewAudit(customer.id);
                            }}
                            className="p-2 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-full transition"
                            title="Ver auditoria"
                          >
                            <History size={18} />
                          </button>
                          <button
                            onClick={() => handleRestore(customer.id, customer.name)}
                            className="p-2 hover:bg-green-50 text-green-600 hover:text-green-700 rounded-full transition"
                            title="Restaurar cliente"
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button
                            onClick={() => handleHardDelete(customer.id, customer.name)}
                            className="p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-full transition"
                            title="Excluir definitivamente"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AUDITORIA */}
      {auditCustomerId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <History size={24} className="text-blue-600" />
                Histórico de Auditoria
              </h2>
              <button
                onClick={() => {
                  setAuditCustomerId(null);
                  setAuditLogs([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {auditLoading ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Nenhum registro de auditoria encontrado</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                          log.action === 'SOFT_DELETE' ? 'bg-red-500' :
                          log.action === 'RESTORE' ? 'bg-green-500' :
                          log.action === 'HARD_DELETE' ? 'bg-red-700' :
                          'bg-gray-500'
                        }`}>
                          {log.action}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700"><strong>Usuário:</strong> {log.user_name || 'Sistema'}</p>
                    {log.changes && (
                      <div className="text-sm text-gray-600 mt-2">
                        <strong>Alterações:</strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAuditCustomerId(null);
                  setAuditLogs([]);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}