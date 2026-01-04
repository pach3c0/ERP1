import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { 
  Building2, ArrowLeft, Save, Lock, MessageSquare, Send, 
  MapPin, Phone, FileText, Smartphone, Mail, AlertTriangle, User
} from 'lucide-react';

// --- Interfaces ---
interface User {
  id: number;
  name: string;
  email: string;
}

interface CustomerNote {
  id: number;
  content: string;
  created_at: string;
  user_name: string;
  type: string;
  task_status?: string;
  target_user_id?: number;
  read_at?: string;
  started_at?: string;
  completed_at?: string;
}

interface FormSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  disabled?: boolean;
}

// --- Componente Visual de Secção (Card) ---
const FormSection = ({ title, icon: Icon, children, disabled = false }: FormSectionProps) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center gap-2">
      <Icon className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-indigo-600'}`} />
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {disabled && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded ml-auto">Aguardando Documento</span>}
    </div>
    <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
      {children}
    </div>
  </div>
);

interface User {
  id: number;
  name: string;
  email: string;
  // Adicione outras propriedades conforme necessário
}

interface CustomerNote {
  id: number;
  content: string;
  created_at: string;
  user_name: string;
  // Adicione outras propriedades
}

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // --- Estados ---
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [canChangeStatus, setCanChangeStatus] = useState(false);

  const [isVerified, setIsVerified] = useState(isEditing);
  const [verifying, setVerifying] = useState(false);

  // Chat & Tarefas
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'message' | 'task'>('message');
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Estados para Menções ---
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const userRoleSlug = localStorage.getItem('role') || 'visitante';
  const isAdmin = userRoleSlug === 'admin';
  const canTransfer = ['admin', 'manager'].includes(userRoleSlug);

  const [formData, setFormData] = useState({
    name: '', fantasy_name: '', document: '', 
    rg: '', issuing_organ: '', ie: '', municipal_reg: '',
    email: '', phone: '', cellphone: '', website: '', contact_name: '',
    cep: '', state: '', city: '', neighborhood: '', address_line: '', number: '', complement: '',
    person_type: 'juridica' as 'fisica' | 'juridica',
    is_customer: true, is_supplier: false, 
    status: 'ativo' as 'ativo' | 'inativo' | 'pendente', salesperson_id: '', credit_limit: ''
  });

  const loadMetaData = useCallback(async () => {
    try {
        const [usersRes, rolesRes] = await Promise.all([api.get('/users/'), api.get('/roles/')]);
        setUsers(usersRes.data);
        const myRole = rolesRes.data.find((r: { slug: string; permissions?: { customer_change_status?: boolean } }) => r.slug === userRoleSlug);
        setCanChangeStatus(isAdmin || (myRole?.permissions?.customer_change_status === true));
        
        // Definir currentUserId
        const userEmail = localStorage.getItem('user_email');
        const currentUser = usersRes.data.find((u: User) => u.email === userEmail);
        setCurrentUserId(currentUser ? currentUser.id : null);
    } catch (error) {
      console.error('Erro ao carregar metadados:', error);
    }
  }, [userRoleSlug, isAdmin]);

  const loadNotes = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/customers/${id}/notes`);
      setNotes(data);
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    }
  }, [id]);

  const loadUser = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/customers/${id}`); 
      setFormData(data);
      setIsVerified(true);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      alert('Erro ao carregar cliente. Verifique se você tem permissão.');
    }
  }, [id]);

  useEffect(() => {
    loadMetaData();
    if (isEditing) loadUser();
    loadNotes();
  }, [loadMetaData, isEditing, loadUser, loadNotes]);

  // Para novos cadastros de vendedores, definir salesperson_id automaticamente
  useEffect(() => {
    if (!isEditing && userRoleSlug === 'sales' && currentUserId) {
      setFormData(prev => ({ ...prev, salesperson_id: currentUserId.toString() }));
    }
  }, [isEditing, userRoleSlug, currentUserId]); // Usar as funções memoizadas

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'document') {
        if (!isEditing) setIsVerified(false);
        const onlyNums = value.replace(/\D/g, '');
        const limit = formData.person_type === 'fisica' ? 11 : 14;
        if (onlyNums.length > limit) return;
        setFormData((prev) => ({ ...prev, [name]: onlyNums }));
        return; 
    }

    if (type === 'checkbox') {
        setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (type: 'fisica' | 'juridica') => {
      setFormData((prev) => ({ ...prev, person_type: type, document: '', fantasy_name: '', ie: '', rg: '' }));
      setIsVerified(false);
  };

  const checkDocument = async () => {
      if (isEditing || !formData.document) return;
      const docClean = formData.document;
      const requiredLen = formData.person_type === 'fisica' ? 11 : 14;
      
      if (docClean.length !== requiredLen) return;

      setVerifying(true);
      try {
          const res = await api.get(`/customers/verify/${docClean}`);
          if (res.data.exists) {
              alert(`ATENÇÃO: Este documento já está cadastrado: ${res.data.name}`);
              setIsVerified(false);
          } else {
              setIsVerified(true);
          }
      } catch (error) {
          console.error("Erro ao verificar documento", error);
      } finally {
          setVerifying(false);
      }
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (!data.erro) {
            setFormData((prev) => ({ 
                ...prev, 
                address_line: data.logradouro, 
                neighborhood: data.bairro, 
                city: data.localidade, 
                state: data.uf, 
                complement: data.complemento 
            }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally { 
        setLoadingCep(false); 
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de Campos Obrigatórios [Refinamento Fase 1]
    const required = ['name', 'document', 'city', 'state', 'phone', 'email'];
    const missing = required.filter(f => !(formData as any)[f]);
    if (missing.length > 0) {
        return alert("Os seguintes campos são obrigatórios: Nome, Documento, Cidade, UF, Telefone e Email.");
    }

    if (!formData.is_customer && !formData.is_supplier) return alert("Selecione Cliente ou Fornecedor");
    
    const payload = { 
        ...formData, 
        salesperson_id: formData.salesperson_id ? Number(formData.salesperson_id) : null 
    };

    // Para novos cadastros de vendedores, definir automaticamente o salesperson_id
    if (!isEditing && userRoleSlug === 'sales' && currentUserId) {
        payload.salesperson_id = currentUserId;
    }

    try {
      if (isEditing) await api.put(`/customers/${id}`, payload);
      else await api.post('/customers/', payload);
      navigate('/customers');
    } catch (error: unknown) {
      console.error('Erro completo ao salvar:', error);
      const err = error as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
      const errorMsg = err.response?.data?.detail;
      if (typeof errorMsg === 'string') alert(errorMsg);
      else if (Array.isArray(errorMsg)) alert(`Erro: ${errorMsg.map(e => e.msg).join(", ")}`);
      else alert("Erro ao salvar cadastro.");
    }
  };

  // --- Helpers Chat ---
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPosition(cursor);
    setNewNote(val);

    // Detectar menções (@)
    const beforeCursor = val.substring(0, cursor);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (userName: string) => {
    const beforeMention = newNote.substring(0, cursorPosition - mentionQuery.length - 1);
    const afterMention = newNote.substring(cursorPosition);
    const newText = `${beforeMention}@${userName} ${afterMention}`;
    setNewNote(newText);
    setShowMentions(false);
    setMentionQuery('');
    // Focar no input e posicionar cursor após a menção
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + userName.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentions) return;

    const filteredUsers = users.filter(u =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(prev => (prev + 1) % filteredUsers.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(prev => prev === 0 ? filteredUsers.length - 1 : prev - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filteredUsers[mentionIndex]) {
        handleMentionSelect(filteredUsers[mentionIndex].name);
      }
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };
  const handleAddNote = async (e: React.FormEvent) => {
      e.preventDefault(); if(!newNote.trim()) return;
      try { 
        await api.post(`/customers/${id}/notes`, { content: newNote, type: noteType, target_user_id: targetUserId }); 
        setNewNote(''); 
        setTargetUserId(null); 
        setNoteType('message'); 
        loadNotes(); 
      } catch (error) { 
        console.error('Erro ao enviar nota:', error);
        alert("Erro ao enviar."); 
      }
  };

  const handleTaskAction = async (noteId: number, action: 'start' | 'complete' | 'reopen') => {
    try {
      await api.patch(`/customers/${id}/notes/${noteId}/task`, { action });
      loadNotes();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      alert('Erro ao atualizar tarefa.');
    }
  };

  const getUserName = (id: number) => users.find(u => u.id === id)?.name || '-';

  const isPF = formData.person_type === 'fisica';

  return (
    <div className="max-w-5xl mx-auto pb-20 relative px-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={24} className="text-gray-600"/></button>
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Editar: ${formData.name}` : 'Novo Parceiro'}</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!isVerified} className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold transition shadow-sm ${!isVerified ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                <Save size={18} /> Salvar Cadastro
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* IDENTIDADE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                {isPF ? <User className="w-5 h-5 text-indigo-600" /> : <Building2 className="w-5 h-5 text-indigo-600" />}
                <h3 className="font-semibold text-gray-800">Identidade & Classificação</h3>
                {!isVerified && !isEditing && <span className="ml-auto text-xs font-bold text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded"><AlertTriangle size={12}/> Informe o Documento</span>}
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12 flex flex-wrap gap-4 items-center border-b border-gray-50 pb-4 mb-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button type="button" onClick={() => handleTypeChange('fisica')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${isPF ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pessoa Física</button>
                        <button type="button" onClick={() => handleTypeChange('juridica')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${!isPF ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pessoa Jurídica</button>
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" name="is_customer" checked={formData.is_customer} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" disabled={!isVerified}/> <span className="text-sm font-medium text-gray-700">Cliente</span></label>
                        <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" name="is_supplier" checked={formData.is_supplier} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" disabled={!isVerified}/> <span className="text-sm font-medium text-gray-700">Fornecedor</span></label>
                    </div>
                </div>

                <div className="md:col-span-4 relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isPF ? 'CPF *' : 'CNPJ *'}</label>
                    <input name="document" value={formData.document} onChange={handleChange} onBlur={checkDocument} className={`w-full p-2 border rounded focus:ring-2 outline-none font-mono ${!isVerified && !isEditing ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-300 focus:ring-indigo-500'}`} required placeholder={isPF ? "00000000000" : "00000000000000"} />
                    {verifying && <span className="absolute right-2 top-8 text-xs text-indigo-600 font-bold animate-pulse">Buscando...</span>}
                </div>

                <div className={`md:col-span-8 ${!isVerified ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isPF ? 'Nome Completo *' : 'Razão Social *'}</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>

                {!isPF && (
                    <div className={`md:col-span-6 ${!isVerified ? 'opacity-40 pointer-events-none' : ''}`}>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Fantasia</label>
                        <input name="fantasy_name" value={formData.fantasy_name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                )}
                
                <div className={`md:col-span-3 ${!isVerified ? 'opacity-40 pointer-events-none' : ''}`}>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isPF ? 'RG' : 'I.E.'}</label>
                    <input name={isPF ? 'rg' : 'ie'} value={isPF ? formData.rg : formData.ie} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            </div>
        </div>

        {/* COMUNICAÇÃO */}
        <FormSection title="Canais de Comunicação" icon={Phone} disabled={!isVerified}>
            <div className="md:col-span-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Mail size={12}/> Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Phone size={12}/> Telefone *</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Smartphone size={12}/> WhatsApp</label>
                <input name="cellphone" value={formData.cellphone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
        </FormSection>

        {/* LOCALIZAÇÃO */}
        <FormSection title="Localização" icon={MapPin} disabled={!isVerified}>
            <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                <input name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
                {loadingCep && <span className="absolute right-2 top-8 text-xs text-indigo-600">...</span>}
            </div>
            <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade *</label>
                <input name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-gray-300 bg-gray-50 rounded outline-none" required />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UF *</label>
                <input name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border border-gray-300 bg-gray-50 rounded outline-none" required />
            </div>
            <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                <input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none" />
            </div>
            <div className="md:col-span-8">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label>
                <input name="address_line" value={formData.address_line} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none" />
            </div>
            <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nº</label>
                <input name="number" id="number-input" value={formData.number} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none" />
            </div>
        </FormSection>

        {/* PERFIL OPERACIONAL */}
        <FormSection title="Perfil Operacional" icon={FileText} disabled={!isVerified}>
             <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">Status {!canChangeStatus && <Lock size={10}/>}</label>
                <select name="status" value={formData.status} onChange={handleChange} disabled={!canChangeStatus} className={`w-full p-2 border rounded outline-none ${!canChangeStatus ? 'bg-gray-100 text-gray-400' : 'bg-white border-gray-300'}`}>
                    <option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="pendente">Pendente</option>
                </select>
            </div>
             <div className="md:col-span-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendedor Responsável</label>
                {canTransfer ? (
                    <select name="salesperson_id" value={formData.salesperson_id || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">(Sem vendedor)</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                ) : (
                    <input disabled value={formData.salesperson_id ? getUserName(Number(formData.salesperson_id)) : 'Eu'} className="w-full p-2 border bg-gray-100 text-gray-500 rounded" />
                )}
            </div>
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Limite Crédito (R$)</label>
                <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded outline-none" />
            </div>
        </FormSection>
      </form>

      {/* TIMELINE */}
      {isEditing && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 p-4"><h3 className="font-bold text-gray-700 flex items-center gap-2"><MessageSquare size={18}/> Linha do Tempo</h3></div>
              <div className="p-6">
                  <form onSubmit={handleAddNote} className="mb-8">
                      <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setNoteType('message')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${noteType === 'message' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            💬 Mensagem
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoteType('task')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${noteType === 'task' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            ✓ Tarefa
                          </button>
                      </div>

                      {noteType === 'task' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Atribuir para:</label>
                          <select
                            value={targetUserId || ''}
                            onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Selecione um usuário</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                              <input
                                ref={inputRef}
                                type="text"
                                placeholder={noteType === 'task' ? "Descreva a tarefa..." : "Digite uma mensagem... Use @ para mencionar"}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newNote}
                                onChange={handleNoteChange}
                                onKeyDown={handleKeyDown}
                              />
                              {showMentions && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                                  {users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).map((user, index) => (
                                    <div
                                      key={user.id}
                                      className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${index === mentionIndex ? 'bg-indigo-50' : ''}`}
                                      onClick={() => handleMentionSelect(user.name)}
                                    >
                                      <span className="font-medium">{user.name}</span>
                                      <span className="text-gray-500 text-sm ml-2">@{user.name.toLowerCase().replace(/\s+/g, '')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg flex items-center gap-2"><Send size={18}/> Enviar</button>
                      </div>
                  </form>

                  <div className="space-y-4">
                      {notes.map(note => (
                          <div key={note.id} className={`border-l-4 pl-4 py-3 rounded-r-lg ${note.type === 'task' ? 'border-amber-400 bg-amber-50' : 'border-indigo-200 bg-indigo-50'}`}>
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-800">{note.user_name}</span>
                                      {note.type === 'task' && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                          note.task_status === 'completed' ? 'bg-green-100 text-green-700' :
                                          note.task_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {note.task_status === 'completed' ? '✓ Concluída' :
                                           note.task_status === 'in_progress' ? '▶ Em Progresso' :
                                           '○ Pendente'}
                                        </span>
                                      )}
                                      {note.target_user_id && (
                                        <span className="text-xs text-gray-600">→ {getUserName(note.target_user_id)}</span>
                                      )}
                                  </div>
                                  <span className="text-gray-400 text-xs">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-gray-700 text-sm mb-2">{note.content}</p>
                              
                              {note.type === 'task' && (
                                <div className="flex gap-2 mt-3">
                                  {note.task_status === 'pending' && (
                                    <button
                                      onClick={() => handleTaskAction(note.id, 'start')}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition"
                                    >
                                      ▶ Iniciar
                                    </button>
                                  )}
                                  {note.task_status === 'in_progress' && (
                                    <button
                                      onClick={() => handleTaskAction(note.id, 'complete')}
                                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition"
                                    >
                                      ✓ Concluir
                                    </button>
                                  )}
                                  {note.task_status === 'completed' && (
                                    <button
                                      onClick={() => handleTaskAction(note.id, 'reopen')}
                                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition"
                                    >
                                      ↻ Reabrir
                                    </button>
                                  )}
                                </div>
                              )}

                              {(note.started_at || note.completed_at) && (
                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                  {note.started_at && <div>Iniciada: {new Date(note.started_at).toLocaleString()}</div>}
                                  {note.completed_at && <div>Concluída: {new Date(note.completed_at).toLocaleString()}</div>}
                                </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}