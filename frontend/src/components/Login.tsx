import React, { useState } from 'react';
import api from '../api';

interface LoginProps {
  // ATUALIZADO: Recebe 4 argumentos agora
  onLoginSuccess: (token: string, role: string, name: string, email: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await api.post('/auth/login', formData);
      
      // Dados vindos do Backend (Token + Role + Name + Email)
      const { access_token, role, name, email: userEmail } = response.data;
      
      // Passa tudo para o App.tsx salvar
      onLoginSuccess(access_token, role || 'visitante', name || 'Usuário', userEmail || '');

    } catch (error) {
      console.error('Erro no login:', error);
      setError('Login falhou. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">ERP Agent</h1>
          <p className="text-gray-500 mt-2">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="w-full px-4 py-2 input-touch border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" required className="w-full px-4 py-2 input-touch border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
          <button type="submit" disabled={loading} className={`w-full py-3 px-4 btn-touch bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}