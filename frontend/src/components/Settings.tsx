import { useEffect, useState } from 'react';
import api from '../api';
import { 
  Shield, Save, CheckCircle, XCircle, Info, Trash2, 
  Building2, Settings as SettingsIcon, Users, Briefcase, 
  DollarSign, Plug, FileText, ClipboardList, CreditCard,
  BarChart3, Package, Wrench
} from 'lucide-react';

type SettingsTab = 'sistema' | 'cadastros' | 'servicos' | 'financeiro' | 'dashboards' | 'integracoes';

interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: {
    // Visualização
    can_view_all_customers?: boolean;
    can_view_others_customers?: boolean;
    can_access_crm?: boolean;
    can_view_financial_data?: boolean;
    can_view_audit?: boolean;
    // Criação e Edição
    can_create_customers?: boolean;
    can_edit_own_customers?: boolean;
    can_edit_others_customers?: boolean;
    can_edit_financial_data?: boolean;
    can_transfer_customers?: boolean;
    // Status
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
    [key: string]: unknown;
  };
}

export default function Settings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<SettingsTab>('sistema');

  useEffect(() => {
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
      await api.put(`/roles/${roleId}/permissions`, { permissions: role.permissions });
      setMessage({ type: 'success', text: `Permissões de ${role.name} atualizadas!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar permissões.' });
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
          {activeTab === 'dashboards' && renderDashboardsTab()}
          {activeTab === 'integracoes' && renderIntegracoesTab()}
        </div>
      </div>
    </div>
  );

  // ==================== SISTEMA (RBAC) ====================
  function renderSistemaTab() {
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

  // ==================== EMPRESA ====================
  function renderEmpresaTab() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Dados da Empresa</h2>
        <p className="text-gray-500 text-sm mb-6">Configure informações básicas da sua empresa</p>
        
        <div className="text-center py-12 text-gray-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm mt-2">Configurações de empresa estarão disponíveis em breve</p>
        </div>
      </div>
    );
  }

  // ==================== CADASTROS ====================
  function renderCadastrosTab() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Configurações de Cadastros</h2>
        <p className="text-gray-500 text-sm mb-6">Personalize validações e comportamentos de cadastros</p>
        
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm mt-2">Configurações de cadastros estarão disponíveis em breve</p>
        </div>
      </div>
    );
  }

  // ==================== SERVIÇOS ====================
  function renderServicosTab() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Catálogo de Serviços</h2>
        <p className="text-gray-500 text-sm mb-6">Gerencie os serviços oferecidos pela sua empresa</p>
        
        <div className="text-center py-12 text-gray-400">
          <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm mt-2">Módulo de serviços estará disponível em breve</p>
        </div>
      </div>
    );
  }

  // ==================== FINANCEIRO ====================
  function renderFinanceiroTab() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Configurações Financeiras</h2>
        <p className="text-gray-500 text-sm mb-6">Configure contas bancárias, formas de pagamento e condições</p>
        
        <div className="text-center py-12 text-gray-400">
          <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm mt-2">Configurações financeiras estarão disponíveis em breve</p>
        </div>
      </div>
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