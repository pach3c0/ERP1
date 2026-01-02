import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componentes Principais
import Login from './components/Login';
import Layout from './components/Layout';
import Home from './components/Home';
import UsersPage from './components/Users';

// Componentes de Clientes
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';

// Componentes Novos
import Settings from './components/Settings';
import FinancialProfile from './components/FinancialProfile';
import CRMProfile from './components/CRMProfile';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // ATUALIZADO: Salva 4 itens
  const handleLoginSuccess = (newToken: string, newRole: string, name: string, email: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_email', email);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
        
        {token ? (
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={<Home />} />
            
            {/* Usuários (Admin) */}
            <Route path="/users" element={<UsersPage />} />

            {/* Clientes */}
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/new" element={<CustomerForm />} />
            <Route path="/customers/:id" element={<CustomerForm />} />

            {/* Módulos Novos */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/financial/:id" element={<FinancialProfile />} />
            <Route path="/crm/:id" element={<CRMProfile />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;