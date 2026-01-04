import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, Package, Activity } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
        setError('');
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
        setError('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Atualizar a cada minuto
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Carregando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 bg-yellow-50 text-yellow-700 rounded-lg">
        Nenhum dado disponível
      </div>
    );
  }

  // Preparar dados para gráficos
  const quotesStatusData = [
    { name: 'Rascunho', value: stats.quotes.by_status.rascunho, fill: '#ef4444' },
    { name: 'Enviado', value: stats.quotes.by_status.enviado, fill: '#f97316' },
    { name: 'Aprovado', value: stats.quotes.by_status.aprovado, fill: '#eab308' },
    { name: 'Faturado', value: stats.quotes.by_status.faturado, fill: '#22c55e' },
  ];

  const customersStatusData = [
    { name: 'Ativo', value: stats.customers.active, fill: '#3b82f6' },
    { name: 'Pendente', value: stats.customers.pending, fill: '#f59e0b' },
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Visão geral do seu ERP</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card: Clientes */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total de Clientes</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.customers.total}</p>
              <p className="text-xs text-slate-500 mt-2">
                {stats.customers.active} ativos • {stats.customers.pending} pendentes
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Card: Orçamentos */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total de Orçamentos</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.quotes.total}</p>
              <p className="text-xs text-slate-500 mt-2">
                {stats.quotes.approved} aprovados • {stats.quotes.billed} faturados
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Card: Receita */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Receita Total</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                R$ {stats.revenue.billed_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Faturado: R$ {stats.revenue.billed_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Card: Inventário */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Produtos & Serviços</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.inventory.total_products + stats.inventory.total_services}</p>
              <p className="text-xs text-slate-500 mt-2">
                {stats.inventory.available_products} produtos • {stats.inventory.available_services} serviços
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Orçamentos por Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Orçamentos por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={quotesStatusData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {quotesStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Clientes por Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Clientes por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customersStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Salespeople */}
      {stats.top_salespeople && stats.top_salespeople.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Vendedores</h2>
            <div className="space-y-3">
              {stats.top_salespeople.map((person: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-700 font-medium">{person.name}</span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {person.total_customers} clientes
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas Atividades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas Atividades</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recent_activities && stats.recent_activities.length > 0 ? (
                stats.recent_activities.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Activity className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-700 text-sm">
                        <span className="font-medium">{activity.action}</span> em {activity.table_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(activity.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">Nenhuma atividade recente</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo Orçamentos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo de Orçamentos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-slate-600 text-sm">Rascunho</p>
            <p className="text-2xl font-bold text-red-600">{stats.quotes.draft}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-slate-600 text-sm">Enviado</p>
            <p className="text-2xl font-bold text-orange-600">{stats.quotes.sent}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-slate-600 text-sm">Aprovado</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.quotes.approved}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-slate-600 text-sm">Faturado</p>
            <p className="text-2xl font-bold text-green-600">{stats.quotes.billed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
