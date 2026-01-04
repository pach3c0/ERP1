import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  Plus, Search, User, Building2, 
  MoreVertical, Filter, History, UserSearch, Trash2, Printer, CheckCircle2, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const itemsPerPage = 25;
  
  // Seleção em massa
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  
  // Modal de Status
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('ativo');
  const [processingBulk, setProcessingBulk] = useState(false);
  const userRole = localStorage.getItem('role')?.toLowerCase() || 'visitante';
  
  // Permissões
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({
    can_generate_report: false,
    can_change_status: false,
    can_delete_customers: false
  });

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const [custRes, usersRes, rolesRes] = await Promise.all([
        api.get(`/customers/?skip=${skip}&limit=${itemsPerPage}`),
        api.get('/users/'),
        api.get('/roles/')
      ]);
      
      // Buscar permissões do usuário atual
      const myRole = rolesRes.data.find((r: any) => r.slug === userRole);
      if (myRole?.permissions) {
        setUserPermissions({
          can_generate_report: myRole.permissions.can_generate_report === true,
          can_change_status: myRole.permissions.can_change_status === true,
          can_delete_customers: myRole.permissions.can_delete_customers === true
        });
      }
      
      setCustomers(custRes.data.items || custRes.data);
      setTotalCustomers(custRes.data.total || custRes.data.length);
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

  const handleSelectOne = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  // --- RELATÓRIO PDF ---
  const handleBulkReport = () => {
    const doc = new jsPDF();

    // Filtra apenas os clientes selecionados
    const reportData = customers.filter(c => selectedCustomers.includes(c.id));
    
    doc.setFontSize(16);
    doc.text(`Relatório de Clientes (${reportData.length})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["Nome", "Documento", "Cidade/UF", "Vendedor", "Status"];
    const tableRows = reportData.map(c => [
      c.name,
      c.document,
      `${c.city}/${c.state}`,
      getSalespersonName(c.salesperson_id),
      c.status.toUpperCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`clientes_relatorio_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // --- ALTERAÇÃO DE STATUS EM MASSA ---
  const openStatusModal = () => {
    setIsStatusModalOpen(true);
  };

  const confirmBulkStatusChange = async () => {
    if (!targetStatus) return;
    setProcessingBulk(true);

    try {
      // Executa as requisições em paralelo usando a nova rota PATCH
      await Promise.all(
        selectedCustomers.map(id => 
          api.patch(`/customers/${id}/status`, { status: targetStatus })
        )
      );

      // Atualiza a lista localmente para refletir a mudança sem recarregar tudo
      setCustomers(prev => prev.map(c => 
        selectedCustomers.includes(c.id) ? { ...c, status: targetStatus } : c
      ));
      
      setSelectedCustomers([]);
      setIsStatusModalOpen(false);
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status em massa', error);
      alert('Erro ao atualizar alguns registros. Verifique as permissões.');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedCustomers.length} clientes?`)) return;
    
    try {
      await Promise.all(selectedCustomers.map(id => api.delete(`/customers/${id}`)));
      setCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)));
      setSelectedCustomers([]);
      alert('Clientes excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir clientes', error);
      alert('Erro ao excluir clientes');
    }
  };

  const handleFilters = () => {
    // TODO: Implementar filtros avançados
    alert('Funcionalidade de filtros em desenvolvimento');
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
    <div className="p-4 sm:p-6 relative">
      {/* --- MODAL DE STATUS --- */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Alterar Status em Massa</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Selecione o novo status para os <strong>{selectedCustomers.length}</strong> clientes selecionados:
            </p>

            <select 
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                disabled={processingBulk}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmBulkStatusChange}
                disabled={processingBulk}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {processingBulk ? 'Processando...' : 'Confirmar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes e Fornecedores</h1>
          <p className="text-gray-500 text-sm">Gerencie todos os parceiros de negócio.</p>
        </div>
        <button 
          onClick={() => navigate('/customers/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm"
        >
          <Plus size={20} /> Novo Cadastro
        </button>
      </div>

      {/* ITEM 5: TOOLBAR AÇÕES EM MASSA */}
      {selectedCustomers.length > 0 && (
        <div className="mb-4 bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg">
          <span className="font-bold ml-2">{selectedCustomers.length} selecionados</span>
          <div className="flex gap-2">
            {userPermissions.can_generate_report && (
              <button 
                onClick={handleBulkReport}
                className="px-3 py-1.5 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 text-sm transition"
              >
                <Printer size={16}/> Relatório
              </button>
            )}
            {userPermissions.can_change_status && (
              <button 
                onClick={openStatusModal}
                className="px-3 py-1.5 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 text-sm transition"
                title="Alterar Status"
              >
                <CheckCircle2 size={16}/> Status
              </button>
            )}
            {userPermissions.can_delete_customers && (
              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-1.5 text-sm transition"
              >
                <Trash2 size={16}/> Excluir
              </button>
            )}
          </div>
        </div>
      )}

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
          <button 
            onClick={handleFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-white transition text-gray-600"
          >
            <Filter size={18} /> Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
            <thead className="bg-gray-50 text-gray-500 text-[11px] sm:text-xs uppercase font-bold">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Nome</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">CPF / CNPJ</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Cidade/UF</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Vendedor</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition group cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                  <td className="px-4 sm:px-6 py-3 sm:py-4" onClick={(e) => { e.stopPropagation(); handleSelectOne(e as any, customer.id); }}>
                    <input 
                      type="checkbox" 
                      checked={selectedCustomers.includes(customer.id)}
                      readOnly
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        {customer.person_type === 'fisica' ? <User size={16} /> : <Building2 size={16} />}
                      </div>
                      <span className="font-medium text-gray-700">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 font-mono text-[11px] sm:text-sm">{customer.document}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-[11px] sm:text-sm">{customer.city}/{customer.state}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm text-gray-600">{getSalespersonName(customer.salesperson_id)}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4">{getStatusBadge(customer.status)}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {/* BOTÃO CRM PARA TODOS */}
                      <button 
                        onClick={() => navigate(`/crm/${customer.id}`)}
                        className="p-2 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-full transition"
                        title="Abrir CRM"
                      >
                        <UserSearch size={18} />
                      </button>
                      {/* ITEM 1: BOTÃO AUDITORIA - SOMENTE ADMIN */}
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => navigate(`/audit/customer/${customer.id}`)}
                          className="p-2 hover:bg-amber-50 text-amber-400 hover:text-amber-600 rounded-full transition"
                          title="Ver Auditoria"
                        >
                          <History size={18} />
                        </button>
                      )}
                      <button className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            Mostrando <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> a <strong>{Math.min(currentPage * itemsPerPage, totalCustomers)}</strong> de <strong>{totalCustomers}</strong> clientes
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalCustomers / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  const totalPages = Math.ceil(totalCustomers / itemsPerPage);
                  return page === 1 || 
                         page === totalPages || 
                         (page >= currentPage - 1 && page <= currentPage + 1);
                })
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        currentPage === page 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))
              }
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCustomers / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(totalCustomers / itemsPerPage)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}