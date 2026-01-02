import { useEffect, useState } from 'react';
import api from '../api';

interface Customer {
  id: number;
  name: string;
  document: string;
  email: string;
}

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  // Carrega clientes ao abrir a tela
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error("Erro ao carregar clientes");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      // Envia para o backend (O ID do usuário vai automático pelo Token)
      await api.post('/customers/', { name, document, email });
      setMsg('Cliente cadastrado com sucesso!');
      setName('');
      setDocument('');
      setEmail('');
      loadCustomers(); // Atualiza a lista
    } catch (error: any) {
      setMsg(error.response?.data?.detail || 'Erro ao cadastrar');
    }
  };

  return (
    <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Gestão de Clientes</h2>
      
      {/* Formulário de Cadastro */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Novo Cliente</h3>
        <form onSubmit={handleRegister} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            placeholder="Nome da Empresa/Pessoa" 
            value={name} onChange={e => setName(e.target.value)} required 
          />
          <input 
            placeholder="CPF ou CNPJ" 
            value={document} onChange={e => setDocument(e.target.value)} required 
          />
          <input 
            placeholder="Email (Opcional)" 
            value={email} onChange={e => setEmail(e.target.value)} 
          />
          <button type="submit">Cadastrar</button>
        </form>
        {msg && <p style={{ color: msg.includes('sucesso') ? 'green' : 'red' }}>{msg}</p>}
      </div>

      {/* Listagem */}
      <div className="card">
        <h3>Lista de Clientes</h3>
        {customers.length === 0 ? (
          <p>Nenhum cliente cadastrado.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Documento</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '8px' }}>{c.name}</td>
                  <td style={{ padding: '8px' }}>{c.document}</td>
                  <td style={{ padding: '8px' }}>{c.email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}