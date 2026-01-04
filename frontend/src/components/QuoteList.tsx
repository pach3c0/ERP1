import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface QuoteItem {
  type: string;
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer_name?: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  discount_percent: number;
  total: number;
  status: string;
  notes?: string;
  payment_terms?: string;
  delivery_terms?: string;
  valid_until?: string;
  sent_at?: string;
  approved_at?: string;
  invoiced_at?: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
}

export default function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');

  // Pagination
  const [skip, setSkip] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, statusFilter, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/', { params: { limit: 100 } });
      setCustomers(res.data.items || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { skip, limit };
      if (statusFilter) params.status = statusFilter;
      if (customerFilter) params.customer_id = Number(customerFilter);

      const res = await api.get('/quotes/', { params });
      
      // Enrich with customer names
      const enrichedQuotes = res.data.items.map((quote: Quote) => {
        const customer = customers.find(c => c.id === quote.customer_id);
        return { ...quote, customer_name: customer?.name || 'Cliente Desconhecido' };
      });

      setQuotes(enrichedQuotes);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      alert('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (quoteId: number, newStatus: string) => {
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status: newStatus });
      alert('Status atualizado com sucesso!');
      fetchQuotes();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      const err = error as { response?: { data?: { detail?: string } } };
      alert(err.response?.data?.detail || 'Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      rascunho: { label: 'Rascunho', color: 'bg-gray-200 text-gray-800' },
      enviado: { label: 'Enviado', color: 'bg-blue-200 text-blue-800' },
      aprovado: { label: 'Aprovado', color: 'bg-green-200 text-green-800' },
      recusado: { label: 'Recusado', color: 'bg-red-200 text-red-800' },
      faturado: { label: 'Faturado', color: 'bg-purple-200 text-purple-800' },
      cancelado: { label: 'Cancelado', color: 'bg-gray-300 text-gray-600' }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-200 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getAvailableTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      rascunho: ['enviado', 'cancelado'],
      enviado: ['aprovado', 'recusado', 'cancelado'],
      aprovado: ['faturado', 'cancelado'],
      recusado: [],
      faturado: [],
      cancelado: []
    };
    return transitions[currentStatus] || [];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCustomerFilter('');
    setSkip(0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Orçamentos</h1>
        <button
          onClick={() => navigate('/quotes/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Novo Orçamento
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSkip(0);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
              <option value="faturado">Faturado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cliente</label>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setSkip(0);
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">Todos</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 border rounded hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-2 sm:mb-4 text-gray-600 text-sm">
        Total: {total} orçamento(s)
      </div>

      {/* Quotes Table */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : quotes.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          Nenhum orçamento encontrado
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[760px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left">Número</th>
                  <th className="px-3 sm:px-4 py-3 text-left">Cliente</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Itens</th>
                  <th className="px-3 sm:px-4 py-3 text-right">Total</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Validade</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Data</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 font-mono text-[11px] sm:text-sm">{quote.quote_number}</td>
                    <td className="px-3 sm:px-4 py-3">{quote.customer_name}</td>
                    <td className="px-3 sm:px-4 py-3 text-center">{quote.items.length}</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-semibold text-green-600">
                      R$ {quote.total.toFixed(2)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">{getStatusBadge(quote.status)}</td>
                    <td className="px-3 sm:px-4 py-3 text-center text-[11px] sm:text-sm">
                      {formatDate(quote.valid_until)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center text-[11px] sm:text-sm">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          title="Ver detalhes"
                        >
                          Ver
                        </button>

                        {/* Status transitions */}
                        {getAvailableTransitions(quote.status).length > 0 && (
                          <div className="relative group">
                            <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                              Mudar Status
                            </button>
                            <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-[120px]">
                              {getAvailableTransitions(quote.status).map((newStatus) => (
                                <button
                                  key={newStatus}
                                  onClick={() => updateStatus(quote.id, newStatus)}
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                                >
                                  {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t flex justify-between items-center">
            <button
              onClick={() => setSkip(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <span className="text-gray-600">
              Mostrando {skip + 1} - {Math.min(skip + limit, total)} de {total}
            </span>
            <button
              onClick={() => setSkip(skip + limit)}
              disabled={skip + limit >= total}
              className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
