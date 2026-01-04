import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Edit2, Trash2, Download, Lock, AlertCircle, X } from 'lucide-react';
import { getUserPermissions, hasPermission } from '../utils/permissionsHelper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Service {
  id: number;
  name: string;
  category: string;
  status: string;
  price_base: number;
  price_hourly?: number;
}

interface UserPermissions {
  can_create_services: boolean;
  can_edit_services: boolean;
  can_delete_services: boolean;
}

export default function ServiceList() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState(getUserPermissions());
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Atualizar permissões quando o armazenamento muda
    const handleStorageChange = () => {
      setUserPermissions(getUserPermissions());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchData = async () => {
    // Se o usuário não pode visualizar serviços, não carrega
    if (!hasPermission('can_view_services')) {
      setLoading(false);
      setShowPermissionWarning(true);
      return;
    }

    try {
      const servicesRes = await api.get('/services/');
      // A API retorna { items, total, skip, limit }
      setServices(servicesRes.data.items || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices.map(s => s.id));
    }
  };

  const handleBulkReport = () => {
    if (!hasPermission('can_export_service_report')) {
      alert('Você não tem permissão para exportar relatórios');
      return;
    }

    const doc = new jsPDF();
    const selectedData = filteredServices.filter(s => selectedServices.includes(s.id));

    const tableData = selectedData.map(service => [
      service.name,
      service.category,
      service.status,
      `R$ ${service.price_base.toFixed(2)}`,
      service.price_hourly ? `R$ ${service.price_hourly.toFixed(2)}` : '-'
    ]);

    autoTable(doc, {
      head: [['Nome', 'Categoria', 'Status', 'Preço Base', 'Preço Horário']],
      body: tableData,
      startY: 20
    });

    doc.text('Relatório de Serviços', 10, 10);
    doc.save(`servicos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!hasPermission('can_soft_delete_services') && !hasPermission('can_hard_delete_services')) {
      alert('Você não tem permissão para excluir serviços');
      return;
    }

    const confirmed = window.confirm(
      `Deseja deletar ${selectedServices.length} serviço(s)? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await Promise.all(selectedServices.map(id => api.delete(`/services/${id}`)));
      alert('Serviço(s) deletado(s) com sucesso!');
      setSelectedServices([]);
      await fetchData();
    } catch (error) {
      console.error('Erro ao deletar serviço(s):', error);
      alert('Erro ao deletar serviço(s)');
    }
  };

  const filteredServices = services.filter(service => {
    const matchSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        service.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || service.status === filterStatus;
    const matchCategory = filterCategory === 'todos' || service.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const categories = Array.from(new Set(services.map(s => s.category)));
  const statuses = Array.from(new Set(services.map(s => s.status)));

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'disponivel': 'bg-green-100 text-green-800',
      'indisponivel': 'bg-red-100 text-red-800',
      'inativo': 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Aviso se sem permissão */}
      {showPermissionWarning && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Acesso Negado</h3>
            <p className="text-red-700 text-sm">Você não tem permissão para visualizar serviços. Contacte seu administrador.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Serviços</h1>
        {hasPermission('can_create_services') ? (
          <button
            onClick={() => navigate('/services/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Novo Serviço
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed" title="Sem permissão para criar serviços">
            <Lock size={20} />
            <span>Novo Serviço</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Buscar serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
          />

          <div className="grid grid-cols-2 gap-4">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
            >
              <option value="todos">Todos os Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
            >
              <option value="todos">Todas as Categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ações em Lote */}
      {selectedServices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-800 font-semibold">
            {selectedServices.length} serviço(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            {hasPermission('can_export_service_report') && (
              <button
                onClick={handleBulkReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download size={18} />
                Relatório PDF
              </button>
            )}
            {(hasPermission('can_soft_delete_services') || hasPermission('can_hard_delete_services')) && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <Trash2 size={18} />
                Deletar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabela de Serviços */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {showPermissionWarning ? (
          <div className="p-8 text-center">
            <Lock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Sem acesso a serviços</p>
          </div>
        ) : filteredServices.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedServices.length === filteredServices.length && filteredServices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                {hasPermission('can_edit_service_prices') && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Preço Base</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(service => (
                <tr key={service.id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${selectedServices.includes(service.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleSelectOne(service.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{service.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(service.status)}`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </td>
                  {hasPermission('can_edit_service_prices') && (
                    <td className="px-4 py-3 text-gray-600 font-semibold">
                      R$ {service.price_base.toFixed(2)}
                    </td>
                  )}
                  <td className="px-4 py-3 flex gap-2">
                    {hasPermission('can_edit_service_basic') ? (
                      <button
                        onClick={() => navigate(`/services/${service.id}`)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                        title="Sem permissão para editar"
                      >
                        <Lock size={16} />
                        <span>Editar</span>
                      </button>
                    )}
                    {(hasPermission('can_soft_delete_services') || hasPermission('can_hard_delete_services')) && (
                      <button
                        onClick={async () => {
                          if (window.confirm('Deseja deletar este serviço?')) {
                            try {
                              await api.delete(`/services/${service.id}`);
                              alert('Serviço deletado com sucesso!');
                              await fetchData();
                            } catch (error) {
                              console.error('Erro ao deletar:', error);
                              alert('Erro ao deletar serviço');
                            }
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                      >
                        <Trash2 size={16} />
                        Deletar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhum serviço encontrado
          </div>
        )}
      </div>
    </div>
  );
}
