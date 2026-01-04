import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Save } from 'lucide-react';

type Tab = 'dados' | 'precos' | 'observacoes';

export default function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<Tab>('dados');
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'geral',
    status: 'disponivel',
    price_base: 0,
    price_hourly: 0,
    duration_type: 'hora',
    notes: ''
  });

  const fetchService = useCallback(async () => {
    try {
      const { data } = await api.get(`/services/${id}`);
      setFormData(data);
    } catch (error) {
      console.error('Erro ao carregar serviço:', error);
      alert('Erro ao carregar serviço');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id, fetchService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await api.put(`/services/${id}`, formData);
        alert('Serviço atualizado com sucesso!');
      } else {
        await api.post('/services/', formData);
        alert('Serviço criado com sucesso!');
      }
      navigate('/services');
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      alert('Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'dados', label: '📋 Dados Básicos', step: 1 },
    { id: 'precos', label: '💰 Preços', step: 2 },
    { id: 'observacoes', label: '📝 Observações', step: 3 }
  ];

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/services')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {id ? 'Editar Serviço' : 'Novo Serviço'}
        </h1>
        <div className="w-10" />
      </div>

      {/* Abas - Estilo Bling */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as Tab)}
              className={`flex-1 px-4 py-4 text-center font-semibold transition-colors border-b-2 ${
                currentTab === tab.id
                  ? 'border-b-blue-600 text-blue-600 bg-white'
                  : 'border-b-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">Etapa {tab.step}</div>
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* TAB 1: DADOS BÁSICOS */}
          {currentTab === 'dados' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Dados Básicos</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  >
                    <option value="geral">Geral</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="consulta">Consulta</option>
                    <option value="instalacao">Instalação</option>
                    <option value="transporte">Transporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="indisponivel">Indisponível</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 resize-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PREÇOS */}
          {currentTab === 'precos' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Preços do Serviço</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700">
                  Configure o preço base do serviço. Para serviços cobrados por hora, também defina o preço horário.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Base (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_base}
                    onChange={e => setFormData({ ...formData, price_base: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Horário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_hourly}
                    onChange={e => setFormData({ ...formData, price_hourly: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Duração
                </label>
                <select
                  value={formData.duration_type}
                  onChange={e => setFormData({ ...formData, duration_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                >
                  <option value="hora">Hora</option>
                  <option value="dia">Dia</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                  <option value="unico">Única</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-amber-900 mb-2">Informações de Preço</h3>
                <div className="space-y-2 text-sm text-amber-800">
                  <div className="flex justify-between">
                    <span>Preço Base:</span>
                    <span className="font-semibold">R$ {formData.price_base.toFixed(2)}</span>
                  </div>
                  {formData.price_hourly > 0 && (
                    <div className="flex justify-between">
                      <span>Preço {formData.duration_type}:</span>
                      <span className="font-semibold">R$ {formData.price_hourly.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OBSERVAÇÕES */}
          {currentTab === 'observacoes' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Observações e Informações Adicionais</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 resize-none"
                  rows={6}
                  placeholder="Adicione qualquer informação adicional sobre o serviço, como restrições, requisitos, condições especiais, etc."
                />
              </div>
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex gap-2">
              {currentTab !== 'dados' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabIds: Tab[] = ['dados', 'precos', 'observacoes'];
                    const currentIndex = tabIds.indexOf(currentTab);
                    if (currentIndex > 0) {
                      setCurrentTab(tabIds[currentIndex - 1]);
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  ← Anterior
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {currentTab !== 'observacoes' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabIds: Tab[] = ['dados', 'precos', 'observacoes'];
                    const currentIndex = tabIds.indexOf(currentTab);
                    if (currentIndex < tabIds.length - 1) {
                      setCurrentTab(tabIds[currentIndex + 1]);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Próximo →
                </button>
              )}
              
              {currentTab === 'observacoes' && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
