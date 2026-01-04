"""
Product Service Layer
Contém toda a lógica de negócio relacionada a Produtos.
Separado das rotas HTTP para permitir reutilização em qualquer contexto.
"""

from typing import Optional, Dict, List
from sqlmodel import Session, select
from fastapi import HTTPException

from models import Product, AuditLog, User


class ProductService:
    """Serviço de gerenciamento de produtos"""
    
    @staticmethod
    def check_product_exists_by_name(session: Session, name: str, exclude_id: Optional[int] = None) -> Optional[Product]:
        """
        Verifica se um produto com o mesmo nome já existe.
        
        Args:
            session: Sessão do banco
            name: Nome do produto
            exclude_id: ID a ser ignorado (útil em atualizações)
            
        Returns:
            Produto existente ou None
        """
        statement = select(Product).where(Product.name == name)
        if exclude_id:
            statement = statement.where(Product.id != exclude_id)
        return session.exec(statement).first()
    
    @staticmethod
    def validate_prices(product_data: Dict) -> None:
        """
        Valida se os preços são válidos (não negativos).
        
        Raises:
            HTTPException: Se algum preço for negativo
        """
        prices = ['price_daily', 'price_weekly', 'price_monthly', 'cost']
        for price_field in prices:
            if price_field in product_data:
                value = product_data[price_field]
                if value is not None and value < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{price_field} não pode ser negativo"
                    )
    
    @staticmethod
    def validate_quantity(quantity: int) -> None:
        """
        Valida a quantidade (deve ser positiva).
        
        Raises:
            HTTPException: Se quantidade <= 0
        """
        if quantity is not None and quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantidade deve ser maior que 0"
            )
    
    @staticmethod
    def create_product(
        session: Session,
        product_data: Dict,
        current_user: User
    ) -> Product:
        """
        Cria um novo produto com validações e auditoria.
        
        Args:
            session: Sessão do banco de dados
            product_data: Dados do produto (dict do Pydantic schema)
            current_user: Usuário autenticado criando o produto
            
        Returns:
            Product criado
            
        Raises:
            HTTPException: Se validação falhar
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not role_permissions.get("can_create_products", False) and current_user.role.slug != "admin":
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para criar produtos"
            )
        
        # 2. Validar preços
        ProductService.validate_prices(product_data)
        
        # 3. Validar quantidade
        ProductService.validate_quantity(product_data.get("quantity", 1))
        
        # 4. Verificar duplicata por nome
        existing = ProductService.check_product_exists_by_name(
            session,
            product_data["name"]
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Produto com nome '{product_data['name']}' já existe"
            )
        
        # 5. Criar produto
        new_product = Product(**product_data)
        session.add(new_product)
        session.commit()
        session.refresh(new_product)
        
        # 6. Registrar auditoria
        ProductService.create_audit_log(
            session=session,
            product_id=new_product.id,
            action="CREATE",
            user_id=current_user.id,
            changes={
                "created": True,
                "name": new_product.name,
                "status": new_product.status
            }
        )
        
        return new_product
    
    @staticmethod
    def can_user_edit_product(
        user: User,
        role_permissions: Dict
    ) -> bool:
        """
        Verifica se o usuário pode editar produtos.
        
        Returns:
            True se pode editar, False caso contrário
        """
        # Admin sempre pode
        if user.role.slug == "admin":
            return True
        
        # Gerente pode editar
        if user.role.slug == "manager":
            return role_permissions.get("can_edit_product_basic", False)
        
        # Outros: sem permissão
        return False
    
    @staticmethod
    def update_product(
        session: Session,
        product: Product,
        product_data: Dict,
        current_user: User
    ) -> Product:
        """
        Atualiza um produto existente com auditoria.
        
        Args:
            session: Sessão do banco
            product: Produto a ser atualizado
            product_data: Novos dados do produto
            current_user: Usuário fazendo a atualização
            
        Returns:
            Product atualizado
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not ProductService.can_user_edit_product(current_user, role_permissions):
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para editar produtos"
            )
        
        # 2. Validar preços
        ProductService.validate_prices(product_data)
        
        # 3. Validar quantidade
        if "quantity" in product_data:
            ProductService.validate_quantity(product_data["quantity"])
        
        # 4. Verificar duplicata se mudar nome
        if "name" in product_data and product_data["name"] != product.name:
            existing = ProductService.check_product_exists_by_name(
                session,
                product_data["name"],
                exclude_id=product.id
            )
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Produto com nome '{product_data['name']}' já existe"
                )
        
        # 5. Capturar mudanças para auditoria
        changes = {}
        for key, value in product_data.items():
            old_value = getattr(product, key)
            if old_value != value:
                changes[key] = {"old": old_value, "new": value}
                setattr(product, key, value)
        
        # 6. Salvar mudanças
        if changes:
            session.add(product)
            session.commit()
            session.refresh(product)
            
            # 7. Registrar auditoria
            ProductService.create_audit_log(
                session=session,
                product_id=product.id,
                action="UPDATE",
                user_id=current_user.id,
                changes=changes
            )
        
        return product
    
    @staticmethod
    def update_product_status(
        session: Session,
        product: Product,
        new_status: str,
        current_user: User
    ) -> Product:
        """
        Atualiza apenas o status do produto.
        
        Args:
            session: Sessão do banco
            product: Produto a ser atualizado
            new_status: Novo status (disponivel, locado, em_manutencao, inativo)
            current_user: Usuário fazendo a atualização
            
        Returns:
            Product atualizado
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not role_permissions.get("can_change_product_status", False) and current_user.role.slug != "admin":
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para alterar status de produtos"
            )
        
        # 2. Validar status
        valid_statuses = ["disponivel", "locado", "em_manutencao", "inativo"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Status inválido. Permitidos: {', '.join(valid_statuses)}"
            )
        
        # 3. Atualizar se houver mudança
        old_status = product.status
        if old_status != new_status:
            product.status = new_status
            session.add(product)
            session.commit()
            session.refresh(product)
            
            # 4. Registrar auditoria
            ProductService.create_audit_log(
                session=session,
                product_id=product.id,
                action="UPDATE_STATUS",
                user_id=current_user.id,
                changes={"status": {"old": old_status, "new": new_status}}
            )
        
        return product
    
    @staticmethod
    def soft_delete_product(
        session: Session,
        product: Product,
        current_user: User
    ) -> None:
        """
        Faz soft delete (marca como inativo) de um produto.
        
        Args:
            session: Sessão do banco
            product: Produto a ser deletado
            current_user: Usuário fazendo a deleção
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        # 1. Verificar permissão
        role_permissions = current_user.role.permissions
        if not role_permissions.get("can_delete_products", False) and current_user.role.slug != "admin":
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para deletar produtos"
            )
        
        # 2. Marcar como inativo
        old_status = product.status
        product.status = "inativo"
        session.add(product)
        session.commit()
        
        # 3. Registrar auditoria
        ProductService.create_audit_log(
            session=session,
            product_id=product.id,
            action="SOFT_DELETE",
            user_id=current_user.id,
            changes={
                "status_anterior": old_status,
                "status_novo": "inativo",
                "deleted": True
            }
        )
    
    @staticmethod
    def create_audit_log(
        session: Session,
        product_id: int,
        action: str,
        user_id: int,
        changes: Dict
    ) -> None:
        """
        Cria um registro de auditoria para produtos.
        
        Args:
            session: Sessão do banco
            product_id: ID do produto
            action: Tipo de ação (CREATE, UPDATE, UPDATE_STATUS, SOFT_DELETE)
            user_id: ID do usuário que executou a ação
            changes: Dicionário com as mudanças realizadas
        """
        audit = AuditLog(
            table_name="product",
            record_id=product_id,
            action=action,
            user_id=user_id,
            changes=changes
        )
        session.add(audit)
        session.commit()
    
    @staticmethod
    def get_products_for_user(
        session: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        category_filter: Optional[str] = None
    ) -> List[Product]:
        """
        Retorna lista de produtos que o usuário pode visualizar.
        
        Args:
            session: Sessão do banco
            user: Usuário requisitante
            skip: Offset para paginação
            limit: Limite de resultados
            status_filter: Filtro opcional de status
            category_filter: Filtro opcional de categoria
            
        Returns:
            Lista de produtos
        """
        # Construir query base
        statement = select(Product)
        
        # Aplicar filtro de status se fornecido
        if status_filter:
            statement = statement.where(Product.status == status_filter)
        
        # Aplicar filtro de categoria se fornecido
        if category_filter:
            statement = statement.where(Product.category == category_filter)
        
        # Verificar se usuário pode ver todos os produtos
        role_permissions = user.role.permissions
        can_view_all = role_permissions.get("can_view_products", True)
        
        if not can_view_all and user.role.slug not in ["admin", "manager"]:
            # Vendedor não pode ver produtos (depende da implementação de negócio)
            return []
        
        # Aplicar paginação
        statement = statement.offset(skip).limit(limit)
        
        return list(session.exec(statement).all())
    
    @staticmethod
    def get_product_by_id(
        session: Session,
        product_id: int,
        user: User
    ) -> Optional[Product]:
        """
        Retorna um produto específico com validação de permissões.
        
        Args:
            session: Sessão do banco
            product_id: ID do produto
            user: Usuário requisitante
            
        Returns:
            Product ou None
            
        Raises:
            HTTPException: Se não tiver permissão
        """
        product = session.get(Product, product_id)
        
        if not product:
            return None
        
        # Verificar permissão
        role_permissions = user.role.permissions
        can_view = role_permissions.get("can_view_products", True)
        
        if not can_view and user.role.slug not in ["admin", "manager"]:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para visualizar produtos"
            )
        
        return product
