import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, History, User, Calendar, FileText } from 'lucide-react';

interface AuditLog {
  id: number;
  table_name: string;
  action: string;
  user_id: number;
  user_name: string;
  changes: Record<string, any>;
  created_at: string;
}

export default function AuditView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetchAuditLogs();
    fetchCustomerName();
  }, [id]);

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get(`/audit/customer/${id}`);
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerName = async () => {
    try {
      const response = await api.get(`/customers/${id}`);
      setCustomerName(response.data.name);
    } catch (error) {
      console.error('Erro ao carregar nome do cliente', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'text-green-600 bg-green-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      case 'soft_delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderChanges = (changes: Record<string, any>) => {
    if (changes.created) {
      return <div className="text-sm text-green-600 font-medium">Cliente criado</div>;
    }
    
    return Object.entries(changes).map(([key, change]) => {
      if (typeof change === 'object' && change.old !== undefined && change.new !== undefined) {
        return (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700">{key}:</span>{' '}
            <span className="text-red-500 line-through">{String(change.old)}</span>{' '}
            <span className="text-gray-400">→</span>{' '}
            <span className="text-green-600">{String(change.new)}</span>
          </div>
        );
      } else {
        return (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700">{key}:</span>{' '}
            <span className="text-gray-600">{JSON.stringify(change)}</span>
          </div>
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Carregando logs de auditoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History size={24} />
            Auditoria do Cliente
          </h1>
          <p className="text-gray-500 text-sm">{customerName || `ID: ${id}`}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum log de auditoria encontrado para este cliente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={16} />
                      <span className="text-sm">{log.user_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={16} />
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-gray-500" />
                    <span className="font-medium text-gray-700">Alterações realizadas:</span>
                  </div>
                  <div className="space-y-2">
                    {renderChanges(log.changes)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}