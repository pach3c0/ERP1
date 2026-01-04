import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';
import { Users, Building2, User, Activity, Trash2, MessageSquare, Plus, AtSign, RefreshCw, Send, Filter, X, MessageCircle, Loader, Link, Image, Smile } from 'lucide-react';

interface FeedItem {
  id: number;
  content: string;
  icon: string;
  created_at: string;
  user_name: string;
  visibility: string;
}

interface SystemUser { id: number; name: string; }

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Home() {
  const [stats, setStats] = useState({ total: 0, pf: 0, pj: 0 });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Postagem
  const [newPost, setNewPost] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // Filtros
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [filterUser, setFilterUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Chatbot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Olá! Sou o assistente do ERP. Como posso ajudá-lo?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Rich Post Editor
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const emojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🚀', '💪', '🙏', '👏', '😎'];

  // Função para extrair ID do YouTube
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Função para renderizar conteúdo com embeds
  const renderContent = (content: string) => {
    const youtubeIdMatch = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+/);
    if (youtubeIdMatch) {
      const youtubeUrl = youtubeIdMatch[0];
      const videoId = extractYouTubeId(youtubeUrl);
      
      return (
        <div className="space-y-3">
          <p className="text-gray-800 leading-snug">{content.replace(youtubeUrl, '').trim()}</p>
          {videoId && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
              <iframe
                width="100%"
                height="300"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      );
    }
    return <p className="text-gray-800 leading-snug">{content}</p>;
  };

  const userRole = localStorage.getItem('role') || 'visitante';
  const isSales = userRole === 'sales';

  const loadFeed = useCallback(async () => {
      let query = '/feed/?';
      if (filterUser) query += `user_id=${filterUser}&`;
      if (startDate) query += `start_date=${startDate}&`;
      if (endDate) query += `end_date=${endDate}&`;
      
      try { const { data } = await api.get(query); setFeed(data); } catch (error) { console.error('Erro ao carregar feed:', error); }
  }, [filterUser, startDate, endDate]);

  const loadData = useCallback(async () => {
    try {
        const { data } = await api.get('/dashboard/stats');
        setStats(data);
        loadFeed();
    } catch (error) { console.error('Erro ao carregar dados:', error); } 
    finally { setLoading(false); }
  }, [loadFeed]);

  const loadUsers = useCallback(async () => {
      try { const { data } = await api.get('/users/'); setUsers(data); } catch (error) { console.error('Erro ao carregar usuários:', error); }
  }, []);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [loadData, loadUsers]);

  useEffect(() => {
      loadFeed();
  }, [loadFeed]);

  // Listener para atualizações em tempo real do feed via WebSocket
  useEffect(() => {
    const handleFeedUpdate = (event: CustomEvent) => {
      const data = event.detail;
      if (data.type === 'feed_update' && data.action === 'new_post') {
        console.log('📢 Feed update received:', data.post);
        // Recarregar o feed para mostrar a nova postagem
        loadFeed();
      }
    };

    window.addEventListener('erp-notification', handleFeedUpdate as EventListener);
    
    return () => {
      window.removeEventListener('erp-notification', handleFeedUpdate as EventListener);
    };
  }, [loadFeed]);

  const handlePost = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newPost.trim()) return;
      try {
          await api.post('/feed/', { content: newPost });
          setNewPost('');
          loadFeed();
      } catch (error) { console.error('Erro ao postar:', error); alert("Erro ao postar."); }
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPosition(cursor);
    setNewPost(val);

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
    const beforeMention = newPost.substring(0, cursorPosition - mentionQuery.length - 1);
    const afterMention = newPost.substring(cursorPosition);
    const newText = `${beforeMention}@${userName} ${afterMention}`;
    setNewPost(newText);
    setShowMentions(false);
    setMentionQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const clearFilters = () => {
      setFilterUser('');
      setStartDate('');
      setEndDate('');
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'plus': return <Plus size={16} className="text-green-600"/>;
          case 'trash': return <Trash2 size={16} className="text-red-600"/>;
          case 'refresh-cw': return <RefreshCw size={16} className="text-orange-600"/>;
          case 'message-circle': return <MessageSquare size={16} className="text-blue-600"/>;
          case 'at-sign': return <AtSign size={16} className="text-purple-600"/>;
          default: return <Activity size={16} className="text-gray-600"/>;
      }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      sender: 'user',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    // Simular resposta do bot
    setTimeout(() => {
      const responses = [
        'Entendi! Deixe-me ajudá-lo com isso.',
        'Ótima pergunta! Aqui está o que você precisa saber...',
        'Perfeito! Estou processando sua solicitação.',
        'Com certeza! Como posso ser mais útil?',
        'Excelente! Vou verificar os detalhes para você.',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMessage]);
      setChatLoading(false);
    }, 500);
  };

  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newText = newPost.substring(0, start) + emoji + newPost.substring(end);
      setNewPost(newText);
      setShowEmojiPicker(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const insertLink = () => {
    if (linkInput.trim()) {
      const linkText = linkTitle || linkInput;
      const markdown = `[${linkText}](${linkInput})`;
      const start = textareaRef.current?.selectionStart || newPost.length;
      const newText = newPost.substring(0, start) + markdown + newPost.substring(start);
      setNewPost(newText);
      setLinkInput('');
      setLinkTitle('');
      setShowLinkModal(false);
      textareaRef.current?.focus();
    }
  };

  const insertImage = () => {
    const imageUrl = prompt('Cole a URL da imagem:');
    if (imageUrl && imageUrl.trim()) {
      const markdown = `![Imagem](${imageUrl})`;
      const start = textareaRef.current?.selectionStart || newPost.length;
      const newText = newPost.substring(0, start) + markdown + newPost.substring(start);
      setNewPost(newText);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="flex gap-6">
      {/* Coluna Principal */}
      <div className="flex-1 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Visão Geral</h1>
            <p className="text-gray-500">
              {isSales ? 'Acompanhe o desempenho da sua carteira.' : 'Visão global dos parceiros cadastrados.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">Total</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.total}</p></div>
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">PF</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.pf}</p></div>
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><User size={20} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div><h3 className="text-gray-500 text-sm font-medium">PJ</h3><p className="text-3xl font-bold text-gray-800 mt-2">{loading ? '...' : stats.pj}</p></div>
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><Building2 size={20} /></div>
            </div>
          </div>

          {/* FEED - Rede Social */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              
              {/* Header Feed */}
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2"><Activity size={18}/> Rede Social do Sistema</h3>
                  <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded hover:bg-gray-200 transition ${showFilters ? 'bg-gray-200 text-blue-600' : 'text-gray-500'}`}>
                      <Filter size={16}/>
                  </button>
              </div>

              {/* Área de Postagem */}
              <div className="p-4 border-b border-gray-100 bg-white">
                  <form onSubmit={handlePost} className="space-y-3">
                      <div className="relative">
                          <textarea
                            ref={textareaRef}
                            placeholder="Escreva algo no mural... Use @ para mencionar"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 resize-none min-h-[120px] max-h-[200px]"
                            value={newPost}
                            onChange={handlePostChange}
                            onKeyDown={handleKeyDown}
                          />
                          {showMentions && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                              {users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).map((user, index) => (
                                <div
                                  key={user.id}
                                  className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${index === mentionIndex ? 'bg-blue-50' : ''}`}
                                  onClick={() => handleMentionSelect(user.name)}
                                >
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-gray-500 text-sm ml-2">@{user.name.toLowerCase().replace(/\s+/g, '')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Barra de Ferramentas */}
                      <div className="flex gap-2 items-center">
                          {/* Emoji Picker */}
                          <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                title="Adicionar emoji"
                              >
                                <Smile size={18}/>
                              </button>
                              {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 mb-2 grid grid-cols-6 gap-1 z-10">
                                  {emojis.map(emoji => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => insertEmoji(emoji)}
                                      className="text-xl hover:bg-gray-100 p-1 rounded cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>

                          {/* Link Button */}
                          <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowLinkModal(!showLinkModal)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                title="Adicionar link"
                              >
                                <Link size={18}/>
                              </button>
                              {showLinkModal && (
                                <div className="absolute bottom-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mb-2 w-64 z-10">
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      placeholder="URL do vídeo ou link"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-400"
                                      value={linkInput}
                                      onChange={e => setLinkInput(e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Título do link (opcional)"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm outline-none focus:border-blue-400"
                                      value={linkTitle}
                                      onChange={e => setLinkTitle(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={insertLink}
                                        className="flex-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700 transition"
                                      >
                                        Adicionar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowLinkModal(false);
                                          setLinkInput('');
                                          setLinkTitle('');
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 text-xs py-1 rounded hover:bg-gray-300 transition"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Image Button */}
                          <button
                            type="button"
                            onClick={insertImage}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title="Adicionar imagem"
                          >
                            <Image size={18}/>
                          </button>

                          <div className="flex-1"></div>

                          {/* Submit Button */}
                          <button 
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
                            disabled={!newPost.trim()}
                          >
                            <Send size={16}/>
                            Postar
                          </button>
                      </div>
                  </form>
              </div>

              {/* Filtros Expansíveis */}
              {showFilters && (
                  <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3 text-sm animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase">
                          <span>Filtrar por</span>
                          <button onClick={clearFilters} className="text-red-500 hover:underline flex items-center gap-1"><X size={12}/> Limpar</button>
                      </div>
                      <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full p-2 border rounded bg-white">
                          <option value="">Todos os Usuários</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-gray-400">De:</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded bg-white"/></div>
                          <div><label className="text-xs text-gray-400">Até:</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded bg-white"/></div>
                      </div>
                  </div>
              )}

              {/* Lista do Feed */}
              <div className="overflow-y-auto p-4 space-y-4 max-h-[600px]">
                  {feed.length === 0 ? <p className="text-gray-400 text-sm text-center mt-10">Nenhuma atividade encontrada.</p> : feed.map(item => (
                      <div key={item.id} className="flex gap-3 items-start text-sm group bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="mt-1 min-w-[24px] h-6 bg-white rounded-full flex items-center justify-center group-hover:bg-blue-50 transition border border-gray-200">
                              {getIcon(item.icon)}
                          </div>
                          <div className="flex-1">
                              <p className="text-gray-700 font-semibold text-sm">{item.user_name}</p>
                              {renderContent(item.content.replace(item.user_name, '').trim())}
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                                  {item.visibility === 'admin_manager' && <span className="text-[10px] border border-gray-200 text-gray-400 px-1 rounded">Privado</span>}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Sidebar Direita - Chatbot */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] sticky top-20">
          
          {/* Header Chatbot */}
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle size={18} className="text-blue-600"/>
              </div>
              <div>
                  <h3 className="font-bold text-white">Assistente ERP</h3>
                  <p className="text-xs text-blue-100">Sempre disponível</p>
              </div>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                      </div>
                  </div>
              ))}
              {chatLoading && (
                  <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                          <Loader size={14} className="animate-spin"/>
                          <span className="text-sm">Digitando...</span>
                      </div>
                  </div>
              )}
          </div>

          {/* Input Chat */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                      type="text"
                      placeholder="Escreva sua mensagem..."
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                  />
                  <button 
                      className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={chatLoading}
                  >
                      <Send size={16}/>
                  </button>
              </form>
          </div>
      </div>
    </div>
  );
}