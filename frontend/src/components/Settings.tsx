import { useEffect, useState } from 'react';
import api from '../api';
import { 
  Shield, Save, CheckCircle, XCircle, Info, Trash2, 
  Building2, Settings as SettingsIcon, Users, Briefcase, 
  DollarSign, Plug, FileText, ClipboardList, CreditCard,
  BarChart3, Package, Wrench
} from 'lucide-react';

type SettingsTab = 'sistema' | 'cadastros' | 'servicos' | 'financeiro' | 'dashboards' | 'integracoes' | 'permissoes';

interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: {
    // Visualização Clientes
    can_view_all_customers?: boolean;
    can_view_others_customers?: boolean;
    can_access_crm?: boolean;
    can_view_financial_data?: boolean;
    can_view_audit?: boolean;
    // Criação e Edição Clientes
    can_create_customers?: boolean;
    can_edit_own_customers?: boolean;
    can_edit_others_customers?: boolean;
    can_edit_financial_data?: boolean;
    can_transfer_customers?: boolean;
    // Status Clientes
    customer_change_status?: boolean;
    customer_require_approval?: boolean;
    // Exportação
    can_generate_report?: boolean;
    can_export_excel?: boolean;
    can_bulk_import?: boolean;
    // Timeline/CRM
    can_add_notes?: boolean;
    can_add_tasks?: boolean;
    can_complete_tasks?: boolean;
    can_edit_notes?: boolean;
    can_delete_notes?: boolean;
    // Exclusão
    can_delete_customers?: boolean;
    can_view_trash?: boolean;
    can_restore_deleted?: boolean;
    can_hard_delete?: boolean;
    // Produtos - Visualização
    can_view_products?: boolean;
    can_view_product_prices?: boolean;
    can_view_products_full_data?: boolean;
    // Produtos - Criação
    can_create_products?: boolean;
    // Produtos - Edição Granular
    can_edit_product_basic?: boolean;
    can_edit_product_prices?: boolean;
    can_edit_product_status?: boolean;
    can_edit_product_quantity?: boolean;
    // Produtos - Status
    can_change_product_status?: boolean;
    product_require_approval?: boolean;
    // Produtos - Exclusão
    can_delete_products?: boolean;
    can_soft_delete_products?: boolean;
    can_hard_delete_products?: boolean;
    // Produtos - Exportação
    can_export_products?: boolean;
    can_export_product_report?: boolean;
    can_view_product_history?: boolean;
    can_generate_product_analytics?: boolean;
    // Produtos - Ações em Massa
    can_bulk_edit_products?: boolean;
    can_bulk_delete_products?: boolean;
    can_bulk_import_products?: boolean;
    // Serviços - Visualização
    can_view_services?: boolean;
    can_view_service_prices?: boolean;
    // Serviços - Criação
    can_create_services?: boolean;
    // Serviços - Edição Granular
    can_edit_service_basic?: boolean;
    can_edit_service_prices?: boolean;
    can_edit_service_status?: boolean;
    // Serviços - Status
    can_change_service_status?: boolean;
    service_require_approval?: boolean;
    // Serviços - Exclusão
    can_delete_services?: boolean;
    can_soft_delete_services?: boolean;
    can_hard_delete_services?: boolean;
    // Serviços - Exportação
    can_export_services?: boolean;
    can_export_service_report?: boolean;
    can_view_service_history?: boolean;
    // Serviços - Ações em Massa
    can_bulk_edit_services?: boolean;
    can_bulk_delete_services?: boolean;
    [key: string]: unknown;
  };
}

export default function Settings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<SettingsTab>('sistema');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Pega o role do usuário logado
    const role = localStorage.getItem('role');
    setUserRole(role);
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles/');
      setRoles(data);
    } catch (error) {
      console.error("Erro ao carregar cargos", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (roleId: number, permissionKey: string) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permissionKey]: !role.permissions[permissionKey]
          }
        };
      }
      return role;
    }));
  };

  const savePermissions = async (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    try {
      console.log('Salvando permissões para role:', roleId);
      console.log('Dados enviados:', { permissions: role.permissions });
      
      const response = await api.put(`/roles/${roleId}/permissions`, { permissions: role.permissions });
      console.log('Resposta do servidor:', response.data);
      
      setMessage({ type: 'success', text: `Permissões de ${role.name} atualizadas!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      const errorDetail = (error as any)?.response?.data?.detail || 'Erro ao salvar permissões.';
      console.error('Detalhes do erro:', errorDetail);
      setMessage({ type: 'error', text: errorDetail });
    }
  };

  const renderPermissionCheckbox = (roleId: number, key: string, label: string, description: string) => (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
      <input 
        type="checkbox" 
        id={`${key}-${roleId}`}
        checked={!!roles.find(r => r.id === roleId)?.permissions[key]}
        onChange={() => handlePermissionChange(roleId, key)}
        className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
      />
      <label htmlFor={`${key}-${roleId}`} className="cursor-pointer flex-1">
        <span className="block text-sm font-bold text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{description}</span>
      </label>
    </div>
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;

  const menuItems = [
    { id: 'sistema' as SettingsTab, icon: Shield, label: 'Sistema', description: 'Permissões e Acesso (RBAC)' },
    { id: 'cadastros' as SettingsTab, icon: Users, label: 'Cadastros', description: 'Clientes, Fornecedores e Equipe' },
    { id: 'servicos' as SettingsTab, icon: Briefcase, label: 'Serviços', description: 'Ordens de Serviço e Contratos' },
    { id: 'financeiro' as SettingsTab, icon: DollarSign, label: 'Financeiro', description: 'Contas, Pagamentos e Comissões' },
    { id: 'permissoes' as SettingsTab, icon: Package, label: 'Produtos & Serviços', description: 'Permissões granulares de Produtos e Serviços' },
    { id: 'dashboards' as SettingsTab, icon: BarChart3, label: 'Dashboards', description: 'Relatórios e Indicadores' },
    { id: 'integracoes' as SettingsTab, icon: Plug, label: 'Integrações', description: 'APIs e Webhooks' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR DE NAVEGAÇÃO */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <SettingsIcon size={24} className="text-indigo-600" />
            Preferências
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configurações do sistema</p>
        </div>

        <div className="p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-4 rounded-lg transition flex items-start gap-3 ${
                  isActive 
                    ? 'bg-indigo-50 border-2 border-indigo-200' 
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
              {message.text}
            </div>
          )}

          {activeTab === 'sistema' && renderSistemaTab()}
          {activeTab === 'cadastros' && renderCadastrosTab()}
          {activeTab === 'servicos' && renderServicosTab()}
          {activeTab === 'financeiro' && renderFinanceiroTab()}
          {activeTab === 'permissoes' && renderPermissoesTab()}
          {activeTab === 'dashboards' && renderDashboardsTab()}
          {activeTab === 'integracoes' && renderIntegracoesTab()}
        </div>
      </div>
    </div>
  );

  // ==================== SISTEMA (RBAC) ====================
  function renderSistemaTab() {
    if (userRole !== 'admin') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-600 opacity-50" />
          <p className="text-lg font-bold text-red-700 mb-2">Acesso Restrito</p>
          <p className="text-red-600">Apenas administradores podem gerenciar permissões.</p>
          <p className="text-sm text-red-500 mt-4">Seu role atual: <strong>{userRole}</strong></p>
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-indigo-600" /> Controle de Acesso (RBAC)
          </h2>
          <p className="text-gray-500 text-sm">Defina o que cada nível de usuário pode visualizar ou editar no sistema.</p>
        </div>

        <div className="space-y-6">{roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{role.name}</h3>
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{role.slug}</span>
              </div>
              <button 
                onClick={() => savePermissions(role.id)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Save size={16} /> Salvar Alterações
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 👁️ VISUALIZAÇÃO */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  👁️ Visualização
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'can_view_all_customers', 'Ver todos os clientes', 'Acesso a toda base de clientes, não apenas os seus')}
                  {renderPermissionCheckbox(role.id, 'can_view_others_customers', 'Ver clientes de outros', 'Visualizar (somente leitura) clientes de outros vendedores')}
                  {renderPermissionCheckbox(role.id, 'can_access_crm', 'Acessar CRM/Timeline', 'Ver e interagir com timeline e histórico de clientes')}
                  {renderPermissionCheckbox(role.id, 'can_view_financial_data', 'Ver dados financeiros', 'Visualizar limite de crédito e informações financeiras')}
                  {renderPermissionCheckbox(role.id, 'can_view_audit', 'Ver auditoria', 'Acessar histórico de alterações e logs')}
                </div>
              </div>

              {/* ✏️ CRIAÇÃO E EDIÇÃO */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  ✏️ Criação e Edição
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'can_create_customers', 'Criar novos clientes', 'Cadastrar novos clientes/fornecedores no sistema')}
                  {renderPermissionCheckbox(role.id, 'can_edit_own_customers', 'Editar própria carteira', 'Alterar dados de clientes que cadastrou')}
                  {renderPermissionCheckbox(role.id, 'can_edit_others_customers', 'Editar outras carteiras', 'Alterar dados de clientes de outros vendedores')}
                  {renderPermissionCheckbox(role.id, 'can_edit_financial_data', 'Editar dados financeiros', 'Alterar limite de crédito e informações financeiras')}
                  {renderPermissionCheckbox(role.id, 'can_transfer_customers', 'Transferir clientes', 'Transferir clientes entre vendedores')}
                </div>
              </div>

              {/* ⚙️ STATUS E APROVAÇÃO */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  ⚙️ Status e Aprovação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'customer_change_status', 'Alterar status', 'Mudar entre Ativo, Inativo e Pendente')}
                  {renderPermissionCheckbox(role.id, 'customer_require_approval', 'Exigir aprovação', 'Novos cadastros entram como Pendente até aprovação')}
                </div>
              </div>

              {/* 📊 EXPORTAÇÃO E RELATÓRIOS */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  📊 Exportação e Relatórios
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'can_generate_report', 'Gerar relatório PDF', 'Exportar lista de clientes em PDF')}
                  {renderPermissionCheckbox(role.id, 'can_export_excel', 'Exportar para Excel', 'Exportar dados em formato Excel/CSV')}
                  {renderPermissionCheckbox(role.id, 'can_bulk_import', 'Importar em massa', 'Importar clientes via arquivo CSV')}
                </div>
              </div>

              {/* 💬 TIMELINE/CRM */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  💬 Timeline/CRM
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'can_add_notes', 'Adicionar mensagens', 'Criar mensagens no timeline do cliente')}
                  {renderPermissionCheckbox(role.id, 'can_add_tasks', 'Criar tarefas', 'Adicionar tarefas e lembretes')}
                  {renderPermissionCheckbox(role.id, 'can_complete_tasks', 'Completar tarefas', 'Marcar tarefas como concluídas')}
                  {renderPermissionCheckbox(role.id, 'can_edit_notes', 'Editar mensagens', 'Editar mensagens próprias no timeline')}
                  {renderPermissionCheckbox(role.id, 'can_delete_notes', 'Deletar mensagens', 'Remover mensagens do timeline')}
                </div>
              </div>

              {/* 🗑️ EXCLUSÃO */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  🗑️ Exclusão e Lixeira
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderPermissionCheckbox(role.id, 'can_delete_customers', 'Deletar clientes', 'Mover clientes para lixeira (soft delete)')}
                  {renderPermissionCheckbox(role.id, 'can_view_trash', 'Acessar lixeira', 'Ver clientes deletados na lixeira')}
                  {renderPermissionCheckbox(role.id, 'can_restore_deleted', 'Restaurar deletados', 'Restaurar clientes da lixeira')}
                  {renderPermissionCheckbox(role.id, 'can_hard_delete', 'Deletar permanentemente', 'Excluir definitivamente (irreversível)')}
                </div>
              </div>
            </div>
          </div>
        ))}</div>

        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Gerenciamento de Dados</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Lixeira de Cadastros</h3>
                    <p className="text-sm text-gray-600">Gerencie clientes excluídos - restaure ou exclua definitivamente</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/settings/trash'}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Trash2 size={16} />
                  Acessar Lixeira
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-sm text-blue-700">
            <strong>Dica:</strong> Administradores têm permissão total por padrão, independente destas marcações no banco de dados.
          </p>
        </div>
      </>
    );
  }

  // ==================== CADASTROS ====================
  function renderCadastrosTab() {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastros</h2>
          <p className="text-gray-500 text-sm">Gerencie clientes, fornecedores e equipe</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Clientes e Fornecedores - FUNCIONAL */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Clientes e fornecedores</h3>
                  <span className="text-xs text-green-600 font-semibold">✓ Funcional</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Cadastro completo com CRM, timeline e gestão de carteira</p>
            <button
              onClick={() => window.location.href = '/customers'}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
            >
              Acessar
            </button>
          </div>

          {/* Vendedores/Equipe - FUNCIONAL */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Vendedores e Equipe</h3>
                  <span className="text-xs text-green-600 font-semibold">✓ Funcional</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Gestão de usuários, cargos e hierarquia</p>
            <button
              onClick={() => window.location.href = '/users'}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
            >
              Acessar
            </button>
          </div>

          {/* Contas Financeiras - EM BREVE */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-700">Contas Financeiras</h3>
                  <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">Caixas, bancos e contas de movimentação</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>

          {/* Formas de Pagamento - EM BREVE */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-700">Formas de pagamento</h3>
                  <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">PIX, cartão, boleto, dinheiro, etc.</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>
        </div>

        {/* Ferramentas */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Ferramentas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Package size={16} />
                <span className="text-sm font-semibold">Categorias de serviços</span>
              </div>
              <p className="text-xs text-gray-500">Organize serviços por categoria</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <FileText size={16} />
                <span className="text-sm font-semibold">Tabelas de preços</span>
              </div>
              <p className="text-xs text-gray-500">Diferentes valores por cliente</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Trash2 size={16} />
                <span className="text-sm font-semibold">Ver lixeira</span>
              </div>
              <button
                onClick={() => window.location.href = '/settings/trash'}
                className="text-xs text-green-600 hover:text-green-700 font-semibold"
              >
                Acessar →
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ==================== SERVIÇOS ====================
  function renderServicosTab() {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Serviços</h2>
          <p className="text-gray-500 text-sm">Gerencie ordens de serviço, contratos e cobranças</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ordens de Serviço */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <Wrench size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Ordens de serviço</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Crie e gerencie OS com status e timeline</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>

          {/* Contratos */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Contratos</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Contratos recorrentes com renovação automática</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>

          {/* Notas de Serviço (NFS-e) */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Notas de serviço (NFS-e)</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Emissão de notas fiscais de serviço</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>

          {/* Cobranças */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Cobranças</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Gestão de cobranças recorrentes</p>
            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
              Em desenvolvimento
            </button>
          </div>
        </div>

        {/* Relatórios */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <BarChart3 size={18} />
            <span className="font-semibold text-sm">Relatórios de serviço</span>
          </div>
          <p className="text-xs text-blue-600">Análises de produtividade, faturamento e tempo de execução estarão disponíveis em breve.</p>
        </div>
      </>
    );
  }

  // ==================== FINANCEIRO ====================
  function renderFinanceiroTab() {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Financeiro</h2>
          <p className="text-gray-500 text-sm">Gestão de contas, pagamentos e comissões</p>
        </div>

        <div className="space-y-6">
          {/* Gestão Financeira */}
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">Gestão financeira</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <CreditCard size={16} />
                  <span className="text-sm font-semibold">Caixas e bancos</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Controle de saldo e movimentações</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <ClipboardList size={16} />
                  <span className="text-sm font-semibold">Contas a pagar</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Gestão de despesas e pagamentos</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <ClipboardList size={16} />
                  <span className="text-sm font-semibold">Contas a receber</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Gestão de receitas e recebimentos</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <DollarSign size={16} />
                  <span className="text-sm font-semibold">Comissões</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Cálculo automático de comissões</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <CreditCard size={16} />
                  <span className="text-sm font-semibold">Controle de caixa</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Abertura, fechamento e sangria</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FileText size={16} />
                  <span className="text-sm font-semibold">Ficha Financeira</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Histórico completo por cliente</p>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
          </div>

          {/* Tributos */}
          <div>
            <h3 className="text-lg font-bold text-gray-700 mb-4">Tributos e contabilidade</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="text-sm font-semibold text-gray-700 mb-1">DAS MEI</div>
                <p className="text-xs text-gray-500">Emissão automática</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="text-sm font-semibold text-gray-700 mb-1">GNRE e DARE-SP</div>
                <p className="text-xs text-gray-500">Guias de recolhimento</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                <div className="text-sm font-semibold text-gray-700 mb-1">Espaço meu contador</div>
                <p className="text-xs text-gray-500">Portal para o contador</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ==================== PERMISSÕES PRODUTOS & SERVIÇOS ====================
  function renderPermissoesTab() {
    if (userRole !== 'admin') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-600 opacity-50" />
          <p className="text-lg font-bold text-red-700 mb-2">Acesso Restrito</p>
          <p className="text-red-600">Apenas administradores podem gerenciar permissões.</p>
          <p className="text-sm text-red-500 mt-4">Seu role atual: <strong>{userRole}</strong></p>
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-indigo-600" /> Permissões de Produtos e Serviços
          </h2>
          <p className="text-gray-500 text-sm">Gerencie permissões granulares para cada role</p>
        </div>

        <div className="space-y-6">{roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{role.name}</h3>
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{role.slug}</span>
              </div>
              <button 
                onClick={() => savePermissions(role.id)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Save size={16} /> Salvar Alterações
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* PRODUTOS */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={18} className="text-blue-600" /> Produtos
                </h4>

                {/* 👁️ VISUALIZAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    👁️ Visualização
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_view_products', 'Ver produtos', 'Acessar lista e detalhes de produtos')}
                    {renderPermissionCheckbox(role.id, 'can_view_product_prices', 'Ver preços', 'Visualizar preços de venda dos produtos')}
                    {renderPermissionCheckbox(role.id, 'can_view_products_full_data', 'Ver dados completos', 'Acesso a custo, estoque e dados sensíveis')}
                  </div>
                </div>

                {/* ➕ CRIAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ➕ Criação
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_create_products', 'Criar produtos', 'Adicionar novos produtos ao catálogo')}
                  </div>
                </div>

                {/* ✏️ EDIÇÃO GRANULAR */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ✏️ Edição Granular
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_edit_product_basic', 'Editar dados básicos', 'Nome, descrição e categoria')}
                    {renderPermissionCheckbox(role.id, 'can_edit_product_prices', 'Editar preços', 'Alterar valores de venda')}
                    {renderPermissionCheckbox(role.id, 'can_edit_product_status', 'Editar status', 'Ativo/Inativo')}
                    {renderPermissionCheckbox(role.id, 'can_edit_product_quantity', 'Editar quantidade', 'Ajustar estoque')}
                  </div>
                </div>

                {/* ⚙️ STATUS & APROVAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚙️ Status & Aprovação
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_change_product_status', 'Alterar status', 'Mudar entre Ativo/Inativo')}
                    {renderPermissionCheckbox(role.id, 'product_require_approval', 'Exigir aprovação', 'Novos produtos vão para aprovação')}
                  </div>
                </div>

                {/* 🗑️ EXCLUSÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    🗑️ Exclusão
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_delete_products', 'Deletar produtos', 'Mover para lixeira (soft delete)')}
                    {renderPermissionCheckbox(role.id, 'can_soft_delete_products', 'Soft delete', 'Desativar sem remover')}
                    {renderPermissionCheckbox(role.id, 'can_hard_delete_products', 'Deletar permanentemente', 'Excluir definitivamente')}
                  </div>
                </div>

                {/* 📊 EXPORTAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    📊 Exportação & Relatórios
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_export_products', 'Exportar lista', 'Exportar catálogo em Excel/PDF')}
                    {renderPermissionCheckbox(role.id, 'can_export_product_report', 'Exportar relatório', 'Relatório com análise de vendas')}
                    {renderPermissionCheckbox(role.id, 'can_view_product_history', 'Ver histórico', 'Visualizar alterações do produto')}
                    {renderPermissionCheckbox(role.id, 'can_generate_product_analytics', 'Gerar análise', 'Estatísticas e dados analíticos')}
                  </div>
                </div>

                {/* ⚡ AÇÕES EM MASSA */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ Ações em Massa
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_bulk_edit_products', 'Edição em massa', 'Editar vários produtos de uma vez')}
                    {renderPermissionCheckbox(role.id, 'can_bulk_delete_products', 'Deletar em massa', 'Deletar vários produtos')}
                    {renderPermissionCheckbox(role.id, 'can_bulk_import_products', 'Importar em massa', 'Importar produtos via arquivo')}
                  </div>
                </div>
              </div>

              {/* SERVIÇOS */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Wrench size={18} className="text-green-600" /> Serviços
                </h4>

                {/* 👁️ VISUALIZAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    👁️ Visualização
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_view_services', 'Ver serviços', 'Acessar catálogo de serviços')}
                    {renderPermissionCheckbox(role.id, 'can_view_service_prices', 'Ver preços', 'Visualizar valores de serviços')}
                  </div>
                </div>

                {/* ➕ CRIAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ➕ Criação
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_create_services', 'Criar serviços', 'Adicionar novos serviços')}
                  </div>
                </div>

                {/* ✏️ EDIÇÃO GRANULAR */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ✏️ Edição Granular
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_edit_service_basic', 'Editar dados básicos', 'Nome, descrição')}
                    {renderPermissionCheckbox(role.id, 'can_edit_service_prices', 'Editar preços', 'Alterar valores')}
                    {renderPermissionCheckbox(role.id, 'can_edit_service_status', 'Editar status', 'Ativo/Inativo')}
                  </div>
                </div>

                {/* ⚙️ STATUS & APROVAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚙️ Status & Aprovação
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_change_service_status', 'Alterar status', 'Mudar entre Ativo/Inativo')}
                    {renderPermissionCheckbox(role.id, 'service_require_approval', 'Exigir aprovação', 'Novos serviços vão para aprovação')}
                  </div>
                </div>

                {/* 🗑️ EXCLUSÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    🗑️ Exclusão
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_delete_services', 'Deletar serviços', 'Mover para lixeira')}
                    {renderPermissionCheckbox(role.id, 'can_soft_delete_services', 'Soft delete', 'Desativar sem remover')}
                    {renderPermissionCheckbox(role.id, 'can_hard_delete_services', 'Deletar permanentemente', 'Excluir definitivamente')}
                  </div>
                </div>

                {/* 📊 EXPORTAÇÃO */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    📊 Exportação & Relatórios
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_export_services', 'Exportar lista', 'Exportar catálogo')}
                    {renderPermissionCheckbox(role.id, 'can_export_service_report', 'Exportar relatório', 'Relatório com análise')}
                    {renderPermissionCheckbox(role.id, 'can_view_service_history', 'Ver histórico', 'Visualizar alterações')}
                  </div>
                </div>

                {/* ⚡ AÇÕES EM MASSA */}
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ Ações em Massa
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {renderPermissionCheckbox(role.id, 'can_bulk_edit_services', 'Edição em massa', 'Editar vários serviços')}
                    {renderPermissionCheckbox(role.id, 'can_bulk_delete_services', 'Deletar em massa', 'Deletar vários serviços')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}</div>
      </>
    );
  }

  // ==================== DASHBOARDS ====================
  function renderDashboardsTab() {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboards</h2>
          <p className="text-gray-500 text-sm">Relatórios e indicadores de desempenho</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Dashboard geral</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Visão geral do negócio com principais métricas</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Dashboard serviços</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Faturamento, OS concluídas e em andamento</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Dashboard clientes</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Novos clientes, churn e ticket médio</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Curva ABC</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Análise de clientes por faturamento</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-75">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Metas</h3>
                <span className="text-xs text-orange-500 font-semibold">🚧 Em breve</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">Defina e acompanhe metas de vendedores</p>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Info size={18} />
            <span className="font-semibold text-sm">Relatórios personalizados</span>
          </div>
          <p className="text-xs text-blue-600">Em breve você poderá criar relatórios personalizados com filtros avançados e exportação.</p>
        </div>
      </>
    );
  }

  // ==================== INTEGRAÇÕES ====================
  function renderIntegracoesTab() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Integrações</h2>
        <p className="text-gray-500 text-sm mb-6">Conecte seu ERP com outras plataformas via API</p>
        
        <div className="text-center py-12 text-gray-400">
          <Plug size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm mt-2">Módulo de integrações estará disponível em breve</p>
        </div>
      </div>
    );
  }
}