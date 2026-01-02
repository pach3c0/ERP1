import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { 
  User, Building2, Search, Calendar, UserCheck, 
  ArrowLeft, Save, Lock, MessageSquare, Send, 
  Clock, Play, CheckCircle, Eye 
} from 'lucide-react';

// --- Interfaces ---
interface Customer {
  id: number;
  name: string;
  document: string;
  email: string;
  person_type: 'PF' | 'PJ';
  is_customer: boolean;
  is_supplier: boolean;
  status: string;
  created_at: string;
  salesperson_id: number;
  created_by_id: number;
  city: string; state: string; rg?: string; issuing_organ?: string; ie?: string; phone?: string; contact_name?: string; cep?: string; neighborhood?: string; address_line?: string; number?: string; complement?: string;
}

interface Note {
  id: number;
  content: string;
  user_name: string;
  created_at: string;
  // Campos de Tarefa
  type: 'message' | 'task';
  task_status: 'pending' | 'in_progress' | 'done';
  read_at?: string;
  started_at?: string;
  completed_at?: string;
}

interface SystemUser { id: number; name: string; }
interface Role { slug: string; permissions: { customer_change_status?: boolean } }

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // Estados
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [customerData, setCustomerData] = useState<Partial<Customer>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [canChangeStatus, setCanChangeStatus] = useState(false);

  // TIMELINE STATES
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'message' | 'task'>('message');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Permissões
  const userRoleSlug = localStorage.getItem('role') || 'visitante';
  const canTransfer = ['admin', 'manager'].includes(userRoleSlug);

  const [formData, setFormData] = useState({
    name: '', document: '', rg: '', issuing_organ: '', ie: '',
    email: '', phone: '', contact_name: '',
    cep: '', state: '', city: '', neighborhood: '', address_line: '', number: '', complement: '',
    person_type: 'PF' as 'PF' | 'PJ',
    is_customer: true, is_supplier: false, 
    status: 'ativo', salesperson_id: ''
  });

  useEffect(() => {
    loadMetaData();
    if (isEditing) {
      loadCustomer();
      loadNotes();
    }
  }, [id]);

  const loadMetaData = async () => {
    try {
        const [usersRes, rolesRes] = await Promise.all([api.get('/users/'), api.get('/roles/')]);
        setUsers(usersRes.data);
        const myRole = rolesRes.data.find((r: Role) => r.slug === userRoleSlug);
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
        setFormData({ ...found, 
            salesperson_id: found.salesperson_id ? String(found.salesperson_id) : '',
            // (Campos opcionais omitidos para brevidade, mas devem estar aqui como no anterior)
            email: found.email || '', phone: found.phone || '', contact_name: found.contact_name || '', rg: found.rg || '', issuing_organ: found.issuing_organ || '', ie: found.ie || '', cep: found.cep || '', city: found.city || '', state: found.state || '', neighborhood: found.neighborhood || '', address_line: found.address_line || '', number: found.number || '', complement: found.complement || ''
        });
      }
    } catch (e) { navigate('/customers'); }
  };

  const loadNotes = async () => {
      try { const { data } = await api.get(`/customers/${id}/notes`); setNotes(data); } catch (e) {}
  };

  // --- Handlers Básicos ---
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
            setFormData(prev => ({ ...prev, address_line: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf, complement: data.complemento }));
            document.getElementById('number-input')?.focus();
        }
      } catch (e) {} finally { setLoadingCep(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.is_customer && !formData.is_supplier) return alert("Selecione Cliente ou Fornecedor");
    const payload = { ...formData, salesperson_id: formData.salesperson_id ? Number(formData.salesperson_id) : null };
    try {
      if (isEditing) await api.put(`/customers/${id}`, payload);
      else await api.post('/customers/', payload);
      navigate('/customers');
    } catch (error: any) { alert(error.response?.data?.detail || "Erro ao salvar"); }
  };

  // --- LÓGICA DE TIMELINE AVANÇADA ---

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewNote(val);
    const match = val.match(/@(\w*)$/); // Detecta @Nome
    if (match) {
        setShowMentions(true);
        setMentionQuery(match[1].toLowerCase());
    } else {
        setShowMentions(false);
    }
  };

  const selectMention = (user: SystemUser) => {
    const newValue = newNote.replace(/@(\w*)$/, `@${user.name} `);
    setNewNote(newValue);
    setTargetUserId(user.id); // Salva o ID para notificar
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleAddNote = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newNote.trim()) return;
      try {
          await api.post(`/customers/${id}/notes`, { 
              content: newNote,
              type: noteType,
              target_user_id: targetUserId 
          });
          setNewNote('');
          setTargetUserId(null);
          setNoteType('message'); // Reseta para mensagem
          loadNotes();
      } catch (e) { alert("Erro ao enviar."); }
  };

  const handleTaskAction = async (noteId: number, action: string) => {
      try {
          await api.post(`/notes/${noteId}/action/${action}`);
          loadNotes();
      } catch (e) { alert("Erro ao atualizar tarefa."); }
  };

  const getUserName = (id: number) => users.find(u => u.id === id)?.name || '-';
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(mentionQuery));

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-full transition"><ArrowLeft size={24} className="text-gray-600"/></button>
            <h1 className="text-2xl font-bold text-gray-800">{isEditing ? `Editar: ${formData.name}` : 'Novo Cadastro'}</h1>
        </div>
        <button onClick={handleSubmit} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-md font-semibold transition shadow-sm"><Save size={18} /> Salvar</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center text-sm text-gray-500">
            <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_customer" checked={formData.is_customer} onChange={handleChange} className="w-4 h-4 text-green-600 rounded"/> <span className="font-medium text-gray-700">Cliente</span></label>
                 <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_supplier" checked={formData.is_supplier} onChange={handleChange} className="w-4 h-4 text-green-600 rounded"/> <span className="font-medium text-gray-700">Fornecedor</span></label>
            </div>
            {isEditing && (
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1"><Calendar size={14}/> Desde: <strong>{new Date(customerData.created_at || '').toLocaleDateString()}</strong></div>
                    <div className="flex items-center gap-1"><User size={14}/> Criado por: <strong>{getUserName(customerData.created_by_id || 0)}</strong></div>
                </div>
            )}
        </div>

        <form className="p-8 space-y-6">
            <div className="flex gap-4 border-b border-gray-100 pb-6">
                <button type="button" onClick={() => setFormData({...formData, person_type: 'PF'})} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${formData.person_type === 'PF' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white border border-gray-200 text-gray-600'}`}><User size={16}/> Pessoa Física</button>
                <button type="button" onClick={() => setFormData({...formData, person_type: 'PJ'})} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${formData.person_type === 'PJ' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white border border-gray-200 text-gray-600'}`}><Building2 size={16}/> Pessoa Jurídica</button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-2 relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">Status {!canChangeStatus && <Lock size={10} className="text-gray-400"/>}</label>
                    <select name="status" value={formData.status} onChange={handleChange} disabled={!canChangeStatus} className={`w-full px-3 py-2 border rounded-md outline-none focus:ring-1 focus:ring-green-500 ${!canChangeStatus ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'}`}>
                        <option value="ativo">🟢 Ativo</option><option value="inativo">🔴 Inativo</option><option value="pendente">🟡 Pendente</option>
                    </select>
                </div>
                <div className="col-span-6"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label><input name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div className="col-span-4"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documento</label><input name="document" value={formData.document} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><UserCheck size={14}/> Vendedor</label>
                    {canTransfer ? (
                        <select name="salesperson_id" value={formData.salesperson_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500">
                            <option value="">(Eu mesmo)</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    ) : (
                        <input disabled value={formData.salesperson_id ? getUserName(Number(formData.salesperson_id)) : 'Eu'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500" />
                    )}
                </div>
                <div className="col-span-6"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">IE/RG</label><input name={formData.person_type === 'PF' ? 'rg' : 'ie'} value={formData.person_type === 'PF' ? formData.rg : formData.ie} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>

            <div className="pt-4 border-t border-gray-100"><h3 className="text-sm font-bold text-gray-800">Endereço</h3></div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-2 relative"><label className="text-xs text-gray-500">CEP {loadingCep && '...'}</label><input name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /><Search className="absolute right-2 top-6 text-gray-400" size={16} /></div>
                <div className="col-span-5"><label className="text-xs text-gray-500">Endereço</label><input name="address_line" value={formData.address_line} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500">Número</label><input id="number-input" name="number" value={formData.number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div className="col-span-3"><label className="text-xs text-gray-500">Bairro</label><input name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                 <div className="col-span-4"><label className="text-xs text-gray-500">Complemento</label><input name="complement" value={formData.complement} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                 <div className="col-span-6"><label className="text-xs text-gray-500">Cidade</label><input name="city" value={formData.city} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" /></div>
                 <div className="col-span-2"><label className="text-xs text-gray-500">UF</label><input name="state" value={formData.state} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" /></div>
            </div>

            <div className="pt-4 border-t border-gray-100"><h3 className="text-sm font-bold text-gray-800">Contatos</h3></div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs text-gray-500">Email</label><input name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div><label className="text-xs text-gray-500">Telefone</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
                <div><label className="text-xs text-gray-500">Contato</label><input name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-green-500" /></div>
            </div>
        </form>
      </div>

      {/* --- TIMELINE (Mensagens e Tarefas) --- */}
      {isEditing && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 p-4">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><MessageSquare size={18}/> Linha do Tempo & Tarefas</h3>
              </div>
              
              <div className="p-6 bg-gray-50/50">
                  {/* Controles de Tipo */}
                  <div className="flex gap-4 mb-2">
                      <button type="button" onClick={() => setNoteType('message')} className={`text-sm font-bold px-3 py-1 rounded transition ${noteType === 'message' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Mensagem</button>
                      <button type="button" onClick={() => setNoteType('task')} className={`text-sm font-bold px-3 py-1 rounded transition ${noteType === 'task' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Tarefa</button>
                  </div>

                  {/* Input de Nota com Menu Flutuante */}
                  <form onSubmit={handleAddNote} className="mb-8 flex gap-2 relative">
                      
                      {/* MENU DE MENÇÃO FLUTUANTE */}
                      {showMentions && filteredUsers.length > 0 && (
                          <div className="absolute bottom-12 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400 uppercase border-b border-gray-100">Mencionar Usuário</div>
                              {filteredUsers.map(u => (
                                  <button key={u.id} type="button" onClick={() => selectMention(u)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2">
                                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>{u.name}
                                  </button>
                              ))}
                          </div>
                      )}

                      <input 
                        ref={inputRef}
                        type="text" 
                        placeholder={noteType === 'task' ? "Descreva a tarefa... Use @ para atribuir" : "Digite uma mensagem... Use @ para mencionar"}
                        className={`flex-1 px-4 py-3 rounded-lg border outline-none focus:ring-2 bg-white ${noteType === 'task' ? 'border-orange-200 focus:ring-orange-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        value={newNote}
                        onChange={handleNoteChange}
                      />
                      <button className={`text-white px-6 rounded-lg transition flex items-center gap-2 ${noteType === 'task' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        <Send size={18}/> Enviar
                      </button>
                  </form>

                  {/* Lista de Notas */}
                  <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                      {notes.map(note => (
                          <div key={note.id} className="relative pl-12">
                              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border-2 border-white ${note.type === 'task' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                  {note.type === 'task' ? <Clock size={14}/> : <MessageSquare size={14}/>}
                              </div>
                              <div className={`p-4 rounded-lg shadow-sm border ${note.type === 'task' ? 'bg-white border-orange-200' : 'bg-white border-gray-100'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <span className="font-bold text-gray-800 text-sm mr-2">{note.user_name}</span>
                                          <span className="text-xs text-gray-500">{note.type === 'task' ? 'criou uma tarefa' : 'comentou'} • {new Date(note.created_at).toLocaleString()}</span>
                                      </div>
                                      {/* Olho de Leitura */}
                                      {note.read_at && <div title={`Visualizado: ${new Date(note.read_at).toLocaleString()}`}><Eye size={16} className="text-blue-400"/></div>}
                                  </div>
                                  
                                  <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{note.content}</p>

                                  {/* ÁREA DA TAREFA BITRIX */}
                                  {note.type === 'task' && (
                                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                              <div className={note.read_at ? "text-blue-600 font-bold" : ""}>1. Visualizado</div>
                                              <div className={note.started_at ? "text-blue-600 font-bold" : ""}>2. Em Andamento</div>
                                              <div className={note.completed_at ? "text-green-600 font-bold" : ""}>3. Concluído</div>
                                          </div>

                                          <div className="flex gap-2">
                                              {note.task_status === 'pending' && (
                                                  <button type="button" onClick={() => handleTaskAction(note.id, 'start')} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition"><Play size={12}/> INICIAR</button>
                                              )}
                                              {note.task_status === 'in_progress' && (
                                                  <button type="button" onClick={() => handleTaskAction(note.id, 'finish')} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition"><CheckCircle size={12}/> FINALIZAR</button>
                                              )}
                                              {note.task_status === 'done' && (
                                                  <span className="flex items-center gap-1 text-green-700 font-bold text-xs bg-green-100 px-3 py-1 rounded"><CheckCircle size={12}/> TAREFA CONCLUÍDA</span>
                                              )}
                                          </div>
                                          
                                          <div className="mt-2 text-[10px] text-gray-400 space-y-1">
                                              {note.started_at && <div>Início: {new Date(note.started_at).toLocaleString()}</div>}
                                              {note.completed_at && <div>Fim: {new Date(note.completed_at).toLocaleString()}</div>}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                      {notes.length === 0 && <p className="text-gray-400 text-sm pl-12">Nenhuma observação ainda.</p>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}