import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Componentes
import Login from './components/Login';
import Layout from './components/Layout';
import Home from './components/Home';

// Users
import UserList from './components/UserList';
import UserForm from './components/UserForm';

// Customers
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';

// Products & Services
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import ServiceList from './components/ServiceList';
import ServiceForm from './components/ServiceForm';

// Módulos Extras
import Settings from './components/Settings';
import FinancialProfile from './components/FinancialProfile';
import CRMProfile from './components/CRMProfile';
import AuditView from './components/AuditView';
import TrashView from './components/TrashView'; 

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const handleLoginSuccess = (newToken: string, newRole: string, name: string, email: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_email', email);
    setToken(newToken);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    setToken(null);
  }, []);

  // Monitor de Inatividade (10 minutos)
  useEffect(() => {
    if (!token) return;
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => handleLogout(), 600000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeout) clearTimeout(timeout);
    };
  }, [token, handleLogout]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
        
        {token ? (
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route path="/" element={<Home />} />
            
            <Route path="/users" element={<UserList />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id" element={<UserForm />} />

            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/new" element={<CustomerForm />} />
            <Route path="/customers/:id" element={<CustomerForm />} />

            <Route path="/products" element={<ProductList />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id" element={<ProductForm />} />

            <Route path="/services" element={<ServiceList />} />
            <Route path="/services/new" element={<ServiceForm />} />
            <Route path="/services/:id" element={<ServiceForm />} />

            {/* NOVA ROTA DE AUDITORIA: Adicionada para evitar o redirecionamento para Home */}
            <Route path="/audit/customer/:id" element={<AuditView />} /> 

            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/trash" element={<TrashView />} />
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