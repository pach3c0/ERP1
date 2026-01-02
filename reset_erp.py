import subprocess
import time
import requests
import sys

# --- CONFIGURAÇÕES ---
API_URL = "http://localhost:8000"
RETRIES = 30  # Tenta conectar por 30 vezes (aprox 1 min)

# Dados dos Usuários para criar
USERS_TO_CREATE = [
    {
        "name": "Admin Pacheco",
        "email": "pacheco@rhynoproject.com.br",
        "password": "123",
        "role_id": 0 # O sistema ignora e força Admin pq é o primeiro
    },
    {
        "name": "Vendedor Carlos",
        "email": "carlos@vendas.com",
        "password": "123",
        "role_id": 0 # O sistema força Vendedor pq já existe Admin
    },
    {
        "name": "Vendedora Ana",
        "email": "ana@vendas.com",
        "password": "123",
        "role_id": 0 # O sistema força Vendedor
    }
]

def run_command(command):
    """Executa comando no terminal e mostra saída."""
    print(f"🚀 Executando: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        print("❌ Erro ao executar comando.")
        sys.exit(1)

def wait_for_api():
    """Aguarda o Backend estar pronto."""
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
    
    print("❌ O Backend demorou muito para responder. Verifique os logs do Docker.")
    sys.exit(1)

def seed_users():
    """Cria os usuários via API."""
    print("\n🌱 Criando usuários iniciais...")
    
    for user in USERS_TO_CREATE:
        try:
            response = requests.post(f"{API_URL}/auth/register", json=user)
            if response.status_code == 200:
                data = response.json()
                # Descobre qual role o sistema atribuiu (baseado na lógica do main.py)
                # Como não temos o nome da role na resposta do user create direto, 
                # deduzimos pela ordem: 1º é Admin, resto Vendedor.
                print(f"✅ Usuário criado: {user['name']} ({user['email']})")
            else:
                print(f"⚠️ Falha ao criar {user['name']}: {response.text}")
        except Exception as e:
            print(f"❌ Erro de conexão: {e}")

def main():
    print("=========================================")
    print("      RESET NUCLEAR DO ERP AGENT ☢️")
    print("=========================================\n")

    # 1. Derruba e Limpa
    run_command("docker-compose down -v")

    # 2. Sobe e Reconstrói
    # O parametro -d roda em background para o script continuar
    run_command("docker-compose up -d --build") 

    # 3. Espera a API subir
    wait_for_api()

    # 4. Popula o Banco
    seed_users()

    print("\n=========================================")
    print("🎉 TUDO PRONTO!")
    print(f"👉 Admin: {USERS_TO_CREATE[0]['email']} / 123")
    print(f"👉 Vend 1: {USERS_TO_CREATE[1]['email']} / 123")
    print(f"👉 Vend 2: {USERS_TO_CREATE[2]['email']} / 123")
    print("=========================================")

if __name__ == "__main__":
    main()