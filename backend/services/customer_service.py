"""
Customer Service Layer
Contém toda a lógica de negócio relacionada a Clientes.
Separado das rotas HTTP para permitir reutilização em:
- Importação de Excel
- WebSockets
- Background Tasks (Celery)
- Testes unitários
"""

from typing import Optional, Dict, List
from sqlmodel import Session, select
from fastapi import HTTPException

from models import Customer, AuditLog, User


class CustomerService:
    """Serviço de gerenciamento de clientes"""
    
    @staticmethod
    def check_document_exists(session: Session, document: str) -> Optional[Customer]:
        """
        Verifica se um documento (CPF/CNPJ) já está cadastrado.
        
        Returns:
            Customer existente ou None
        """
        return session.exec(
            select(Customer).where(Customer.document == document)
        ).first()
    
    @staticmethod
    def determine_customer_status(user: User, role_permissions: Dict) -> str:
        """
        Define o status inicial do cliente baseado nas permissões do usuário.
        
        Args:
            user: Usuário que está criando o cliente
            role_permissions: Permissões do role do usuário
            
        Returns:
            "ativo" ou "pendente"
        """
        # Admin sempre cria como ativo
        if user.role.slug == "admin":
            return "ativo"
        
        # Outros roles: verificar se exigem aprovação
        require_approval = role_permissions.get("customer_require_approval", False)
        return "pendente" if require_approval else "ativo"
    
    @staticmethod
    def validate_required_fields(customer_data: Dict) -> None:
        """
        Valida campos obrigatórios do cliente.
        
        Raises:
            HTTPException: Se algum campo obrigatório estiver faltando
        """
        required_fields = ["status", "person_type", "name", "document"]
        for field in required_fields:
            if field not in customer_data or customer_data[field] is None:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Campo obrigatório faltando: {field}"
                )
    
    @staticmethod
    def create_customer(
        session: Session,
        customer_data: Dict,
        current_user: User
    ) -> Customer:
        """
        Cria um novo cliente com validações e auditoria.
        
        Args:
            session: Sessão do banco de dados
            customer_data: Dados do cliente (dict do Pydantic schema)
            current_user: Usuário autenticado criando o cliente
            
        Returns:
            Customer criado
            
        Raises:
            HTTPException: Se documento duplicado ou validação falhar
        """
        # 1. Verificar documento duplicado
        existing = CustomerService.check_document_exists(
            session, 
            customer_data["document"]
        )
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Documento já cadastrado no sistema"
            )
        
        # 2. Determinar status baseado em permissões
        role_permissions = current_user.role.permissions
        customer_data["status"] = CustomerService.determine_customer_status(
            current_user, 
            role_permissions
        )
        
        # 3. Auto-atribuir salesperson_id se Admin não especificou
        if current_user.role.slug == "admin" and not customer_data.get("salesperson_id"):
            customer_data["salesperson_id"] = current_user.id
        
        # 4. Validar campos obrigatórios
        CustomerService.validate_required_fields(customer_data)
        
        # 5. Criar o cliente
        new_customer = Customer(**customer_data)
        new_customer.created_by_id = current_user.id
        
        session.add(new_customer)
        session.commit()
        session.refresh(new_customer)
        
        # 6. Registrar auditoria
        CustomerService.create_audit_log(
            session=session,
            customer_id=new_customer.id,
            action="CREATE",
            user_id=current_user.id,
            changes={
                "created": True,
                "status": new_customer.status,
                "require_approval": role_permissions.get("customer_require_approval", False)
            }
        )
        
        return new_customer
    
    @staticmethod
    def can_user_edit_customer(
        user: User,
        customer: Customer,
        role_permissions: Dict
    ) -> bool:
        """
        Verifica se o usuário tem permissão para editar o cliente.
        
        Returns:
            True se pode editar, False caso contrário
        """
        # Admin pode tudo
        if user.role.slug == "admin":
            return True
        
        # Verificar permissões específicas
        can_edit_own = role_permissions.get("can_edit_own_customers", False)
        can_edit_others = role_permissions.get("can_edit_others_customers", False)
        
        # Pode editar próprios clientes
        if can_edit_own and customer.salesperson_id == user.id:
            return True
        
        # Pode editar clientes de outros
        if can_edit_others:
            return True
        
        return False
    
    @staticmethod
    def update_customer(
        session: Session,
        customer: Customer,
        customer_data: Dict,
        current_user: User
    ) -> Customer:
        """
        Atualiza um cliente existente com auditoria de mudanças.
        
        Args:
            session: Sessão do banco de dados
            customer: Cliente a ser atualizado
            customer_data: Novos dados do cliente
            current_user: Usuário fazendo a atualização
            
        Returns:
            Customer atualizado
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not CustomerService.can_user_edit_customer(
            current_user, 
            customer, 
            role_permissions
        ):
            raise HTTPException(
                status_code=403, 
                detail="Você não tem permissão para editar este cliente"
            )
        
        # 2. Capturar mudanças para auditoria
        changes = {}
        for key, value in customer_data.items():
            old_value = getattr(customer, key)
            if old_value != value:
                changes[key] = {"old": old_value, "new": value}
                setattr(customer, key, value)
        
        # 3. Salvar mudanças
        if changes:
            session.add(customer)
            session.commit()
            session.refresh(customer)
            
            # 4. Registrar auditoria
            CustomerService.create_audit_log(
                session=session,
                customer_id=customer.id,
                action="UPDATE",
                user_id=current_user.id,
                changes=changes
            )
        
        return customer
    
    @staticmethod
    def can_user_change_status(
        user: User,
        customer: Customer,
        role_permissions: Dict
    ) -> bool:
        """
        Verifica se usuário pode alterar status do cliente.
        """
        # Admin sempre pode
        if user.role.slug == "admin":
            return True
        
        # Verificar permissão específica
        can_change_status = role_permissions.get("customer_change_status", False)
        if not can_change_status:
            return False
        
        # Manager pode alterar qualquer cliente
        if user.role.slug == "manager":
            return True
        
        # Outros roles: apenas seus próprios clientes
        return customer.salesperson_id == user.id
    
    @staticmethod
    def update_customer_status(
        session: Session,
        customer: Customer,
        new_status: str,
        current_user: User
    ) -> Customer:
        """
        Atualiza apenas o status do cliente (operação leve para bulk actions).
        
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not CustomerService.can_user_change_status(
            current_user, 
            customer, 
            role_permissions
        ):
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para alterar status de clientes"
            )
        
        # 2. Atualizar se houver mudança
        old_status = customer.status
        if old_status != new_status:
            customer.status = new_status
            session.add(customer)
            session.commit()
            session.refresh(customer)
            
            # 3. Registrar auditoria
            CustomerService.create_audit_log(
                session=session,
                customer_id=customer.id,
                action="UPDATE_STATUS",
                user_id=current_user.id,
                changes={"status": {"old": old_status, "new": new_status}}
            )
        
        return customer
    
    @staticmethod
    def create_audit_log(
        session: Session,
        customer_id: int,
        action: str,
        user_id: int,
        changes: Dict
    ) -> None:
        """
        Cria um registro de auditoria.
        
        Args:
            session: Sessão do banco de dados
            customer_id: ID do cliente
            action: Tipo de ação (CREATE, UPDATE, UPDATE_STATUS, DELETE)
            user_id: ID do usuário que executou a ação
            changes: Dicionário com as mudanças realizadas
        """
        audit = AuditLog(
            table_name="customer",
            record_id=customer_id,
            action=action,
            user_id=user_id,
            changes=changes
        )
        session.add(audit)
        session.commit()
    
    @staticmethod
    def get_customers_for_user(
        session: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None
    ) -> List[Customer]:
        """
        Retorna lista de clientes que o usuário pode visualizar.
        Aplica filtros de hierarquia e permissões.
        
        Args:
            session: Sessão do banco
            user: Usuário requisitante
            skip: Offset para paginação
            limit: Limite de resultados
            status_filter: Filtro opcional de status ("ativo", "pendente", etc)
            
        Returns:
            Lista de clientes
        """
        # Construir query base
        statement = select(Customer)
        
        # Aplicar filtro de status se fornecido
        if status_filter:
            statement = statement.where(Customer.status == status_filter)
        
        # Aplicar filtro de hierarquia
        role_slug = user.role.slug
        role_permissions = user.role.permissions
        
        if role_slug == "admin":
            # Admin vê todos
            pass
        elif role_slug == "manager":
            # Manager vê todos ou apenas sua hierarquia (dependendo da config)
            view_all = role_permissions.get("customer_view_all", True)
            if not view_all:
                # Filtrar apenas clientes da hierarquia
                supervised_ids = [u.id for u in user.monitoring]
                supervised_ids.append(user.id)
                statement = statement.where(
                    Customer.salesperson_id.in_(supervised_ids)
                )
        else:
            # Vendedores veem apenas seus clientes
            statement = statement.where(Customer.salesperson_id == user.id)
        
        # Aplicar paginação
        statement = statement.offset(skip).limit(limit)
        
        return list(session.exec(statement).all())
