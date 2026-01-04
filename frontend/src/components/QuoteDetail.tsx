import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
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
  email?: string;
  phone?: string;
  doc_type?: string;
  doc_number?: string;
}

export default function QuoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchQuote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchQuote = async () => {
    if (!id) return;

    try {
      const quoteRes = await api.get(`/quotes/${id}`);
      const quoteData = quoteRes.data;
      setQuote(quoteData);

      // Fetch customer details
      const customerRes = await api.get(`/customers/${quoteData.customer_id}`);
      setCustomer(customerRes.data);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      alert('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!id) return;

    try {
      await api.patch(`/quotes/${id}/status`, { status: newStatus });
      alert('Status atualizado com sucesso!');
      fetchQuote();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      const err = error as { response?: { data?: { detail?: string } } };
      alert(err.response?.data?.detail || 'Erro ao atualizar status');
    }
  };

  const downloadPdf = async () => {
    if (!id) return;
    
    try {
      setDownloadingPdf(true);
      const response = await api.get(`/quotes/${id}/pdf`, {
        responseType: 'blob'
      });
      
      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quote?.quote_number || 'orcamento'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download do PDF:', error);
      alert('Erro ao gerar PDF');
    } finally {
      setDownloadingPdf(false);
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
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${config.color}`}>
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!quote || !customer) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Orçamento não encontrado</p>
        <button
          onClick={() => navigate('/quotes')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Orçamento {quote.quote_number}</h1>
          <p className="text-gray-600 mt-1">Criado em {formatDate(quote.created_at)}</p>
        </div>
        <button
          onClick={() => navigate('/quotes')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Voltar
        </button>
      </div>

      {/* Status & Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-600 mr-4">Status:</span>
            {getStatusBadge(quote.status)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Download size={18} />
              {downloadingPdf ? 'Gerando...' : 'Baixar PDF'}
            </button>

            {getAvailableTransitions(quote.status).length > 0 && 
              getAvailableTransitions(quote.status).map((newStatus) => (
                <button
                  key={newStatus}
                  onClick={() => updateStatus(newStatus)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Marcar como {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Cliente</h2>
          <div className="space-y-2">
            <p><strong>Nome:</strong> {customer.name}</p>
            {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
            {customer.phone && <p><strong>Telefone:</strong> {customer.phone}</p>}
            {customer.doc_number && (
              <p>
                <strong>{customer.doc_type === 'cpf' ? 'CPF' : 'CNPJ'}:</strong> {customer.doc_number}
              </p>
            )}
          </div>
        </div>

        {/* Quote Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Informações</h2>
          <div className="space-y-2">
            <p><strong>Validade:</strong> {formatDate(quote.valid_until)}</p>
            {quote.sent_at && <p><strong>Enviado em:</strong> {formatDate(quote.sent_at)}</p>}
            {quote.approved_at && <p><strong>Aprovado em:</strong> {formatDate(quote.approved_at)}</p>}
            {quote.invoiced_at && <p><strong>Faturado em:</strong> {formatDate(quote.invoiced_at)}</p>}
            <p><strong>Última atualização:</strong> {formatDate(quote.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Itens</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-right">Preço Unit.</th>
                <th className="p-3 text-center">Quantidade</th>
                <th className="p-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.type === 'product' ? 'Produto' : 'Serviço'}
                    </span>
                  </td>
                  <td className="p-3">{item.name}</td>
                  <td className="p-3 text-right">R$ {item.unit_price.toFixed(2)}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right font-semibold">R$ {item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="flex justify-between text-lg">
            <span>Subtotal:</span>
            <span>R$ {quote.subtotal.toFixed(2)}</span>
          </div>
          {(quote.discount > 0 || quote.discount_percent > 0) && (
            <div className="flex justify-between text-red-600">
              <span>
                Desconto
                {quote.discount_percent > 0 && ` (${quote.discount_percent}%)`}
                {quote.discount > 0 && quote.discount_percent > 0 && ' + '}
                {quote.discount > 0 && `R$ ${quote.discount.toFixed(2)}`}
                :
              </span>
              <span>- R$ {(quote.subtotal - quote.total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold text-green-600 border-t pt-2">
            <span>Total:</span>
            <span>R$ {quote.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Notes */}
      {(quote.payment_terms || quote.delivery_terms || quote.notes) && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Condições e Observações</h2>
          <div className="space-y-4">
            {quote.payment_terms && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Condições de Pagamento</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.payment_terms}</p>
              </div>
            )}
            {quote.delivery_terms && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Condições de Entrega</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.delivery_terms}</p>
              </div>
            )}
            {quote.notes && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Observações</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
