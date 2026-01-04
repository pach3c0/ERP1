"""
Rotas HTTP de Orçamentos (Quotes)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from typing import Optional, List
import json
import logging

from database import get_session
from models import Quote, Customer
from dependencies import get_current_user
from schemas import QuoteCreate, QuoteRead, QuoteUpdate, QuoteItem
from services.quote_service import QuoteService
from pdf_generator import generate_quote_pdf
from email_service import send_quote_status_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.post("/", response_model=QuoteRead)
def create_quote(
    quote_input: QuoteCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Cria um novo orçamento.
    """
    quote_data = quote_input.dict()
    new_quote = QuoteService.create_quote(
        session=session,
        quote_data=quote_data,
        current_user=current_user
    )
    
    # Converter items de JSON string para lista
    items_list = json.loads(new_quote.items) if isinstance(new_quote.items, str) else new_quote.items
    
    return QuoteRead(
        id=new_quote.id,
        quote_number=new_quote.quote_number,
        customer_id=new_quote.customer_id,
        items=[QuoteItem(**item) for item in items_list],
        subtotal=new_quote.subtotal,
        discount=new_quote.discount,
        discount_percent=new_quote.discount_percent,
        total=new_quote.total,
        status=new_quote.status,
        valid_until=new_quote.valid_until,
        notes=new_quote.notes,
        payment_terms=new_quote.payment_terms,
        delivery_terms=new_quote.delivery_terms,
        sent_at=new_quote.sent_at,
        approved_at=new_quote.approved_at,
        invoiced_at=new_quote.invoiced_at,
        created_at=new_quote.created_at,
        updated_at=new_quote.updated_at
    )


@router.get("/", response_model=dict)
def list_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Lista orçamentos com filtros opcionais.
    """
    quotes = QuoteService.get_quotes_for_user(
        session=session,
        user=current_user,
        skip=skip,
        limit=limit,
        status_filter=status,
        customer_id=customer_id
    )
    
    # Contar total
    all_quotes = QuoteService.get_quotes_for_user(
        session=session,
        user=current_user,
        status_filter=status,
        customer_id=customer_id
    )
    
    # Converter para QuoteRead
    quotes_read = []
    for quote in quotes:
        items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        quotes_read.append(QuoteRead(
            id=quote.id,
            quote_number=quote.quote_number,
            customer_id=quote.customer_id,
            items=[QuoteItem(**item) for item in items_list],
            subtotal=quote.subtotal,
            discount=quote.discount,
            discount_percent=quote.discount_percent,
            total=quote.total,
            status=quote.status,
            valid_until=quote.valid_until,
            notes=quote.notes,
            payment_terms=quote.payment_terms,
            delivery_terms=quote.delivery_terms,
            sent_at=quote.sent_at,
            approved_at=quote.approved_at,
            invoiced_at=quote.invoiced_at,
            created_at=quote.created_at,
            updated_at=quote.updated_at
        ))
    
    return {
        "items": quotes_read,
        "total": len(all_quotes),
        "skip": skip,
        "limit": limit
    }


@router.get("/{quote_id}", response_model=QuoteRead)
def get_quote(
    quote_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Busca um orçamento específico por ID.
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
    
    return QuoteRead(
        id=quote.id,
        quote_number=quote.quote_number,
        customer_id=quote.customer_id,
        items=[QuoteItem(**item) for item in items_list],
        subtotal=quote.subtotal,
        discount=quote.discount,
        discount_percent=quote.discount_percent,
        total=quote.total,
        status=quote.status,
        valid_until=quote.valid_until,
        notes=quote.notes,
        payment_terms=quote.payment_terms,
        delivery_terms=quote.delivery_terms,
        sent_at=quote.sent_at,
        approved_at=quote.approved_at,
        invoiced_at=quote.invoiced_at,
        created_at=quote.created_at,
        updated_at=quote.updated_at
    )


@router.patch("/{quote_id}/status")
def update_quote_status(
    quote_id: int,
    status_update: dict = Body(...),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza apenas o status de um orçamento.
    Envia email de notificação ao cliente quando status muda.
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Store previous status for email notification
    previous_status = quote.status
    
    updated_quote = QuoteService.update_quote_status(
        session=session,
        quote=quote,
        new_status=status_update.get('new_status'),
        current_user=current_user
    )
    
    # Send email notification to customer
    try:
        customer = session.get(Customer, updated_quote.customer_id)
        if customer and customer.email:
            # Only send email if status actually changed
            if previous_status != updated_quote.status:
                send_quote_status_notification(
                    customer_email=customer.email,
                    customer_name=customer.name,
                    quote_number=updated_quote.quote_number,
                    new_status=updated_quote.status,
                    previous_status=previous_status
                )
                logger.info(f"Notification email sent for quote {updated_quote.quote_number}")
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Failed to send email notification: {str(e)}")
    
    items_list = json.loads(updated_quote.items) if isinstance(updated_quote.items, str) else updated_quote.items
    
    return QuoteRead(
        id=updated_quote.id,
        quote_number=updated_quote.quote_number,
        customer_id=updated_quote.customer_id,
        items=[QuoteItem(**item) for item in items_list],
        subtotal=updated_quote.subtotal,
        discount=updated_quote.discount,
        discount_percent=updated_quote.discount_percent,
        total=updated_quote.total,
        status=updated_quote.status,
        valid_until=updated_quote.valid_until,
        notes=updated_quote.notes,
        payment_terms=updated_quote.payment_terms,
        delivery_terms=updated_quote.delivery_terms,
        sent_at=updated_quote.sent_at,
        approved_at=updated_quote.approved_at,
        invoiced_at=updated_quote.invoiced_at,
        created_at=updated_quote.created_at,
        updated_at=updated_quote.updated_at
    )


@router.get("/customer/{customer_id}")
def get_quotes_by_customer(
    customer_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna todos os orçamentos de um cliente específico.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    quotes = QuoteService.get_quotes_for_user(
        session=session,
        user=current_user,
        customer_id=customer_id
    )
    
    quotes_read = []
    for quote in quotes:
        items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        quotes_read.append(QuoteRead(
            id=quote.id,
            quote_number=quote.quote_number,
            customer_id=quote.customer_id,
            items=[QuoteItem(**item) for item in items_list],
            subtotal=quote.subtotal,
            discount=quote.discount,
            discount_percent=quote.discount_percent,
            total=quote.total,
            status=quote.status,
            valid_until=quote.valid_until,
            notes=quote.notes,
            payment_terms=quote.payment_terms,
            delivery_terms=quote.delivery_terms,
            sent_at=quote.sent_at,
            approved_at=quote.approved_at,
            invoiced_at=quote.invoiced_at,
            created_at=quote.created_at,
            updated_at=quote.updated_at
        ))
    
    return {
        "customer": customer.name,
        "quotes": quotes_read,
        "total": len(quotes_read)
    }

@router.delete("/{quote_id}")
def delete_quote(
    quote_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Deleta um orçamento (apenas admin ou quem criou).
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Verificar permissão
    if current_user.role and current_user.role.slug != "admin":
        raise HTTPException(
            status_code=403,
            detail="Apenas administradores podem deletar orçamentos"
        )
    
    session.delete(quote)
    session.commit()
    
    return {"detail": "Orçamento deletado com sucesso"}


@router.get("/{quote_id}/pdf")
def get_quote_pdf(
    quote_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Gera e retorna um PDF do orçamento.
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    # Buscar dados do cliente
    customer = session.get(Customer, quote.customer_id)
    
    # Preparar dados para o PDF
    items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
    
    quote_data = {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "status": quote.status,
        "created_at": quote.created_at.isoformat() if quote.created_at else "",
        "valid_until": quote.valid_until,
        "subtotal": float(quote.subtotal or 0),
        "discount": float(quote.discount or 0),
        "discount_percent": float(quote.discount_percent or 0),
        "total": float(quote.total or 0),
        "payment_terms": quote.payment_terms or "",
        "delivery_terms": quote.delivery_terms or "",
        "notes": quote.notes or "",
        "items": items_list or [],
        "customer": {
            "name": customer.name if customer else "N/A",
            "document": customer.document if customer else "N/A",
            "email": customer.email if customer else "N/A",
            "phone": customer.phone if customer else "N/A",
            "address_line": customer.address_line if customer else "N/A",
            "number": customer.number if customer else "N/A",
            "city": customer.city if customer else "N/A",
            "state": customer.state if customer else "N/A",
        }
    }
    
    # Gerar PDF
    pdf_content = generate_quote_pdf(quote_data)
    
    # Retornar como download
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={quote.quote_number}.pdf"
        }
    )