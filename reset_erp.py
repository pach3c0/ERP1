import subprocess
import time
import requests
import sys

# --- CONFIGURAÇÕES ---
API_URL = "http://localhost:8000"
RETRIES = 30 

# 1. Dados do ADMIN (O Dono do Sistema)
ADMIN_USER = {
    "name": "Ricardo Pacheco",
    "email": "pacheco@rhynoproject.com.br",
    "password": "123"
}

# 2. Dados da Equipe (Serão criados pelo Admin)
TEAM_USERS = [
    {
        "name": "Roberto Mansao",
        "email": "gerente@erp.com",
        "password": "123",
        "role_slug": "manager",
        "supervisor_ids": []
    },
    {
        "name": "Carlos Alves",
        "email": "carlos@vendas.com",
        "password": "123",
        "role_slug": "sales",
        "supervisor_ids": []
    },
    {
        "name": "Ana Soares",
        "email": "ana@vendas.com",
        "password": "123",
        "role_slug": "sales",
        "supervisor_ids": []
    }
]

# 3. Dados dos Clientes (Agora com todos os campos obrigatórios da Fase 1)
CUSTOMERS_DATA = [
    {
        "name": "Padaria do Carlos (Cliente)",
        "document": "11144477735",
        "person_type": "fisica",
        "email": "padaria@carlos.com",
        "phone": "11988887777",
        "city": "São Paulo",
        "state": "SP",
        "owner_email": "carlos@vendas.com"
    },
    {
        "name": "Construtora da Ana (Cliente)",
        "document": "11222333000181",
        "person_type": "juridica",
        "email": "contato@ana.com",
        "phone": "1133334444",
        "city": "Santo André",
        "state": "SP",
        "owner_email": "ana@vendas.com"
    }
]

# 4. Produtos e Serviços serão implementados na Fase 2
# Por enquanto, apenas a estrutura de CRM está ativa

def run_command(command):
    print(f"🚀 Executando: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print("❌ Erro ao executar comando.")
        sys.exit(1)

def wait_for_api():
    print("⏳ Aguardando o Backend iniciar...")
    for i in range(RETRIES):
        try:
            response = requests.get(f"{API_URL}/docs")
            if response.status_code == 200:
                print("✅ Backend está online!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        print(f"   ...tentando conectar ({i+1}/{RETRIES})")
        time.sleep(2)
    print("❌ O Backend demorou muito. Verifique os logs.")
    sys.exit(1)

def seed_data():
    print("\n🌱 Iniciando população do Banco de Dados...")
    
    # 1. Criar ADMIN (Rota Pública) ou Logar se já existe
    try:
        print(f"   Criando ou autenticando Admin: {ADMIN_USER['name']}...")
        r = requests.post(f"{API_URL}/auth/register", json=ADMIN_USER)
        if r.status_code == 400 and "Email já cadastrado" in r.text:
            print("   Admin já existe, fazendo login...")
            r = requests.post(f"{API_URL}/auth/login", data={"username": ADMIN_USER["email"], "password": ADMIN_USER["password"]})
            if r.status_code != 200:
                print("❌ Falha no login do Admin.")
                return
        elif r.status_code != 200:
            print(f"❌ Erro ao criar Admin: {r.text}")
            return
    except Exception as e:
        print(f"❌ Erro crítico: {e}")
        return

    # 2. Logar como ADMIN para pegar Token
    print("   🔑 Autenticando como Admin...")
    r = requests.post(f"{API_URL}/auth/login", data={"username": ADMIN_USER["email"], "password": ADMIN_USER["password"]})
    if r.status_code != 200:
        print("❌ Falha no login do Admin.")
        return
    
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Buscar IDs dos CARGOS (Roles)
    print("   🔎 Buscando Cargos...")
    r = requests.get(f"{API_URL}/roles/", headers=headers)
    roles_json = r.json()
    roles_map = {role['slug']: role['id'] for role in roles_json}
    
    # --- SISTEMA DE PERMISSÕES GRANULARES ---
    # Configuração completa de todas as permissões por cargo
    for role in roles_json:
        if role['slug'] == 'admin':
            # Admin: Todas as permissões
            role['permissions'].update({
                # Visualização
                "can_view_all_customers": True,
                "can_view_others_customers": True,
                "can_access_crm": True,
                "can_view_financial_data": True,
                "can_view_audit": True,
                # Criação e Edição
                "can_create_customers": True,
                "can_edit_own_customers": True,
                "can_edit_others_customers": True,
                "can_edit_financial_data": True,
                "can_transfer_customers": True,
                # Status e Aprovação
                "customer_change_status": True,
                "customer_require_approval": False,
                # Exportação
                "can_generate_report": True,
                "can_export_excel": True,
                "can_bulk_import": True,
                # Timeline/CRM
                "can_add_notes": True,
                "can_add_tasks": True,
                "can_complete_tasks": True,
                "can_edit_notes": True,
                "can_delete_notes": True,
                # Exclusão
                "can_delete_customers": True,
                "can_view_trash": True,
                "can_restore_deleted": True,
                "can_hard_delete": True
            })
        elif role['slug'] == 'manager':
            # Gerente: Quase todas, exceto hard delete
            role['permissions'].update({
                # Visualização
                "can_view_all_customers": True,
                "can_view_others_customers": True,
                "can_access_crm": True,
                "can_view_financial_data": True,
                "can_view_audit": True,
                # Criação e Edição
                "can_create_customers": True,
                "can_edit_own_customers": True,
                "can_edit_others_customers": True,
                "can_edit_financial_data": True,
                "can_transfer_customers": True,
                # Status e Aprovação
                "customer_change_status": True,
                "customer_require_approval": False,
                # Exportação
                "can_generate_report": True,
                "can_export_excel": True,
                "can_bulk_import": True,
                # Timeline/CRM
                "can_add_notes": True,
                "can_add_tasks": True,
                "can_complete_tasks": True,
                "can_edit_notes": True,
                "can_delete_notes": True,
                # Exclusão
                "can_delete_customers": True,
                "can_view_trash": True,
                "can_restore_deleted": False,
                "can_hard_delete": False,
                # Produtos - Visualização
                "can_view_products": True,
                "can_view_product_prices": True,
                "can_view_products_full_data": True,
                # Produtos - Criação
                "can_create_products": True,
                # Produtos - Edição Granular
                "can_edit_product_basic": True,
                "can_edit_product_prices": True,
                "can_edit_product_status": True,
                "can_edit_product_quantity": True,
                # Produtos - Status
                "can_change_product_status": True,
                "product_require_approval": False,
                # Produtos - Exclusão
                "can_delete_products": False,
                "can_soft_delete_products": True,
                "can_hard_delete_products": False,
                # Produtos - Exportação
                "can_export_products": True,
                "can_export_product_report": True,
                "can_view_product_history": True,
                "can_generate_product_analytics": True,
                # Produtos - Ações em Massa
                "can_bulk_edit_products": True,
                "can_bulk_delete_products": False,
                "can_bulk_import_products": True,
                # Serviços - Visualização
                "can_view_services": True,
                "can_view_service_prices": True,
                # Serviços - Criação
                "can_create_services": True,
                # Serviços - Edição Granular
                "can_edit_service_basic": True,
                "can_edit_service_prices": True,
                "can_edit_service_status": True,
                # Serviços - Status
                "can_change_service_status": True,
                "service_require_approval": False,
                # Serviços - Exclusão
                "can_delete_services": False,
                "can_soft_delete_services": True,
                "can_hard_delete_services": False,
                # Serviços - Exportação
                "can_export_services": True,
                "can_export_service_report": True,
                "can_view_service_history": True,
                # Serviços - Ações em Massa
                "can_bulk_edit_services": True,
                "can_bulk_delete_service
                "can_soft_delete_products": False,
                "can_hard_delete_products": False,
                # Produtos - Exportação
                "can_export_products": False,
                "can_export_product_report": False,
                "can_view_product_history": False,
                "can_generate_product_analytics": False,
                # Produtos - Ações em Massa
                "can_bulk_edit_products": False,
                "can_bulk_delete_products": False,
                "can_bulk_import_products": False,
                # Serviços - Visualização
                "can_view_services": True,
                "can_view_service_prices": False,
                # Serviços - Criação
                "can_create_services": False,
                # Serviços - Edição Granular
                "can_edit_service_basic": False,
                "can_edit_service_prices": False,
                "can_edit_service_status": False,
                # Serviços - Status
                "can_change_service_status": False,
                "service_require_approval": False,
                # Serviços - Exclusão
                "can_delete_services": False,
                "can_soft_delete_services": False,
                "can_hard_delete_services": False,
                # Serviços - Exportação
                "can_export_services": False,
                "can_export_service_report": False,
                "can_view_service_history": False,
                # Serviços - Ações em Massa
                "can_bulk_edit_services": False,
                "can_bulk_delete_service
        r = requests.post(f"{API_URL}/customers/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Cliente criado: {customer['name']} -> Vinculado a {customer['owner_email']}")
        else:
            # Se houver erro, exibe o detalhe do Pydantic (ajuda no debug)
            print(f"   ⚠️ Erro no cliente {customer['name']}: {r.text}")

    # 6. Criar PRODUTOS
    print("   📦 Cadastrando Produtos iniciais...")
    for product in PRODUCTS_DATA:
        payload = {
            "name": product["name"],
            "description": product["description"],
            "price_daily": product["price_daily"],
            "price_weekly": product["price_weekly"],
            "price_monthly": product["price_monthly"],
            "quantity": product["quantity"],
            "serial_number": product["serial_number"],
            "status": product["status"]
        }
        
        r = requests.post(f"{API_URL}/products/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Produto criado: {product['name']}")
        else:
            print(f"   ⚠️ Erro ao criar produto {product['name']}: {r.text}")

    # 7. Criar SERVIÇOS
    print("   🔧 Cadastrando Serviços iniciais...")
    for service in SERVICES_DATA:
        payload = {
            "name": service["name"],
            "description": service["description"],
            "price_base": service["price_base"],
            "price_hourly": service["price_hourly"],
            "duration_type": service["duration_type"],
            "status": service["status"]
        }
        
        r = requests.post(f"{API_URL}/services/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Serviço criado: {service['name']}")
        else:
            print(f"   ⚠️ Erro ao criar serviço {service['name']}: {r.text}")

def main():
    print("=========================================")
    print("      RESET NUCLEAR DO ERP AGENT ☢️")
    print("=========================================\n")

    run_command("docker-compose down -v")
    run_command("docker-compose up -d --build") 
    
    wait_for_api()
    seed_data()

    print("\n=========================================")
    print("🎉 TUDO PRONTO! ACESSE http://localhost:5173")
    print(f"👉 Admin:   {ADMIN_USER['email']}")
    print(f"👉 Gerente: gerente@erp.com / 123")
    print(f"👉 Vendedores: carlos@vendas.com ou ana@vendas.com")
    print("=========================================")

if __name__ == "__main__":
    main()print("\n   ℹ️  Produtos e Serviços serão implementados na Fase 2