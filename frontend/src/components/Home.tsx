import { useEffect, useState } from 'react';
import api from '../api';
import { Users, Building2, User } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({ total: 0, pf: 0, pj: 0 });
  const [loading, setLoading] = useState(true);

  const userRole = localStorage.getItem('role') || 'visitante';
  const isSales = userRole === 'sales';

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error("Erro ao carregar estatísticas");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
        <p className="text-gray-500">
          {isSales 
            ? 'Acompanhe o desempenho da sua carteira pessoal.' 
            : 'Visão global dos parceiros cadastrados no sistema.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card Total */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Total de Parceiros</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">
              {loading ? '...' : stats.total}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>
        
        {/* Card PF */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Pessoas Físicas</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">
              {loading ? '...' : stats.pf}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <User size={24} />
          </div>
        </div>

        {/* Card PJ */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Pessoas Jurídicas</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">
              {loading ? '...' : stats.pj}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>

      </div>

      {/* Dica visual para Vendedores */}
      {isSales && (
        <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 text-sm">
          <strong>💡 Modo CRM Ativo:</strong> Você está visualizando apenas os clientes que você cadastrou.
        </div>
      )}
    </div>
  );
}