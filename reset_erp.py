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

# 4. Produtos - Fase 2
PRODUCTS_DATA = [
    {
        "name": "Parafuso M8",
        "description": "Parafuso métrico de aço carbono",
        "category": "Ferramenta",
        "price_daily": 10.50,
        "price_weekly": 60.00,
        "price_monthly": 200.00,
        "cost": 5.00,
        "quantity": 100,
        "serial_number": "PAR-M8-001",
        "status": "disponivel"
    },
    {
        "name": "Rebite de Alumínio",
        "description": "Rebite de alumínio para estrutura leve",
        "category": "Material",
        "price_daily": 8.00,
        "price_weekly": 45.00,
        "price_monthly": 150.00,
        "cost": 3.50,
        "quantity": 250,
        "serial_number": "REB-ALU-001",
        "status": "disponivel"
    },
    {
        "name": "Escada Alumínio 5m",
        "description": "Escada de alumínio com 5 metros de altura",
        "category": "Equipamento",
        "price_daily": 75.00,
        "price_weekly": 400.00,
        "price_monthly": 1200.00,
        "cost": 300.00,
        "quantity": 5,
        "serial_number": "ESC-ALU-5M-001",
        "status": "disponivel"
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

    # 3. Criar equipe (Usuários)
    print("   👥 Cadastrando usuários da equipe...")
    for user in TEAM_USERS:
        payload = {
            "name": user["name"],
            "email": user["email"],
            "password": user["password"],
            "role_slug": user["role_slug"]
        }
        r = requests.post(f"{API_URL}/users/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Usuário criado: {user['name']}")
        else:
            # Pode ser que já exista
            print(f"   ⚠️ {user['name']}: {r.text[:100]}")

    # 4. Criar Clientes
    print("   💼 Cadastrando Clientes iniciais...")
    for customer in CUSTOMERS_DATA:
        payload = {
            "name": customer["name"],
            "document": customer["document"],
            "person_type": customer["person_type"],
            "email": customer["email"],
            "phone": customer["phone"],
            "city": customer["city"],
            "state": customer["state"],
            "owner_email": customer["owner_email"]
        }
        
        r = requests.post(f"{API_URL}/customers/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Cliente criado: {customer['name']}")
        else:
            print(f"   ⚠️ Erro no cliente {customer['name']}: {r.text[:100]}")

    # 5. Criar PRODUTOS
    print("   📦 Cadastrando Produtos iniciais...")
    for product in PRODUCTS_DATA:
        payload = {
            "name": product["name"],
            "description": product["description"],
            "category": product["category"],
            "price_daily": product["price_daily"],
            "price_weekly": product["price_weekly"],
            "price_monthly": product["price_monthly"],
            "cost": product["cost"],
            "quantity": product["quantity"],
            "serial_number": product["serial_number"],
            "status": product["status"]
        }
        
        r = requests.post(f"{API_URL}/products/", json=payload, headers=headers)
        if r.status_code == 200:
            print(f"   ✅ Produto criado: {product['name']}")
        else:
            print(f"   ⚠️ Erro ao criar produto {product['name']}: {r.text[:100]}")

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
    print(f"👉 Admin:   {ADMIN_USER['email']} / 123")
    print(f"👉 Gerente: gerente@erp.com / 123")
    print(f"👉 Vendedores: carlos@vendas.com ou ana@vendas.com / 123")
    print("=========================================")

if __name__ == "__main__":
    main()