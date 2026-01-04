#!/usr/bin/env python3
"""
Script de Teste Completo do Sistema de Clientes/Fornecedores
Testa todas as funcionalidades do CRUD e permissões
"""

import requests
import time
import sys
from datetime import datetime

# Configurações
API_URL = "http://localhost:8000"
VERBOSE = True

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

# Estatísticas
stats = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
}

def log(message, color=Colors.RESET):
    """Log com cores"""
    if VERBOSE:
        print(f"{color}{message}{Colors.RESET}")

def test_result(test_name, passed, message="", response=None):
    """Registra resultado de um teste"""
    stats["total"] += 1
    if passed:
        stats["passed"] += 1
        log(f"✅ {test_name}", Colors.GREEN)
    else:
        stats["failed"] += 1
        log(f"❌ {test_name}", Colors.RED)
        if message:
            log(f"   └─ {message}", Colors.RED)
        if response and VERBOSE:
            try:
                log(f"   └─ Response: {response.json()}", Colors.RED)
            except:
                log(f"   └─ Response: {response.text}", Colors.RED)
    return passed

def login(email, password):
    """Faz login e retorna token"""
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            data={"username": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            log(f"🔐 Login bem-sucedido: {email}", Colors.CYAN)
            return token
        else:
            log(f"❌ Falha no login: {email}", Colors.RED)
            return None
    except Exception as e:
        log(f"❌ Erro no login: {str(e)}", Colors.RED)
        return None

def create_customer(token, data):
    """Cria um cliente"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{API_URL}/customers/", json=data, headers=headers)
        return response
    except Exception as e:
        log(f"Erro: {str(e)}", Colors.RED)
        return None

def get_customer(token, customer_id):
    """Busca um cliente por ID"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_URL}/customers/{customer_id}", headers=headers)
        return response
    except Exception as e:
        return None

def update_customer(token, customer_id, data):
    """Atualiza um cliente"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.put(f"{API_URL}/customers/{customer_id}", json=data, headers=headers)
        return response
    except Exception as e:
        return None

def verify_document(token, document):
    """Verifica se documento já existe"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_URL}/customers/verify/{document}", headers=headers)
        return response
    except Exception as e:
        return None

def change_status(token, customer_id, status):
    """Muda status de um cliente"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.patch(
            f"{API_URL}/customers/{customer_id}/status",
            json={"status": status},
            headers=headers
        )
        return response
    except Exception as e:
        return None

def get_customers_paginated(token, skip=0, limit=25):
    """Lista clientes com paginação"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_URL}/customers/?skip={skip}&limit={limit}", headers=headers)
        return response
    except Exception as e:
        return None

def delete_customer(token, customer_id):
    """Soft delete de um cliente"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.delete(f"{API_URL}/customers/{customer_id}", headers=headers)
        return response
    except Exception as e:
        return None

def create_note(token, customer_id, content, note_type="message", target_user_id=None):
    """Cria uma nota/tarefa"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        data = {"content": content, "type": note_type}
        if target_user_id:
            data["target_user_id"] = target_user_id
        response = requests.post(f"{API_URL}/customers/{customer_id}/notes", json=data, headers=headers)
        return response
    except Exception as e:
        return None

def update_task(token, customer_id, note_id, action):
    """Atualiza status de uma tarefa"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.patch(
            f"{API_URL}/customers/{customer_id}/notes/{note_id}/task",
            json={"action": action},
            headers=headers
        )
        return response
    except Exception as e:
        return None

def run_tests():
    """Executa todos os testes"""
    log("\n" + "="*80, Colors.BOLD)
    log("🧪 INICIANDO TESTES DO SISTEMA DE CLIENTES/FORNECEDORES", Colors.BOLD + Colors.CYAN)
    log("="*80 + "\n", Colors.BOLD)
    
    # Verificar se API está online
    log("📡 Verificando API...", Colors.YELLOW)
    try:
        response = requests.get(f"{API_URL}/docs")
        if response.status_code != 200:
            log("❌ API não está respondendo corretamente", Colors.RED)
            return False
        test_result("API Online", True)
    except:
        test_result("API Online", False, "Certifique-se que o docker-compose está rodando")
        return False
    
    time.sleep(1)
    
    # ===== AUTENTICAÇÃO =====
    log("\n" + "─"*80, Colors.BLUE)
    log("🔐 TESTE 1: AUTENTICAÇÃO", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    admin_token = login("pacheco@rhynoproject.com.br", "123")
    test_result("Login Admin", admin_token is not None)
    
    manager_token = login("gerente@erp.com", "123")
    test_result("Login Manager", manager_token is not None)
    
    vendedor_token = login("carlos@vendas.com", "123")
    test_result("Login Vendedor", vendedor_token is not None)
    
    if not all([admin_token, manager_token, vendedor_token]):
        log("❌ Não foi possível autenticar todos os usuários", Colors.RED)
        return False
    
    time.sleep(1)
    
    # ===== CRIAÇÃO DE CLIENTES =====
    log("\n" + "─"*80, Colors.BLUE)
    log("➕ TESTE 2: CRIAÇÃO DE CLIENTES", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    # Cliente PF
    cliente_pf = {
        "name": "João Silva Teste",
        "document": "12345678909",
        "person_type": "fisica",
        "email": "joao.teste@example.com",
        "phone": "11988887777",
        "city": "São Paulo",
        "state": "SP",
        "is_customer": True,
        "is_supplier": False,
        "salesperson_id": 3
    }
    
    response = create_customer(vendedor_token, cliente_pf)
    pf_created = test_result(
        "Criar Cliente Pessoa Física",
        response and response.status_code == 200,
        f"Status: {response.status_code if response else 'Erro'}"
    )
    
    pf_id = response.json()["id"] if pf_created else None
    pf_status = response.json()["status"] if pf_created else None
    
    # Verificar se vendedor criou como "pendente" (configuração padrão)
    test_result(
        "Status inicial correto (pendente para vendedor)",
        pf_status == "pendente",
        f"Esperado: pendente, Recebido: {pf_status}"
    )
    
    # Cliente PJ
    cliente_pj = {
        "name": "Empresa Teste LTDA",
        "fantasy_name": "Empresa Teste",
        "document": "12345678000195",
        "person_type": "juridica",
        "email": "contato@empresa-teste.com",
        "phone": "1133334444",
        "city": "Rio de Janeiro",
        "state": "RJ",
        "ie": "123456789",
        "is_customer": True,
        "is_supplier": True,
        "salesperson_id": 3
    }
    
    response = create_customer(vendedor_token, cliente_pj)
    pj_created = test_result(
        "Criar Cliente Pessoa Jurídica (Cliente + Fornecedor)",
        response and response.status_code == 200
    )
    pj_id = response.json()["id"] if pj_created else None
    
    # Cliente criado por Admin (deve ser ativo automaticamente)
    cliente_admin = {
        "name": "Cliente Admin Teste",
        "document": "98765432109",
        "person_type": "fisica",
        "email": "admin.cliente@example.com",
        "phone": "11999998888",
        "city": "Campinas",
        "state": "SP",
        "is_customer": True,
        "is_supplier": False
    }
    
    response = create_customer(admin_token, cliente_admin)
    admin_created = test_result(
        "Criar Cliente por Admin",
        response and response.status_code == 200,
        f"Status: {response.status_code if response else 'Erro'}" if response and response.status_code != 200 else "",
        response
    )
    admin_customer_id = response.json()["id"] if admin_created and response else None
    admin_customer_status = response.json()["status"] if admin_created and response else None
    
    test_result(
        "Status inicial correto (ativo para admin)",
        admin_customer_status == "ativo",
        f"Esperado: ativo, Recebido: {admin_customer_status}"
    )
    
    time.sleep(1)
    
    # ===== VALIDAÇÕES =====
    log("\n" + "─"*80, Colors.BLUE)
    log("✓ TESTE 3: VALIDAÇÕES", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    # Verificar documento duplicado
    response = verify_document(vendedor_token, "12345678909")
    exists = response and response.status_code == 200 and response.json().get("exists") == True
    test_result("Verificação de documento duplicado", exists)
    
    # Tentar criar cliente com documento duplicado
    response = create_customer(vendedor_token, cliente_pf)
    test_result(
        "Rejeitar documento duplicado",
        response and response.status_code != 200,
        "Deve retornar erro",
        response
    )
    
    # CPF inválido
    cliente_cpf_invalido = cliente_pf.copy()
    cliente_cpf_invalido["document"] = "11111111111"
    response = create_customer(vendedor_token, cliente_cpf_invalido)
    test_result(
        "Rejeitar CPF inválido",
        response and response.status_code != 200,
        "CPF deve ser validado",
        response
    )
    
    time.sleep(1)
    
    # ===== BUSCA E LISTAGEM =====
    log("\n" + "─"*80, Colors.BLUE)
    log("🔍 TESTE 4: BUSCA E PAGINAÇÃO", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    # Buscar cliente específico
    if pf_id:
        response = get_customer(vendedor_token, pf_id)
        test_result(
            "Buscar cliente por ID",
            response and response.status_code == 200
        )
    
    # Listar com paginação
    response = get_customers_paginated(vendedor_token, skip=0, limit=25)
    paginated = test_result(
        "Listar clientes com paginação",
        response and response.status_code == 200
    )
    
    if paginated:
        data = response.json()
        test_result(
            "Estrutura de paginação correta",
            "items" in data and "total" in data and "skip" in data and "limit" in data
        )
    
    time.sleep(1)
    
    # ===== EDIÇÃO =====
    log("\n" + "─"*80, Colors.BLUE)
    log("✏️ TESTE 5: EDIÇÃO DE CLIENTES", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    if pf_id:
        # Editar próprio cliente
        updated_data = cliente_pf.copy()
        updated_data["phone"] = "11977776666"
        updated_data["city"] = "Santos"
        
        response = update_customer(vendedor_token, pf_id, updated_data)
        test_result(
            "Vendedor edita próprio cliente",
            response and response.status_code == 200
        )
        
        # Tentar editar cliente de outro vendedor (deve falhar)
        if admin_customer_id:
            response = update_customer(vendedor_token, admin_customer_id, updated_data)
            test_result(
                "Vendedor não pode editar cliente de outro (sem permissão)",
                response and response.status_code == 403
            )
    
    time.sleep(1)
    
    # ===== MUDANÇA DE STATUS =====
    log("\n" + "─"*80, Colors.BLUE)
    log("🔄 TESTE 6: MUDANÇA DE STATUS", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    if pf_id:
        # Vendedor sem permissão tenta mudar status
        response = change_status(vendedor_token, pf_id, "ativo")
        test_result(
            "Vendedor não pode mudar status (sem permissão)",
            response and response.status_code == 403,
            f"Esperado 403, recebido {response.status_code if response else 'Erro'}",
            response
        )
        
        # Admin muda status
        response = change_status(admin_token, pf_id, "ativo")
        test_result(
            "Admin muda status pendente → ativo",
            response and response.status_code == 200
        )
        
        # Manager muda status
        if pj_id:
            response = change_status(manager_token, pj_id, "ativo")
            test_result(
                "Manager muda status",
                response and response.status_code == 200
            )
    
    time.sleep(1)
    
    # ===== TIMELINE: MENSAGENS =====
    log("\n" + "─"*80, Colors.BLUE)
    log("💬 TESTE 7: SISTEMA DE MENSAGENS", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    if pf_id:
        response = create_note(vendedor_token, pf_id, "Primeira mensagem de teste")
        test_result(
            "Criar mensagem",
            response and response.status_code == 200
        )
        
        response = create_note(vendedor_token, pf_id, "Mensagem com @Ricardo menção")
        test_result(
            "Criar mensagem com menção",
            response and response.status_code == 200
        )
    
    time.sleep(1)
    
    # ===== TIMELINE: TAREFAS =====
    log("\n" + "─"*80, Colors.BLUE)
    log("✓ TESTE 8: SISTEMA DE TAREFAS", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    if pf_id:
        response = create_note(
            vendedor_token,
            pf_id,
            "Tarefa de teste: Ligar para o cliente",
            note_type="task",
            target_user_id=3
        )
        task_created = test_result(
            "Criar tarefa",
            response and response.status_code == 200
        )
        
        task_id = response.json()["id"] if task_created else None
        
        if task_id:
            # Iniciar tarefa
            response = update_task(vendedor_token, pf_id, task_id, "start")
            test_result(
                "Iniciar tarefa (pending → in_progress)",
                response and response.status_code == 200
            )
            
            # Concluir tarefa
            response = update_task(vendedor_token, pf_id, task_id, "complete")
            test_result(
                "Concluir tarefa (in_progress → completed)",
                response and response.status_code == 200
            )
            
            # Reabrir tarefa
            response = update_task(vendedor_token, pf_id, task_id, "reopen")
            test_result(
                "Reabrir tarefa (completed → pending)",
                response and response.status_code == 200
            )
    
    time.sleep(1)
    
    # ===== EXCLUSÃO (SOFT DELETE) =====
    log("\n" + "─"*80, Colors.BLUE)
    log("🗑️ TESTE 9: EXCLUSÃO (SOFT DELETE)", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    if pj_id:
        response = delete_customer(admin_token, pj_id)
        test_result(
            "Soft delete de cliente",
            response and response.status_code == 200
        )
        
        # Verificar que não aparece mais na listagem
        response = get_customers_paginated(admin_token)
        if response and response.status_code == 200:
            customers = response.json()["items"]
            not_in_list = not any(c["id"] == pj_id for c in customers)
            test_result(
                "Cliente excluído não aparece na listagem",
                not_in_list
            )
    
    time.sleep(1)
    
    # ===== PERMISSÕES =====
    log("\n" + "─"*80, Colors.BLUE)
    log("🔒 TESTE 10: CONTROLE DE PERMISSÕES", Colors.BOLD + Colors.BLUE)
    log("─"*80, Colors.BLUE)
    
    # Vendedor só vê seus clientes
    response = get_customers_paginated(vendedor_token)
    if response and response.status_code == 200:
        customers = response.json()["items"]
        all_belong_to_vendedor = all(c.get("salesperson_id") == 3 for c in customers)
        test_result(
            "Vendedor vê apenas seus clientes",
            all_belong_to_vendedor,
            f"Encontrados {len(customers)} clientes"
        )
    
    # Admin vê todos
    response = get_customers_paginated(admin_token)
    if response and response.status_code == 200:
        total_admin = response.json()["total"]
        log(f"   Admin vê {total_admin} clientes no total", Colors.CYAN)
    
    return True

def print_summary():
    """Imprime resumo dos testes"""
    log("\n" + "="*80, Colors.BOLD)
    log("📊 RESUMO DOS TESTES", Colors.BOLD + Colors.CYAN)
    log("="*80, Colors.BOLD)
    
    log(f"\nTotal de testes: {stats['total']}", Colors.BOLD)
    log(f"✅ Aprovados: {stats['passed']}", Colors.GREEN)
    log(f"❌ Falharam: {stats['failed']}", Colors.RED)
    
    if stats['failed'] == 0:
        log("\n🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente.", Colors.GREEN + Colors.BOLD)
        success_rate = 100
    else:
        success_rate = (stats['passed'] / stats['total']) * 100
        log(f"\n⚠️ Taxa de sucesso: {success_rate:.1f}%", Colors.YELLOW)
    
    log("\n" + "="*80 + "\n", Colors.BOLD)
    
    return stats['failed'] == 0

if __name__ == "__main__":
    try:
        log("\n🚀 Iniciando suite de testes...\n", Colors.BOLD)
        time.sleep(1)
        
        run_tests()
        success = print_summary()
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        log("\n\n⚠️ Testes interrompidos pelo usuário", Colors.YELLOW)
        sys.exit(1)
    except Exception as e:
        log(f"\n❌ Erro fatal: {str(e)}", Colors.RED)
        sys.exit(1)
