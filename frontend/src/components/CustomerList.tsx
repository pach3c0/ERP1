import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Search, Trash2, MoreVertical, CheckSquare, Square, DollarSign, Briefcase } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  document: string;
  email: string;
  city: string;
  state: string;
  phone: string;
  status: string; // AGORA STRING
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const userRole = localStorage.getItem('role') || 'visitante';
  const canDelete = ['admin', 'manager'].includes(userRole);

  const loadCustomers = async () => {
    try { const { data } = await api.get('/customers/'); setCustomers(data); } catch { console.error('Error loading customers'); }
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleDeleteSelected = async () => {
    if (!confirm(`Excluir ${selectedIds.length} clientes selecionados?`)) return;
    try {
        await Promise.all(selectedIds.map(id => api.delete(`/customers/${id}`)));
        setSelectedIds([]);
        loadCustomers();
    } catch (e) { alert("Erro ao excluir alguns itens."); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(c => c.id));
  };

  // Helper para cor do status
  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ativo': return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Ativo</span>;
        case 'inativo': return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Inativo</span>;
        case 'pendente': return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Pendente</span>;
        default: return null;
    }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.document.includes(searchTerm));

  return (
    <div className="max-w-7xl mx-auto" onClick={() => setOpenMenuId(null)}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes e Fornecedores</h1>
        <div className="flex gap-3">
            {selectedIds.length > 0 && canDelete && (
                <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-md font-medium hover:bg-red-200 transition">
                    <Trash2 size={18} /> Excluir ({selectedIds.length})
                </button>
            )}
            <button onClick={() => navigate('/customers/new')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition shadow-sm">
                <Plus size={20} /> Incluir cadastro
            </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
            <div className="relative flex-1 max-w-md">
                <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500"/>
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
        </div>

        <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-800 text-white text-sm uppercase font-semibold">
                        <th className="p-4 w-10"><button onClick={toggleAll} className="hover:text-gray-300">{selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={18} /> : <Square size={18} />}</button></th>
                        <th className="p-4">Nome / Razão Social</th>
                        <th className="p-4">CPF / CNPJ</th>
                        <th className="p-4">Cidade/UF</th>
                        <th className="p-4">Telefone</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                    {filtered.map(c => (
                        <tr key={c.id} className={`hover:bg-blue-50 transition cursor-pointer ${selectedIds.includes(c.id) ? 'bg-blue-50' : ''}`}>
                            <td className="p-4" onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                                <div className={`cursor-pointer ${selectedIds.includes(c.id) ? 'text-blue-600' : 'text-gray-300'}`}>{selectedIds.includes(c.id) ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                            </td>
                            <td className="p-4 font-medium" onClick={() => navigate(`/customers/${c.id}`)}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={c.status === 'inativo' ? 'line-through text-gray-400' : 'text-blue-600 hover:underline'}>{c.name}</span>
                                        {getStatusBadge(c.status)}
                                    </div>
                                    <span className="text-xs text-gray-400">{c.email}</span>
                                </div>
                            </td>
                            <td className="p-4 text-gray-500 font-mono" onClick={() => navigate(`/customers/${c.id}`)}>{c.document}</td>
                            <td className="p-4" onClick={() => navigate(`/customers/${c.id}`)}>{c.city} - {c.state}</td>
                            <td className="p-4" onClick={() => navigate(`/customers/${c.id}`)}>{c.phone}</td>
                            
                            <td className="p-4 text-right relative">
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><MoreVertical size={18} /></button>
                                {openMenuId === c.id && (
                                    <div className="absolute right-8 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <div className="p-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">Ações</div>
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/financial/${c.id}`); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"><DollarSign size={16}/> Ficha Financeira</button>
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/crm/${c.id}`); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"><Briefcase size={16}/> CRM</button>
                                    </div>
                                )}
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