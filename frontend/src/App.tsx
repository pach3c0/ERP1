import { useState } from 'react';
import api from './api';
import Dashboard from './components/Dashboard'; // <--- Importe o novo componente
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await api.post('/auth/login', formData);
      const newToken = response.data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } catch (err) {
      setError('Login falhou. Verifique e-mail e senha.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // --- MUDANÇA AQUI: Renderiza o Dashboard ---
  if (token) {
    return (
      <div>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>ERP Agent</h1>
          <button onClick={handleLogout} style={{ background: '#333' }}>Sair</button>
        </header>
        <Dashboard />
      </div>
    );
  }
  // -------------------------------------------

  return (
    <div className="card">
      <h1>Login ERP</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required
        />
        <input 
          type="password" placeholder="Sua Senha" value={password} onChange={(e) => setPassword(e.target.value)} required
        />
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;