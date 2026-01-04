import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface QuoteItem {
  type: 'product' | 'service';
  item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Customer {
  id: number;
  name: string;
  status: string;
}

interface Product {
  id: number;
  name: string;
  price_daily: number;
  price_weekly: number;
  price_monthly: number;
  quantity: number;
  status: string;
}

interface Service {
  id: number;
  name: string;
  price_base: number;
  status: string;
}

export default function QuoteForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Form state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Item addition state
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      console.log('🔄 Carregando dados para orçamento...');
      const [customersRes, productsRes, servicesRes] = await Promise.all([
        api.get('/customers/', { params: { limit: 100, status: 'ativo' } }),
        api.get('/products/', { params: { limit: 100, status: 'disponivel' } }),
        api.get('/services/', { params: { limit: 100, status: 'ativo' } })
      ]);

      console.log('✅ Clientes:', customersRes.data.items?.length || 0);
      console.log('✅ Produtos:', productsRes.data.items?.length || 0);
      console.log('✅ Serviços:', servicesRes.data.items?.length || 0);

      setCustomers(customersRes.data.items || []);
      setProducts(productsRes.data.items || []);
      setServices(servicesRes.data.items || []);

      // Default valid_until: 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setValidUntil(defaultDate.toISOString().split('T')[0]);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      let errorMessage = 'Erro ao carregar dados. Verifique sua conexão e tente novamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { detail?: string }; status?: number } };
        if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response?.status) {
          errorMessage = `Erro ${err.response.status}: ${error}`;
        }
      }
      
      console.error('Status:', (error as any)?.response?.status);
      console.error('Detalhe:', (error as any)?.response?.data);
      alert(errorMessage);
    }
  };

  const addItem = () => {
    if (!selectedItemId) {
      alert('Selecione um item');
      return;
    }

    const itemList = itemType === 'product' ? products : services;
    const selectedItem = itemList.find(i => i.id === selectedItemId);

    if (!selectedItem) return;

    // Check if product has enough stock
    if (itemType === 'product') {
      const product = selectedItem as Product;
      if (product.quantity < itemQuantity) {
        alert(`Estoque insuficiente. Disponível: ${product.quantity}`);
        return;
      }
    }

    // Check if item already exists
    const existingIndex = items.findIndex(
      i => i.type === itemType && i.item_id === selectedItemId
    );

    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += itemQuantity;
      updatedItems[existingIndex].subtotal =
        updatedItems[existingIndex].quantity * updatedItems[existingIndex].unit_price;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: QuoteItem = {
        type: itemType,
        item_id: selectedItem.id,
        name: selectedItem.name,
        quantity: itemQuantity,
        unit_price: itemType === 'product' ? (selectedItem as Product).price_daily : selectedItem.price_base,
        subtotal: itemQuantity * (itemType === 'product' ? (selectedItem as Product).price_daily : selectedItem.price_base)
      };
      setItems([...items, newItem]);
    }

    // Reset
    setSelectedItemId(null);
    setItemQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = [...items];
    const item = updatedItems[index];

    // Check stock for products
    if (item.type === 'product') {
      const product = products.find(p => p.id === item.item_id);
      if (product && product.quantity < quantity) {
        alert(`Estoque insuficiente. Disponível: ${product.quantity}`);
        return;
      }
    }

    item.quantity = quantity;
    item.subtotal = quantity * item.unit_price;
    setItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    let total = subtotal;

    if (discountPercent > 0) {
      total -= (subtotal * discountPercent) / 100;
    }

    if (discountValue > 0) {
      total -= discountValue;
    }

    return Math.max(0, total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert('Selecione um cliente');
      return;
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um item');
      return;
    }

    setLoading(true);

    try {
      // Calcular totais
      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      
      // Validar que os items têm os campos obrigatórios
      const validatedItems = items.map(item => ({
        type: item.type,
        item_id: item.item_id,
        name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal)
      }));
      
      const payload: Record<string, any> = {
        customer_id: Number(customerId),
        items: validatedItems,
        subtotal: Number(subtotal),
        discount: Number(discountValue),
        discount_percent: Number(discountPercent),
        total: Number(total),
        payment_terms: String(paymentTerms || ''),
        delivery_terms: String(deliveryTerms || ''),
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (notes && notes.trim()) payload.notes = notes;
      if (validUntil && validUntil.trim()) payload.valid_until = validUntil;

      console.log('📤 Enviando orçamento com payload:');
      console.log(JSON.stringify(payload, null, 2));
      
      const response = await api.post('/quotes/', payload);
      console.log('✅ Orçamento criado com sucesso!', response.data);
      
      alert(`Orçamento ${response.data.quote_number} criado com sucesso!`);
      navigate('/quotes');
    } catch (error: any) {
      console.error('❌ Erro ao criar orçamento:', error);
      
      let message = 'Erro ao criar orçamento';
      
      // Tratar diferentes tipos de erro
      if (error.response?.status === 422) {
        const details = error.response?.data?.detail;
        if (Array.isArray(details)) {
          message = details.map((e: any) => `${e.loc?.[1] || 'Campo'}: ${e.msg}`).join('\n');
        } else if (typeof details === 'string') {
          message = details;
        }
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      console.error('Erro detalhado:', error.response?.data);
      alert(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Novo Orçamento</h1>
        <button
          onClick={() => navigate('/quotes')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cliente</h2>
          <select
            value={customerId || ''}
            onChange={(e) => setCustomerId(Number(e.target.value))}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione um cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Itens do Orçamento</h2>

          {/* Add Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value as 'product' | 'service');
                  setSelectedItemId(null);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="product">Produto</option>
                <option value="service">Serviço</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Item</label>
              <select
                value={selectedItemId || ''}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione...</option>
                {(itemType === 'product' ? products : services).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - R$ {itemType === 'product' ? (item as Product).price_daily.toFixed(2) : item.price_base.toFixed(2)}
                    {itemType === 'product' && ` (Estoque: ${(item as Product).quantity})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantidade</label>
              <input
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Preço Unit.</th>
                    <th className="p-2 text-center">Quantidade</th>
                    <th className="p-2 text-right">Subtotal</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.type === 'product' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'product' ? 'Produto' : 'Serviço'}
                        </span>
                      </td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 text-right">R$ {item.unit_price.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                          className="w-20 p-1 border rounded text-center"
                        />
                      </td>
                      <td className="p-2 text-right font-semibold">
                        R$ {item.subtotal.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals & Discounts */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Valores</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Desconto (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Desconto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span>R$ {calculateSubtotal().toFixed(2)}</span>
            </div>
            {(discountValue > 0 || discountPercent > 0) && (
              <div className="flex justify-between text-red-600">
                <span>Desconto:</span>
                <span>
                  - R$ {(calculateSubtotal() - calculateTotal()).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-bold text-green-600">
              <span>Total:</span>
              <span>R$ {calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Condições e Observações</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Validade até</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Condições de Pagamento</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                className="w-full p-2 border rounded"
                placeholder="Ex: 50% entrada + 50% na entrega"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Condições de Entrega</label>
              <textarea
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                rows={2}
                className="w-full p-2 border rounded"
                placeholder="Ex: Entrega em até 5 dias úteis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded"
                placeholder="Observações gerais do orçamento"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              const subtotal = calculateSubtotal();
              const total = calculateTotal();
              const payload = {
                customer_id: customerId,
                items: items,
                subtotal,
                discount: discountValue,
                discount_percent: discountPercent,
                total,
                payment_terms: paymentTerms || '',
                delivery_terms: deliveryTerms || '',
                ...(notes && { notes }),
                ...(validUntil && { valid_until: validUntil })
              };
              console.log('📋 Payload que será enviado:', JSON.stringify(payload, null, 2));
              alert('Payload exibido no console (F12)');
            }}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
          >
            Ver JSON
          </button>
          <button
            type="button"
            onClick={() => navigate('/quotes')}
            className="px-6 py-2 border rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Criando...' : 'Criar Orçamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
