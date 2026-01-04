import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  Plus, Search, Package, 
  Printer, Trash2, Edit2, Lock, AlertCircle, X
} from 'lucide-react';
import { hasPermission } from '../utils/permissionsHelper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  id: number;
  name: string;
  category: string;
  status: string;
  price_daily: number;
  price_monthly: number;
  quantity: number;
  serial_number?: string;
}

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Seleção em massa
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  
  // Permissões granulares
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Permissões são lidas diretamente dos helpers; não é necessário estado local aqui.

  const fetchData = async () => {
    // Se o usuário não pode visualizar produtos, não carrega
    if (!hasPermission('can_view_products')) {
      setLoading(false);
      setShowPermissionWarning(true);
      return;
    }

    try {
      const prodRes = await api.get('/products/');
      // A API retorna { items, total, skip, limit }
      setProducts(prodRes.data.items || []);
    } catch (error) {
      console.error("Erro ao carregar produtos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOne = (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
    id: number
  ) => {
    e.stopPropagation();
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkReport = () => {
    if (!hasPermission('can_export_product_report')) {
      alert('Você não tem permissão para exportar relatórios');
      return;
    }

    const doc = new jsPDF();
    const reportData = products.filter(p => selectedProducts.includes(p.id));
    
    doc.setFontSize(16);
    doc.text(`Relatório de Produtos (${reportData.length})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["Nome", "Categoria", "Status", "Preço Diária", "Quantidade"];
    const tableRows = reportData.map(p => [
      p.name,
      p.category,
      p.status,
      `R$ ${p.price_daily.toFixed(2)}`,
      p.quantity.toString()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`produtos_relatorio_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleBulkDelete = async () => {
    if (!hasPermission('can_soft_delete_products') && !hasPermission('can_hard_delete_products')) {
      alert('Você não tem permissão para excluir produtos');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedProducts.length} produtos?`)) return;
    
    try {
      await Promise.all(selectedProducts.map(id => api.delete(`/products/${id}`)));
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      alert('Produtos excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir produtos', error);
      alert('Erro ao excluir produtos');
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus ? p.status === filterStatus : true) &&
    (filterCategory ? p.category === filterCategory : true)
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      disponivel: 'bg-green-100 text-green-700 border-green-200',
      locado: 'bg-blue-100 text-blue-700 border-blue-200',
      em_manutencao: 'bg-orange-100 text-orange-700 border-orange-200',
      inativo: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="space-y-6">
      {/* Aviso se sem permissão */}
      {showPermissionWarning && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Acesso Negado</h3>
            <p className="text-red-700 text-sm">Você não tem permissão para visualizar produtos. Contacte seu administrador.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Package size={32} className="text-blue-600" />
          Produtos para Locação
        </h1>
        {hasPermission('can_create_products') ? (
          <button
            onClick={() => navigate('/products/new')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed" title="Sem permissão para criar produtos">
            <Lock size={18} />
            <span className="text-sm">Novo Produto</span>
          </div>
        )}
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar produto por nome ou categoria..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
          >
            <option value="">Todos os Status</option>
            <option value="disponivel">Disponível</option>
            <option value="locado">Locado</option>
            <option value="em_manutencao">Em Manutenção</option>
            <option value="inativo">Inativo</option>
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400"
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Ações em Massa */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-semibold text-blue-700">
              {selectedProducts.length} selecionado(s)
            </span>
            {hasPermission('can_export_product_report') && (
              <button
                onClick={handleBulkReport}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Printer size={16} />
                Relatório
              </button>
            )}
            {(hasPermission('can_soft_delete_products') || hasPermission('can_hard_delete_products')) && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                <Trash2 size={16} />
                Deletar
              </button>
            )}
            <button
              onClick={() => setSelectedProducts([])}
              className="ml-auto text-gray-600 hover:text-gray-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-center text-gray-500 py-10">Carregando...</p>
      ) : showPermissionWarning ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Lock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Sem acesso a produtos</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Nenhum produto encontrado.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Produto</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  {hasPermission('can_edit_product_prices') && (
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Preço Diária</th>
                  )}
                  {hasPermission('can_edit_product_quantity') && (
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Qtd</th>
                  )}
                  <th className="px-3 sm:px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                      selectedProducts.includes(product.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={e => handleSelectOne(e, product.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 sm:px-4 py-3 font-semibold text-gray-800">{product.name}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-600">{product.category}</td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    {hasPermission('can_edit_product_prices') && (
                      <td className="px-3 sm:px-4 py-3 text-gray-600">R$ {product.price_daily.toFixed(2)}</td>
                    )}
                    {hasPermission('can_edit_product_quantity') && (
                      <td className="px-3 sm:px-4 py-3 text-gray-600">{product.quantity}</td>
                    )}
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {hasPermission('can_edit_product_basic') ? (
                          <button
                            onClick={() => navigate(`/products/${product.id}`)}
                            className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                            title="Editar produto"
                          >
                            <Edit2 size={16} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-2 text-gray-300 rounded cursor-not-allowed"
                            title="Sem permissão para editar"
                          >
                            <Lock size={16} />
                          </button>
                        )}
                        {(hasPermission('can_soft_delete_products') || hasPermission('can_hard_delete_products')) && (
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja deletar este produto?')) {
                                api.delete(`/products/${product.id}`).then(() => {
                                  setProducts(prev => prev.filter(p => p.id !== product.id));
                                }).catch(() => alert('Erro ao deletar'));
                              }
                            }}
                            className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                            title="Deletar produto"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
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
