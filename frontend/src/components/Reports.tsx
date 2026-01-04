import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Filter } from 'lucide-react';
import api from '../api';

export default function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [salesByPeriod, setSalesByPeriod] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  const [topServices, setTopServices] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    // Setar datas padrão (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [startDate, endDate, limit]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const params = {
        start_date: `${startDate}T00:00:00`,
        end_date: `${endDate}T23:59:59`,
        limit: limit
      };

      const [summaryRes, salesRes, productsRes, servicesRes, customersRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/sales-by-period', { params }),
        api.get('/reports/products-most-sold', { params }),
        api.get('/reports/services-most-sold', { params }),
        api.get('/reports/top-customers', { params })
      ]);

      setSummary(summaryRes.data);
      setSalesByPeriod(salesRes.data);
      setTopProducts(productsRes.data);
      setTopServices(servicesRes.data);
      setTopCustomers(customersRes.data);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando relatórios...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-600 mt-2">Análise detalhada de vendas e produtos</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Top Items</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600 text-sm font-medium">Total de Vendas</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              R$ {summary.total_sales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600 text-sm font-medium">Orçamentos</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{summary.total_quotes}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600 text-sm font-medium">Clientes</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{summary.total_customers}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600 text-sm font-medium">Ticket Médio</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              R$ {summary.avg_ticket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-slate-600 text-sm font-medium">Faturados</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{summary.quotes_invoiced}</p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vendas por Período */}
        {salesByPeriod && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Vendas por Período</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={Object.values(salesByPeriod.sales_by_day)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Produtos */}
        {topProducts && topProducts.products.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Produtos Mais Vendidos</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8b5cf6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes */}
        {topCustomers && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Clientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.customers.map((customer: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{customer.customer_name}</td>
                      <td className="px-4 py-3 text-right">
                        R$ {customer.total_spent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right">{customer.quote_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Serviços */}
        {topServices && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Serviços Mais Vendidos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Serviço</th>
                    <th className="px-4 py-2 text-right">Qtd</th>
                    <th className="px-4 py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.services.map((service: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{service.name}</td>
                      <td className="px-4 py-3 text-right">{service.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        R$ {service.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tabela Produtos */}
      {topProducts && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Produtos - Detalhado</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-right">Quantidade</th>
                  <th className="px-4 py-2 text-right">Preço Unit.</th>
                  <th className="px-4 py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.products.map((product: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-right">{product.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      R$ {product.avg_price.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      R$ {product.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
