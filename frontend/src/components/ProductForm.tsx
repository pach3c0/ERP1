import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Save } from 'lucide-react';

type Tab = 'dados' | 'precos' | 'estoque' | 'observacoes';

export default function ProductForm() {
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
    price_daily: 0,
    price_weekly: 0,
    price_monthly: 0,
    cost: 0,
    quantity: 1,
    serial_number: '',
    notes: ''
  });

  const fetchProduct = useCallback(async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setFormData(data);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      alert('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await api.put(`/products/${id}`, formData);
        alert('Produto atualizado com sucesso!');
      } else {
        await api.post('/products/', formData);
        alert('Produto criado com sucesso!');
      }
      navigate('/products');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'dados', label: '📋 Dados Básicos', step: 1 },
    { id: 'precos', label: '💰 Preços de Locação', step: 2 },
    { id: 'estoque', label: '📦 Estoque', step: 3 },
    { id: 'observacoes', label: '📝 Observações', step: 4 }
  ];

  if (loading) return <div className="text-center py-10">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {id ? 'Editar Produto' : 'Novo Produto'}
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
                  Nome do Produto *
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
                    <option value="eletronicos">Eletrônicos</option>
                    <option value="equipamentos">Equipamentos</option>
                    <option value="moveis">Móveis</option>
                    <option value="ferramentas">Ferramentas</option>
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
                    <option value="locado">Locado</option>
                    <option value="em_manutencao">Em Manutenção</option>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Série
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PREÇOS DE LOCAÇÃO */}
          {currentTab === 'precos' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Preços de Locação</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700">
                  Configure os preços de locação para diferentes períodos. Você pode deixar alguns campos em branco se não desejar oferecer aquele tipo de locação.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Diária (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_daily}
                    onChange={e => setFormData({ ...formData, price_daily: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Semanal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_weekly}
                    onChange={e => setFormData({ ...formData, price_weekly: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_monthly}
                    onChange={e => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custo de Aquisição (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ESTOQUE */}
          {currentTab === 'estoque' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Estoque</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">
                  Gerenciar quantidade e controle de estoque dos produtos disponíveis para locação.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade Disponível *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div className="bg-gray-100 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Resumo do Estoque</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantidade Total:</span>
                    <span className="font-semibold text-gray-800">{formData.quantity} unidade(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold text-green-600">
                      {formData.quantity > 0 ? '✅ Em Estoque' : '❌ Sem Estoque'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OBSERVAÇÕES */}
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
                  placeholder="Adicione qualquer informação adicional sobre o produto, como condições de manutenção, requisitos especiais, etc."
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
                    const tabIds: Tab[] = ['dados', 'precos', 'estoque', 'observacoes'];
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
                    const tabIds: Tab[] = ['dados', 'precos', 'estoque', 'observacoes'];
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
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
