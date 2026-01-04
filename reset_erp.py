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
                "can_restore_deleted": False,  # Apenas admin restaura
                "can_hard_delete": False       # Apenas admin hard delete
            })
        elif role['slug'] == 'sales':
            # Vendedor: Permissões restritas (perfil vendedor_restrito)
            role['permissions'].update({
                # Visualização
                "can_view_all_customers": False,  # Vê só os seus
                "can_view_others_customers": False,
                "can_access_crm": True,
                "can_view_financial_data": False,
                "can_view_audit": False,
                # Criação e Edição
                "can_create_customers": True,
                "can_edit_own_customers": True,
                "can_edit_others_customers": False,
                "can_edit_financial_data": False,
                "can_transfer_customers": False,
                # Status e Aprovação
                "customer_change_status": False,
                "customer_require_approval": True,  # Cadastros vão para aprovação
                # Exportação
                "can_generate_report": False,
                "can_export_excel": False,
                "can_bulk_import": False,
                # Timeline/CRM
                "can_add_notes": True,
                "can_add_tasks": True,
                "can_complete_tasks": True,
                "can_edit_notes": True,    # Pode editar suas próprias
                "can_delete_notes": False,
                # Exclusão
                "can_delete_customers": False,
                "can_view_trash": False,
                "can_restore_deleted": False,
                "can_hard_delete": False
            })
        
        requests.put(f"{API_URL}/roles/{role['id']}/permissions", json={"permissions": role['permissions']}, headers=headers)

    users_map = {} 

    # 4. Criar EQUIPE (Gerente e Vendedores)
    for user in TEAM_USERS:
        role_id = roles_map.get(user["role_slug"])
        
        if user["role_slug"] == "sales":
            gerente_id = users_map.get("gerente@erp.com")
            if gerente_id:
                user["supervisor_ids"] = [gerente_id]

        payload = {
            "name": user["name"],
            "email": user["email"],
            "password": user["password"],
            "role_id": role_id,
            "supervisor_ids": user["supervisor_ids"]
        }
        
        r = requests.post(f"{API_URL}/users/", json=payload, headers=headers)
        if r.status_code == 200:
            created_user = r.json()
            users_map[created_user["email"]] = created_user["id"]
            print(f"   ✅ Usuário criado: {user['name']} (Cargo: {user['role_slug']})")
        else:
            print(f"   ⚠️ Erro ao criar {user['name']}: {r.text}")

    # 5. Criar CLIENTES (Com campos obrigatórios)
    print("   👥 Cadastrando Clientes iniciais...")
    for customer in CUSTOMERS_DATA:
        owner_id = users_map.get(customer["owner_email"])
        
        payload = {
            "name": customer["name"],
            "document": customer["document"],
            "person_type": customer["person_type"],
            "email": customer["email"],
            "phone": customer["phone"],
            "city": customer["city"],
            "state": customer["state"],
            "status": "ativo",
            "salesperson_id": owner_id,
            "is_customer": True,
            "is_supplier": False
        }
        
        r = requests.post(f"{API_URL}/customers/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Cliente criado: {customer['name']} -> Vinculado a {customer['owner_email']}")
        else:
            # Se houver erro, exibe o detalhe do Pydantic (ajuda no debug)
            print(f"   ⚠️ Erro no cliente {customer['name']}: {r.text}")

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
    main()