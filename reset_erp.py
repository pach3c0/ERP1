import subprocess
import time
import requests
import sys

# --- CONFIGURAÇÕES ---
API_URL = "http://localhost:8000"
RETRIES = 30 

# 1. Dados do ADMIN (O Dono do Sistema)
ADMIN_USER = {
    "name": "Admin Pacheco",
    "email": "pacheco@rhynoproject.com.br",
    "password": "123"
}

# 2. Dados da Equipe (Serão criados pelo Admin)
TEAM_USERS = [
    {
        "name": "Gerente Roberto",
        "email": "gerente@erp.com",
        "password": "123",
        "role_slug": "manager", # Define que é Gerente
        "supervisor_ids": []
    },
    {
        "name": "Vendedor Carlos",
        "email": "carlos@vendas.com",
        "password": "123",
        "role_slug": "sales",   # Define que é Vendedor
        "supervisor_ids": []    # Será preenchido com o ID do gerente depois
    },
    {
        "name": "Vendedora Ana",
        "email": "ana@vendas.com",
        "password": "123",
        "role_slug": "sales",
        "supervisor_ids": []
    }
]

# 3. Dados dos Clientes (Um para cada vendedor)
CUSTOMERS_DATA = [
    {
        "name": "Padaria do Carlos (Cliente)",
        "document": "11144477735",
        "person_type": "PF",
        "email": "padaria@carlos.com",
        "owner_email": "carlos@vendas.com" # Vai para o Carlos
    },
    {
        "name": "Construtora da Ana (Cliente)",
        "document": "11222333000181",
        "person_type": "PJ",
        "email": "contato@ana.com",
        "owner_email": "ana@vendas.com" # Vai para a Ana
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
    
    # 1. Criar ADMIN (Rota Pública)
    try:
        print(f"   Criando Admin: {ADMIN_USER['name']}...")
        r = requests.post(f"{API_URL}/auth/register", json=ADMIN_USER)
        if r.status_code != 200:
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
    roles_map = {role['slug']: role['id'] for role in r.json()}
    
    # Mapeamento para guardar ID dos usuários criados (email -> id)
    users_map = {} 

    # 4. Criar EQUIPE (Gerente e Vendedores)
    for user in TEAM_USERS:
        role_id = roles_map.get(user["role_slug"])
        
        # Se for vendedor, tenta adicionar o gerente como supervisor (se já tiver sido criado)
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

    # 5. Criar CLIENTES (Vinculando aos Vendedores)
    print("   👥 Cadastrando Clientes iniciais...")
    for customer in CUSTOMERS_DATA:
        owner_id = users_map.get(customer["owner_email"])
        
        # O Admin está criando, mas definindo o salesperson_id
        payload = {
            "name": customer["name"],
            "document": customer["document"],
            "person_type": customer["person_type"],
            "email": customer["email"],
            "status": "ativo", # Admin criando já nasce ativo
            "salesperson_id": owner_id # Vincula ao vendedor
        }
        
        r = requests.post(f"{API_URL}/customers/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Cliente criado: {customer['name']} -> Vinculado a {customer['owner_email']}")
        else:
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
    print(f"👉 Vend 1:  carlos@vendas.com / 123 (Tem cliente PF)")
    print(f"👉 Vend 2:  ana@vendas.com / 123 (Tem cliente PJ)")
    print("=========================================")

if __name__ == "__main__":
    main()