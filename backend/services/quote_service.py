"""
Quote Service Layer
Contém toda a lógica de negócio relacionada a Orçamentos/Cotações.
"""

from typing import Optional, Dict, List
from sqlmodel import Session, select
from fastapi import HTTPException
from datetime import datetime, timedelta
import json

from models import Quote, Customer, Product, Service, User
from utils import create_audit_log


class QuoteService:
    """Serviço de gerenciamento de orçamentos"""
    
    @staticmethod
    def generate_quote_number(session: Session) -> str:
        """
        Gera número sequencial de orçamento no formato ORC-YYYY-NNNN.
        """
        current_year = datetime.now().year
        prefix = f"ORC-{current_year}-"
        
        # Buscar último orçamento do ano
        statement = select(Quote).where(
            Quote.quote_number.startswith(prefix)
        ).order_by(Quote.id.desc())
        
        last_quote = session.exec(statement).first()
        
        if last_quote:
            # Extrair número e incrementar
            last_number = int(last_quote.quote_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{new_number:04d}"
    
    @staticmethod
    def calculate_totals(items: List[Dict]) -> Dict[str, float]:
        """
        Calcula subtotal a partir dos itens.
        
        Returns:
            Dict com subtotal calculado
        """
        subtotal = sum(item.get('subtotal', 0) for item in items)
        return {"subtotal": subtotal}
    
    @staticmethod
    def apply_discount(subtotal: float, discount: float, discount_percent: float) -> float:
        """
        Aplica descontos ao subtotal.
        
        Args:
            subtotal: Valor antes do desconto
            discount: Desconto em valor absoluto
            discount_percent: Desconto em percentual
            
        Returns:
            Total com descontos aplicados
        """
        # Desconto percentual
        if discount_percent > 0:
            discount += subtotal * (discount_percent / 100)
        
        total = subtotal - discount
        return max(0, total)  # Não pode ser negativo
    
    @staticmethod
    def validate_items(session: Session, items: List[Dict]) -> None:
        """
        Valida se os itens existem e estão disponíveis.
        
        Raises:
            HTTPException: Se algum item for inválido
        """
        for item in items:
            item_type = item.get('type')
            item_id = item.get('item_id')
            quantity = item.get('quantity', 1)
            
            if item_type == 'product':
                product = session.get(Product, item_id)
                if not product:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Produto ID {item_id} não encontrado"
                    )
                if product.status != "disponivel":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Produto '{product.name}' não está disponível"
                    )
                if product.quantity < quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Estoque insuficiente para '{product.name}'. Disponível: {product.quantity}"
                    )
                    
            elif item_type == 'service':
                service = session.get(Service, item_id)
                if not service:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Serviço ID {item_id} não encontrado"
                    )
                if service.status != "ativo":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Serviço '{service.name}' não está ativo"
                    )
    
    @staticmethod
    def create_quote(
        session: Session,
        quote_data: Dict,
        current_user: User
    ) -> Quote:
        """
        Cria um novo orçamento.
        """
        # 1. Verificar permissão
        if current_user.role:
            role_permissions = current_user.role.permissions
            if not role_permissions.get("can_create_quotes", True):
                raise HTTPException(
                    status_code=403,
                    detail="Você não tem permissão para criar orçamentos"
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="Usuário não tem role associado"
            )
        
        # 2. Verificar se cliente existe
        customer = session.get(Customer, quote_data['customer_id'])
        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Cliente não encontrado"
            )
        
        # 3. Validar itens
        items = quote_data.get('items', [])
        if not items:
            raise HTTPException(
                status_code=400,
                detail="Orçamento deve ter pelo menos um item"
            )
        
        # Converter objetos Pydantic para dicts se necessário
        items_dict = [item.dict() if hasattr(item, 'dict') else item for item in items]
        QuoteService.validate_items(session, items_dict)
        
        # 4. Calcular totais
        totals = QuoteService.calculate_totals(items_dict)
        subtotal = totals['subtotal']
        
        discount = quote_data.get('discount', 0.0)
        discount_percent = quote_data.get('discount_percent', 0.0)
        total = QuoteService.apply_discount(subtotal, discount, discount_percent)
        
        # 5. Gerar número do orçamento
        quote_number = QuoteService.generate_quote_number(session)
        
        # 6. Definir validade (30 dias por padrão)
        valid_until = quote_data.get('valid_until')
        if not valid_until:
            valid_until = datetime.now() + timedelta(days=30)
        
        # 7. Criar orçamento
        db_quote = Quote(
            quote_number=quote_number,
            customer_id=quote_data['customer_id'],
            items=json.dumps(items_dict),  # Converter para JSON string
            subtotal=subtotal,
            discount=discount,
            discount_percent=discount_percent,
            total=total,
            status="rascunho",
            valid_until=valid_until,
            notes=quote_data.get('notes'),
            payment_terms=quote_data.get('payment_terms'),
            delivery_terms=quote_data.get('delivery_terms')
        )
        
        session.add(db_quote)
        session.flush()
        
        # 8. Auditar
        create_audit_log(
            session=session,
            table_name='quote',
            record_id=db_quote.id,
            action='CREATE',
            user_id=current_user.id,
            changes={'quote_number': quote_number, 'total': total}
        )
        
        session.commit()
        session.refresh(db_quote)
        return db_quote
    
    @staticmethod
    def update_quote_status(
        session: Session,
        quote: Quote,
        new_status: str,
        current_user: User
    ) -> Quote:
        """
        Atualiza o status de um orçamento.
        """
        valid_statuses = ["rascunho", "enviado", "aprovado", "recusado", "faturado", "cancelado"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Status inválido. Válidos: {', '.join(valid_statuses)}"
            )
        
        old_status = quote.status
        quote.status = new_status
        
        # Atualizar timestamps relevantes
        if new_status == "enviado" and not quote.sent_at:
            quote.sent_at = datetime.now()
        elif new_status == "aprovado" and not quote.approved_at:
            quote.approved_at = datetime.now()
        elif new_status == "faturado" and not quote.invoiced_at:
            quote.invoiced_at = datetime.now()
        
        session.add(quote)
        session.commit()
        session.refresh(quote)
        
        # Auditar
        create_audit_log(
            session=session,
            table_name='quote',
            record_id=quote.id,
            action='UPDATE',
            user_id=current_user.id,
            changes={'status': {'old': old_status, 'new': new_status}}
        )
        
        return quote
    
    @staticmethod
    def get_quotes_for_user(
        session: Session,
        user: User,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        customer_id: Optional[int] = None
    ) -> List[Quote]:
        """
        Recupera orçamentos com filtros.
        """
        statement = select(Quote).order_by(Quote.created_at.desc())
        
        if status_filter:
            statement = statement.where(Quote.status == status_filter)
        
        if customer_id:
            statement = statement.where(Quote.customer_id == customer_id)
        
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()
