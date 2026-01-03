import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  Plus, Search, User, Building2, MapPin, Phone, 
  UserCheck, MoreVertical, Filter
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
}

interface SystemUser {
  id: number;
  name: string;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [custRes, usersRes] = await Promise.all([
        api.get('/customers/'),
        api.get('/users/')
      ]);
      setCustomers(custRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const getSalespersonName = (id: number) => {
    return users.find(u => u.id === id)?.name || 'N/A';
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ativo: 'bg-green-100 text-green-700 border-green-200',
      pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      inativo: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.inativo}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes e Fornecedores</h1>
          <p className="text-gray-500 text-sm">Gerencie todos os parceiros de negócio em um só lugar.</p>
        </div>
        <button 
          onClick={() => navigate('/customers/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={20} /> Novo Cadastro
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou documento..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-white transition text-gray-600">
            <Filter size={18} /> Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Nome / Razão Social</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                <th className="px-6 py-4">Cidade/UF</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando parceiros...</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        {customer.person_type === 'fisica' ? <User size={16} /> : <Building2 size={16} />}
                      </div>
                      <span className="font-medium text-gray-700">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{customer.document}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      {customer.city}/{customer.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    <div className="flex items-center gap-1">
                      <Phone size={14} className="text-gray-400" />
                      {customer.phone || 'N/D'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <UserCheck size={14} className="text-indigo-400" />
                      {getSalespersonName(customer.salesperson_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(customer.status)}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 hover:bg-gray-200 rounded-full transition text-gray-400">
                      <MoreVertical size={18} />
                    </button>
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