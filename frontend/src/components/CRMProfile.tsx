import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Briefcase, Calendar, MessageSquare, CheckCircle, Clock, Plus, X, AtSign } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

interface Note {
  id: number;
  content: string;
  type: string; // 'message' ou 'task'
  task_status: string; // 'pending', 'in_progress', 'completed'
  created_at: string;
  user_name: string;
  created_by_id: number;
  target_user_id?: number;
  read_at?: string;
  started_at?: string;
  completed_at?: string;
}

interface Customer {
  id: number;
  name: string;
  fantasy_name?: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

export default function CRMProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', type: 'message' });
  const [filter, setFilter] = useState<'all' | 'message' | 'task'>('all');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [caretPos, setCaretPos] = useState<number | null>(null);
  const currentUserName = useMemo(() => localStorage.getItem('user_name') || '', []);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get('/users/');
        setUsers(res.data);
      } catch (error) {
        console.error('Erro ao carregar usuários para menções:', error);
      }
    };
    loadUsers();
  }, []);

  const loadData = async () => {
    try {
      const [notesRes, customerRes] = await Promise.all([
        api.get(`/customers/${id}/notes`),
        api.get(`/customers/${id}`)
      ]);
      setNotes(notesRes.data);
      setCustomer(customerRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim()) return;

    try {
      await api.post(`/customers/${id}/notes`, newNote);
      setNewNote({ content: '', type: 'message' });
      setShowForm(false);
      setMentionQuery('');
      setMentionStart(null);
      loadData();
    } catch (error) {
      console.error('Erro ao criar nota:', error);
    }
  };

  const getIcon = (note: Note) => {
    if (note.type === 'task') {
      if (note.task_status === 'completed') return <CheckCircle size={18} className="text-green-600" />;
      if (note.task_status === 'in_progress') return <Clock size={18} className="text-yellow-600" />;
      return <Calendar size={18} className="text-blue-600" />;
    }
    return <MessageSquare size={18} className="text-gray-600" />;
  };

  const getBg = (note: Note) => {
    if (note.type === 'task') {
      if (note.task_status === 'completed') return 'bg-green-100';
      if (note.task_status === 'in_progress') return 'bg-yellow-100';
      return 'bg-blue-100';
    }
    return 'bg-gray-100';
  };

  const statusLabel = (status: string) => {
    if (status === 'completed') return 'Concluída';
    if (status === 'in_progress') return 'Em Andamento';
    return 'Pendente';
  };

  const handleTaskAction = async (noteId: number, action: 'start' | 'complete' | 'reopen') => {
    try {
      await api.patch(`/customers/${id}/notes/${noteId}/task`, { action });
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  const filteredNotes = notes.filter(note => filter === 'all' || note.type === filter);

  const filteredSuggestions = mentionQuery
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    setNewNote({ ...newNote, content: value });
    const pos = selectionStart ?? value.length;
    setCaretPos(pos);

    const beforeCursor = value.slice(0, pos);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]{1,30})$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(pos - match[1].length - 1);
    } else {
      setMentionQuery('');
      setMentionStart(null);
    }
  };

  const handlePickSuggestion = (user: UserOption) => {
    if (mentionStart === null) return;
    const content = newNote.content;
    const start = mentionStart + 1; // after @
    const end = caretPos ?? content.length;
    const newContent = `${content.slice(0, start)}${user.name}${content.slice(end)} `;
    setNewNote({ ...newNote, content: newContent });
    setMentionQuery('');
    setMentionStart(null);
  };

  const renderContent = (note: Note) => {
    if (!currentUserName) return note.content;
    const escaped = currentUserName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const splitRegex = new RegExp(`(@${escaped})`, 'gi');
    const highlightRegex = new RegExp(`@${escaped}`, 'i');
    const parts = note.content.split(splitRegex);
    return parts.map((part, idx) =>
      highlightRegex.test(part) ? (
        <span key={idx} className="bg-yellow-100 text-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-600">Carregando...</div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <button 
        onClick={() => navigate('/customers')} 
        className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800 transition"
      >
        <ArrowLeft size={20}/> Voltar para Lista
      </button>
      
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="text-blue-600" size={24}/></div>
            CRM - {customer?.name || `Cliente #${id}`}
          </h1>
          <p className="text-gray-500 mt-1 ml-14">Acompanhamento de negociações e interações.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition shadow-sm flex items-center gap-2"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Nova Interação'}
        </button>
      </div>

      {/* Formulário de Nova Nota */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-lg mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Nova Interação</h3>
          <form onSubmit={handleCreateNote}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="message"
                    checked={newNote.type === 'message'}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Mensagem/Nota</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="task"
                    checked={newNote.type === 'task'}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Tarefa</span>
                </label>
              </div>
            </div>
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo</label>
              <textarea
                value={newNote.content}
                onChange={handleContentChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Descreva a interação, reunião, tarefa... Use @nome para mencionar colegas."
                required
              />
              {mentionQuery && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuggestions.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePickSuggestion(user);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <AtSign size={14} className="text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800">{user.name}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos ({notes.length})
        </button>
        <button
          onClick={() => setFilter('message')}
          className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${filter === 'message' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Mensagens ({notes.filter(n => n.type === 'message').length})
        </button>
        <button
          onClick={() => setFilter('task')}
          className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${filter === 'task' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tarefas ({notes.filter(n => n.type === 'task').length})
        </button>
      </div>

      {/* Timeline */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma interação registrada ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Nova Interação" para começar.</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
          {filteredNotes.map((note) => {
            const isMentioned = currentUserName && note.content.toLowerCase().includes(`@${currentUserName.toLowerCase()}`);
            return (
            <div key={note.id} className="relative pl-20">
              {/* Linha do Tempo Dot */}
              <div className={`absolute left-4 top-4 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${getBg(note)}`}>
                {getIcon(note)}
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${note.type === 'task' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {note.type === 'task' ? 'TAREFA' : 'MENSAGEM'}
                    </span>
                    {note.type === 'task' && (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        note.task_status === 'completed' ? 'bg-green-100 text-green-700' :
                        note.task_status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {statusLabel(note.task_status)}
                      </span>
                    )}
                    {isMentioned && (
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Você foi mencionado
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {new Date(note.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">{renderContent(note)}</p>
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                      {note.user_name.charAt(0).toUpperCase()}
                    </div>
                    Registrado por {note.user_name}
                  </div>
                  {note.type === 'task' && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {note.task_status === 'pending' && (
                        <button
                          onClick={() => handleTaskAction(note.id, 'start')}
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          Iniciar
                        </button>
                      )}
                      {note.task_status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleTaskAction(note.id, 'complete')}
                            className="px-3 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                          >
                            Concluir
                          </button>
                          <button
                            onClick={() => handleTaskAction(note.id, 'reopen')}
                            className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            Voltar para pendente
                          </button>
                        </>
                      )}
                      {note.task_status === 'completed' && (
                        <button
                          onClick={() => handleTaskAction(note.id, 'reopen')}
                          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          Reabrir tarefa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}