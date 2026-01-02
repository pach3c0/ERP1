import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { User, Building2, Search, Calendar, UserCheck, ArrowLeft, Save, Lock } from 'lucide-react';

// Tipagem atualizada para refletir o Backend
interface Customer {
  id: number;
  name: string;
  document: string;
  email: string;
  person_type: 'PF' | 'PJ';
  is_customer: boolean;
  is_supplier: boolean;
  status: string; // Campo novo (ativo, inativo, pendente)
  created_at: string;
  salesperson_id: number;
  created_by_id: number;
  
  city: string;
  state: string;
  rg?: string; issuing_organ?: string; ie?: string; phone?: string; contact_name?: string;
  cep?: string; neighborhood?: string; address_line?: string; number?: string; complement?: string;
}

interface SystemUser { id: number; name: string; }
interface Role { slug: string; permissions: { customer_change_status?: boolean } }

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [customerData, setCustomerData] = useState<Partial<Customer>>({});
  
  // Controle de Permissão (Alterar Status)
  const [canChangeStatus, setCanChangeStatus] = useState(false);
  
  // Controle de Permissão (Transferir Carteira)
  const userRoleSlug = localStorage.getItem('role') || 'visitante';
  const canTransfer = ['admin', 'manager'].includes(userRoleSlug);

  const [formData, setFormData] = useState({
    name: '', document: '', rg: '', issuing_organ: '', ie: '',
    email: '', phone: '', contact_name: '',
    cep: '', state: '', city: '', neighborhood: '', address_line: '', number: '', complement: '',
    person_type: 'PF' as 'PF' | 'PJ',
    is_customer: true, is_supplier: false, 
    status: 'ativo', 
    salesperson_id: ''
  });

  useEffect(() => {
    loadMetaData();
    if (isEditing) loadCustomer();
  }, [id]);

  // Carrega permissões e usuários
  const loadMetaData = async () => {
    try {
        const [usersRes, rolesRes] = await Promise.all([
            api.get('/users/'),
            api.get('/roles/')
        ]);
        setUsers(usersRes.data);
        
        // Verifica a permissão do cargo atual
        const myRole = rolesRes.data.find((r: Role) => r.slug === userRoleSlug);
        
        // Admin sempre pode, outros dependem da permissão específica
        const allowed = userRoleSlug === 'admin' || (myRole?.permissions?.customer_change_status === true);
        setCanChangeStatus(allowed);

    } catch (e) { console.error(e); }
  };

  const loadCustomer = async () => {
    try {
      const { data } = await api.get(`/customers/`); 
      const found = data.find((c: Customer) => c.id === Number(id));
      if (found) {
        setCustomerData(found);
        setFormData({
            ...found,
            // Garante que campos opcionais não sejam null
            email: found.email || '', 
            phone: found.phone || '', 
            contact_name: found.contact_name || '', 
            rg: found.rg || '', 
            issuing_organ: found.issuing_organ || '', 
            ie: found.ie || '', 
            cep: found.cep || '', 
            city: found.city || '', 
            state: found.state || '', 
            neighborhood: found.neighborhood || '', 
            address_line: found.address_line || '', 
            number: found.number || '', 
            complement: found.complement || '',
            salesperson_id: found.salesperson_id ? String(found.salesperson_id) : ''
        });
      }
    } catch (e) { alert("Erro ao carregar"); navigate('/customers'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (!data.erro) {
            setFormData(prev => ({ 
                ...prev, 
                address_line: data.logradouro, 
                neighborhood: data.bairro, 
                city: data.localidade, 
                state: data.uf, 
                complement: data.complemento 
            }));
            document.getElementById('number-input')?.focus();
        }
      } catch (e) { console.error(e); } finally { setLoadingCep(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.is_customer && !formData.is_supplier) return alert("Selecione Cliente ou Fornecedor");

    const payload = { 
        ...formData, 
        salesperson_id: formData.salesperson_id ? Number(formData.salesperson_id) : null 
    };

    try {
      if (isEditing) {
        await api.put(`/customers/${id}`, payload);
      } else {
        await api.post('/customers/', payload);
      }
      navigate('/customers');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Erro ao salvar";
      alert(errorMsg);
    }
  };

  const getUserName = (id: number) => {
      const user = users.find(u => u.id === id);
      return user ? user.name : '-';
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft size={24} className="text-gray-600"/>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Editar: ${formData.name}` : 'Novo Cadastro'}</h1>
        </div>
        <button onClick={handleSubmit} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm">
            <Save size={18} /> Salvar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Faixa Superior (Metadados) */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center text-sm text-gray-500">
            <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_customer" checked={formData.is_customer} onChange={handleChange} className="w-4 h-4 text-green-600 rounded"/> 
                    <span className="font-medium text-gray-700">Cliente</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_supplier" checked={formData.is_supplier} onChange={handleChange} className="w-4 h-4 text-green-600 rounded"/> 
                    <span className="font-medium text-gray-700">Fornecedor</span>
                 </label>
            </div>
            {isEditing && (
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1"><Calendar size={14}/> Desde: <strong>{new Date(customerData.created_at || '').toLocaleDateString()}</strong></div>
                    <div className="flex items-center gap-1"><User size={14}/> Criado por: <strong>{getUserName(customerData.created_by_id || 0)}</strong></div>
                </div>
            )}
        </div>

        <form className="p-8 space-y-6">
            
            {/* PF / PJ Switch */}
            <div className="flex gap-4 border-b border-gray-100 pb-6">
                <button type="button" onClick={() => setFormData({...formData, person_type: 'PF'})} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${formData.person_type === 'PF' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white border border-gray-200 text-gray-600'}`}><User size={16}/> Pessoa Física</button>
                <button type="button" onClick={() => setFormData({...formData, person_type: 'PJ'})} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${formData.person_type === 'PJ' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white border border-gray-200 text-gray-600'}`}><Building2 size={16}/> Pessoa Jurídica</button>
            </div>

            {/* Linha 1: Status, Nome, Doc */}
            <div className="grid grid-cols-12 gap-6">
                
                {/* --- CAMPO STATUS (COM BLOQUEIO) --- */}
                <div className="col-span-2 relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                        Status {!canChangeStatus && <Lock size={10} className="text-gray-400"/>}
                    </label>
                    <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange} 
                        disabled={!canChangeStatus} // Bloqueia se não tiver permissão
                        className={`w-full px-3 py-2 border rounded-md outline-none focus:ring-1 focus:ring-green-500 ${!canChangeStatus ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'}`}
                    >
                        <option value="ativo">🟢 Ativo</option>
                        <option value="inativo">🔴 Inativo</option>
                        <option value="pendente">🟡 Pendente</option>
                    </select>
                </div>

                <div className="col-span-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome / Razão Social</label>
                    <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{formData.person_type === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                    <input name="document" value={formData.document} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" />
                </div>
            </div>

            {/* Linha 2: Vendedor e RG/IE */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><UserCheck size={14}/> Vendedor Responsável</label>
                    {canTransfer ? (
                        <select name="salesperson_id" value={formData.salesperson_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500">
                            <option value="">(Eu mesmo)</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    ) : (
                        // Mostra o nome, mas desabilitado para Vendedores
                        <input disabled value={formData.salesperson_id ? getUserName(Number(formData.salesperson_id)) : 'Eu'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
                    )}
                </div>
                <div className="col-span-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{formData.person_type === 'PF' ? 'RG' : 'IE'}</label>
                    <input name={formData.person_type === 'PF' ? 'rg' : 'ie'} value={formData.person_type === 'PF' ? formData.rg : formData.ie} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" />
                </div>
            </div>

            {/* Endereço */}
            <div className="pt-4 border-t border-gray-100"><h3 className="text-sm font-bold text-gray-800">Endereço</h3></div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-2 relative">
                    <label className="text-xs text-gray-500">CEP {loadingCep && '...'}</label>
                    <input name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" />
                    <Search className="absolute right-2 top-6 text-gray-400" size={16} />
                </div>
                <div className="col-span-5"><label className="text-xs text-gray-500">Endereço</label><input name="address_line" value={formData.address_line} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Número</label><input id="number-input" name="number" value={formData.number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div className="col-span-3"><label className="text-xs text-gray-500">Bairro</label><input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                 <div className="col-span-4"><label className="text-xs text-gray-500">Complemento</label><input name="complement" value={formData.complement} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                 <div className="col-span-6"><label className="text-xs text-gray-500">Cidade</label><input name="city" value={formData.city} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" /></div>
                 <div className="col-span-2"><label className="text-xs text-gray-500">UF</label><input name="state" value={formData.state} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" /></div>
            </div>

            {/* Contato */}
            <div className="pt-4 border-t border-gray-100"><h3 className="text-sm font-bold text-gray-800">Contatos</h3></div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs text-gray-500">Email</label><input name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div><label className="text-xs text-gray-500">Telefone</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div><label className="text-xs text-gray-500">Contato</label><input name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>

        </form>
      </div>
    </div>
  );
}