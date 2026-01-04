/**
 * Helper para gerenciar permissões granulares do usuário
 * Baseado nas permissões armazenadas no localStorage após login
 */

interface UserPermissions {
  // Produtos
  can_view_products: boolean;
  can_create_products: boolean;
  can_edit_product_basic: boolean;
  can_edit_product_prices: boolean;
  can_edit_product_quantity: boolean;
  can_change_product_status: boolean;
  can_soft_delete_products: boolean;
  can_hard_delete_products: boolean;
  can_export_product_report: boolean;
  can_import_products: boolean;
  can_bulk_edit_products: boolean;
  can_bulk_delete_products: boolean;

  // Serviços
  can_view_services: boolean;
  can_create_services: boolean;
  can_edit_service_basic: boolean;
  can_edit_service_prices: boolean;
  can_change_service_status: boolean;
  can_soft_delete_services: boolean;
  can_hard_delete_services: boolean;
  can_export_service_report: boolean;
  can_import_services: boolean;
  can_bulk_edit_services: boolean;
  can_bulk_delete_services: boolean;

  [key: string]: boolean;
}

/**
 * Permissões padrão para cada role
 */
const ROLE_PERMISSIONS: Record<string, Partial<UserPermissions>> = {
  admin: {
    // Admin tem TUDO
    can_view_products: true,
    can_create_products: true,
    can_edit_product_basic: true,
    can_edit_product_prices: true,
    can_edit_product_quantity: true,
    can_change_product_status: true,
    can_soft_delete_products: true,
    can_hard_delete_products: true,
    can_export_product_report: true,
    can_import_products: true,
    can_bulk_edit_products: true,
    can_bulk_delete_products: true,
    can_view_services: true,
    can_create_services: true,
    can_edit_service_basic: true,
    can_edit_service_prices: true,
    can_change_service_status: true,
    can_soft_delete_services: true,
    can_hard_delete_services: true,
    can_export_service_report: true,
    can_import_services: true,
    can_bulk_edit_services: true,
    can_bulk_delete_services: true,
  },
  manager: {
    // Manager pode ver, criar, editar (básico e preços), deletar (soft)
    can_view_products: true,
    can_create_products: true,
    can_edit_product_basic: true,
    can_edit_product_prices: true,
    can_edit_product_quantity: true,
    can_change_product_status: true,
    can_soft_delete_products: true,
    can_hard_delete_products: false,
    can_export_product_report: true,
    can_import_products: true,
    can_bulk_edit_products: true,
    can_bulk_delete_products: true,
    can_view_services: true,
    can_create_services: true,
    can_edit_service_basic: true,
    can_edit_service_prices: true,
    can_change_service_status: true,
    can_soft_delete_services: true,
    can_hard_delete_services: false,
    can_export_service_report: true,
    can_import_services: true,
    can_bulk_edit_services: true,
    can_bulk_delete_services: true,
  },
  sales: {
    // Sales - acesso bem restrito (apenas visualização e relatório)
    can_view_products: true,
    can_create_products: false,
    can_edit_product_basic: false,
    can_edit_product_prices: false,
    can_edit_product_quantity: false,
    can_change_product_status: false,
    can_soft_delete_products: false,
    can_hard_delete_products: false,
    can_export_product_report: true,
    can_import_products: false,
    can_bulk_edit_products: false,
    can_bulk_delete_products: false,
    can_view_services: true,
    can_create_services: false,
    can_edit_service_basic: false,
    can_edit_service_prices: false,
    can_change_service_status: false,
    can_soft_delete_services: false,
    can_hard_delete_services: false,
    can_export_service_report: true,
    can_import_services: false,
    can_bulk_edit_services: false,
    can_bulk_delete_services: false,
  },
};

/**
 * Obtém as permissões do usuário atual
 * Primeiro tenta pegar do localStorage (via role.permissions), depois usa default
 */
export function getUserPermissions(): UserPermissions {
  try {
    const role = localStorage.getItem('role')?.toLowerCase() || 'visitante';
    const permissionsStr = localStorage.getItem('userPermissions');

    if (permissionsStr) {
      try {
        return JSON.parse(permissionsStr);
      } catch (e) {
        console.warn('Erro ao parsear userPermissions, usando padrão do role');
      }
    }

    // Fallback para permissões padrão do role
    return {
      can_view_products: false,
      can_create_products: false,
      can_edit_product_basic: false,
      can_edit_product_prices: false,
      can_edit_product_quantity: false,
      can_change_product_status: false,
      can_soft_delete_products: false,
      can_hard_delete_products: false,
      can_export_product_report: false,
      can_import_products: false,
      can_bulk_edit_products: false,
      can_bulk_delete_products: false,
      can_view_services: false,
      can_create_services: false,
      can_edit_service_basic: false,
      can_edit_service_prices: false,
      can_change_service_status: false,
      can_soft_delete_services: false,
      can_hard_delete_services: false,
      can_export_service_report: false,
      can_import_services: false,
      can_bulk_edit_services: false,
      can_bulk_delete_services: false,
      ...(ROLE_PERMISSIONS[role] || {}),
    };
  } catch (error) {
    console.error('Erro ao obter permissões do usuário:', error);
    return {
      can_view_products: false,
      can_create_products: false,
      can_edit_product_basic: false,
      can_edit_product_prices: false,
      can_edit_product_quantity: false,
      can_change_product_status: false,
      can_soft_delete_products: false,
      can_hard_delete_products: false,
      can_export_product_report: false,
      can_import_products: false,
      can_bulk_edit_products: false,
      can_bulk_delete_products: false,
      can_view_services: false,
      can_create_services: false,
      can_edit_service_basic: false,
      can_edit_service_prices: false,
      can_change_service_status: false,
      can_soft_delete_services: false,
      can_hard_delete_services: false,
      can_export_service_report: false,
      can_import_services: false,
      can_bulk_edit_services: false,
      can_bulk_delete_services: false,
    };
  }
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasPermission(permissionKey: string): boolean {
  const permissions = getUserPermissions();
  return permissions[permissionKey] === true;
}

/**
 * Verifica múltiplas permissões (AND logic)
 */
export function hasAllPermissions(...permissionKeys: string[]): boolean {
  return permissionKeys.every(key => hasPermission(key));
}

/**
 * Verifica múltiplas permissões (OR logic)
 */
export function hasAnyPermission(...permissionKeys: string[]): boolean {
  return permissionKeys.some(key => hasPermission(key));
}

/**
 * Aviso visual de permissão negada
 */
export function getPermissionDeniedMessage(feature: string): string {
  return `Você não tem permissão para acessar ${feature}. Contacte seu administrador.`;
}

/**
 * Hook helper para React - para ser usado com useEffect para recarregar permissões
 */
export function subscribeToPermissionChanges(callback: () => void): () => void {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'userPermissions' || e.key === 'role') {
      callback();
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}
