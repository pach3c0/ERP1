"""
Service Service Layer
Contém toda a lógica de negócio relacionada a Serviços.
Separado das rotas HTTP para permitir reutilização em qualquer contexto.
"""

from typing import Optional, Dict, List
from sqlmodel import Session, select
from fastapi import HTTPException

from models import Service, AuditLog, User
from utils import create_audit_log


class ServiceService:
    """Serviço de gerenciamento de serviços"""
    
    @staticmethod
    def check_service_exists_by_name(session: Session, name: str, exclude_id: Optional[int] = None) -> Optional[Service]:
        """
        Verifica se um serviço com o mesmo nome já existe.
        
        Args:
            session: Sessão do banco
            name: Nome do serviço
            exclude_id: ID a ser ignorado (útil em atualizações)
            
        Returns:
            Serviço existente ou None
        """
        statement = select(Service).where(Service.name == name)
        if exclude_id:
            statement = statement.where(Service.id != exclude_id)
        return session.exec(statement).first()
    
    @staticmethod
    def validate_prices(service_data: Dict) -> None:
        """
        Valida se os preços são válidos (não negativos).
        
        Raises:
            HTTPException: Se algum preço for negativo
        """
        prices = ['price_base', 'price_hourly']
        for price_field in prices:
            if price_field in service_data:
                value = service_data[price_field]
                if value is not None and value < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{price_field} não pode ser negativo"
                    )
    
    @staticmethod
    def create_service(
        session: Session,
        service_data: Dict,
        current_user: User
    ) -> Service:
        """
        Cria um novo serviço com validações e auditoria.
        
        Args:
            session: Sessão do banco de dados
            service_data: Dados do serviço (dict do Pydantic schema)
            current_user: Usuário autenticado criando o serviço
            
        Returns:
            Service criado
            
        Raises:
            HTTPException: Se validação falhar
        """
        # 1. Verificar permissão
        if current_user.role:
            role_permissions = current_user.role.permissions
            if not role_permissions.get("can_create_services", False) and current_user.role.slug != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Você não tem permissão para criar serviços"
                )
        
        # 2. Validar preços
        ServiceService.validate_prices(service_data)
        
        # 3. Verificar duplicata
        existing = ServiceService.check_service_exists_by_name(session, service_data.get("name"))
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Serviço '{service_data['name']}' já existe"
            )
        
        # 4. Determinar status (alguns roles requerem aprovação)
        status = service_data.pop('status', None) or 'ativo'
        if role_permissions.get("service_require_approval", False):
            status = "pendente"
        
        # 5. Criar serviço
        db_service = Service(**service_data, status=status)
        session.add(db_service)
        session.flush()  # Gera o ID
        
        # 6. Auditar
        create_audit_log(
            session=session,
            table_name='service',
            record_id=db_service.id,
            action='CREATE',
            user_id=current_user.id,
            changes={'name': db_service.name, 'status': status}
        )
        
        session.commit()
        return db_service
    
    @staticmethod
    def update_service(
        session: Session,
        service: Service,
        service_data: Dict,
        current_user: User
    ) -> Service:
        """
        Atualiza um serviço existente com rastreamento de mudanças.
        
        Args:
            session: Sessão do banco
            service: Serviço a atualizar
            service_data: Dados a atualizar (apenas campos definidos)
            current_user: Usuário fazendo a atualização
            
        Returns:
            Service atualizado
            
        Raises:
            HTTPException: Se validação ou permissão falhar
        """
        # 1. Verificar permissão geral
        role_permissions = current_user.role.permissions
        if not role_permissions.get("can_edit_service_basic", False) and current_user.role.slug != "admin":
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para editar serviços"
            )
        
        # 2. Validar preços se houver
        ServiceService.validate_prices(service_data)
        
        # 3. Rastrear mudanças
        changes = {}
        for key, value in service_data.items():
            if value is not None:
                old_value = getattr(service, key, None)
                if old_value != value:
                    changes[key] = {"old": old_value, "new": value}
                    setattr(service, key, value)
        
        if not changes:
            return service
        
        # 4. Salvar
        session.add(service)
        session.commit()
        session.refresh(service)
        
        # 5. Auditar
        create_audit_log(
            session=session,
            table_name='service',
            record_id=service.id,
            action='UPDATE',
            user_id=current_user.id,
            changes=changes
        )
        
        return service
    
    @staticmethod
    def update_service_status(
        session: Session,
        service: Service,
        new_status: str,
        current_user: User
    ) -> Service:
        """
        Atualiza apenas o status de um serviço.
        
        Args:
            session: Sessão do banco
            service: Serviço a atualizar
            new_status: Novo status (ativo, inativo, pendente, etc)
            current_user: Usuário fazendo a atualização
            
        Returns:
            Service com status atualizado
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        if current_user.role:
            role_permissions = current_user.role.permissions
            if not role_permissions.get("can_change_service_status", False) and current_user.role.slug != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Você não tem permissão para alterar status de serviços"
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="Usuário não tem role associado"
            )
        
        # 2. Validar novo status
        valid_statuses = ["ativo", "inativo", "pendente", "descontinuado"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Status inválido. Válidos: {', '.join(valid_statuses)}"
            )
        
        # 3. Atualizar
        old_status = service.status
        service.status = new_status
        session.add(service)
        session.commit()
        session.refresh(service)
        
        # 4. Auditar
        create_audit_log(
            session=session,
            table_name='service',
            record_id=service.id,
            action='UPDATE',
            user_id=current_user.id,
            changes={'status': {'old': old_status, 'new': new_status}}
        )
        
        return service
    
    @staticmethod
    def soft_delete_service(
        session: Session,
        service: Service,
        current_user: User
    ) -> None:
        """
        Marca um serviço como inativo (soft delete).
        
        Args:
            session: Sessão do banco
            service: Serviço a deletar
            current_user: Usuário fazendo a deleção
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        if current_user.role:
            role_permissions = current_user.role.permissions
            if not role_permissions.get("can_edit_service_basic", False) and current_user.role.slug != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Você não tem permissão para editar serviços"
                )
        
        # 2. Soft delete
        old_status = service.status
        service.status = "inativo"
        session.add(service)
        session.commit()
        
        # 3. Auditar
        create_audit_log(
            session=session,
            table_name='service',
            record_id=service.id,
            action='DELETE',
            user_id=current_user.id,
            changes={'status': {'old': old_status, 'new': 'inativo'}}
        )
    
    @staticmethod
    def get_services_for_user(
        session: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        category_filter: Optional[str] = None
    ) -> List[Service]:
        """
        Recupera serviços com filtros e respeita permissões do usuário.
        
        Args:
            session: Sessão do banco
            user: Usuário solicitando
            skip: Quantos registros pular
            limit: Limite de registros
            status_filter: Filtrar por status
            category_filter: Filtrar por categoria
            
        Returns:
            Lista de serviços
        """
        statement = select(Service).order_by(Service.created_at.desc())
        
        # Filtrar por status se especificado
        if status_filter:
            statement = statement.where(Service.status == status_filter)
        
        # Filtrar por categoria se especificado
        if category_filter:
            statement = statement.where(Service.category == category_filter)
        
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()
    
    @staticmethod
    def get_service_by_id(
        session: Session,
        service_id: int,
        user: User
    ) -> Optional[Service]:
        """
        Recupera um serviço específico por ID.
        
        Args:
            session: Sessão do banco
            service_id: ID do serviço
            user: Usuário solicitando
            
        Returns:
            Serviço ou None se não encontrado
        """
        return session.get(Service, service_id)
