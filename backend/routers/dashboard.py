"""
Rotas HTTP do Dashboard
KPIs e estatísticas do sistema
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from typing import Optional

from database import get_session
from models import Customer, Quote, Product, Service, User, AuditLog
from dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna estatísticas do dashboard:
    - Total de clientes (ativo/pendente)
    - Total de orçamentos (por status)
    - Receita total (orçamentos aprovados)
    - Produtos e Serviços cadastrados
    - Últimos registros
    """
    
    # Verificar permissão - apenas usuários autenticados podem ver
    if not current_user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    # 1. CLIENTES
    total_customers = session.query(func.count(Customer.id)).scalar() or 0
    active_customers = session.query(func.count(Customer.id)).filter(
        Customer.status == "ativo"
    ).scalar() or 0
    pending_customers = session.query(func.count(Customer.id)).filter(
        Customer.status == "pendente"
    ).scalar() or 0
    
    # 2. ORÇAMENTOS
    total_quotes = session.query(func.count(Quote.id)).scalar() or 0
    
    # Contar por status
    quotes_draft = session.query(func.count(Quote.id)).filter(
        Quote.status == "rascunho"
    ).scalar() or 0
    quotes_sent = session.query(func.count(Quote.id)).filter(
        Quote.status == "enviado"
    ).scalar() or 0
    quotes_approved = session.query(func.count(Quote.id)).filter(
        Quote.status == "aprovado"
    ).scalar() or 0
    quotes_billed = session.query(func.count(Quote.id)).filter(
        Quote.status == "faturado"
    ).scalar() or 0
    
    # 3. RECEITA (somar total de orçamentos aprovados/faturados)
    approved_total = session.query(func.sum(Quote.total)).filter(
        Quote.status.in_(["aprovado", "faturado"])
    ).scalar() or 0.0
    
    billed_total = session.query(func.sum(Quote.total)).filter(
        Quote.status == "faturado"
    ).scalar() or 0.0
    
    # 4. PRODUTOS E SERVIÇOS
    total_products = session.query(func.count(Product.id)).scalar() or 0
    total_services = session.query(func.count(Service.id)).scalar() or 0
    
    available_products = session.query(func.count(Product.id)).filter(
        Product.status == "disponivel"
    ).scalar() or 0
    available_services = session.query(func.count(Service.id)).filter(
        Service.status == "disponivel"
    ).scalar() or 0
    
    # 5. ÚLTIMAS ATIVIDADES (últimos 5 dias)
    five_days_ago = datetime.utcnow() - timedelta(days=5)
    recent_audits = session.query(AuditLog).filter(
        AuditLog.created_at >= five_days_ago
    ).order_by(AuditLog.created_at.desc()).limit(10).all()
    
    audit_summary = []
    for audit in recent_audits:
        audit_summary.append({
            "table_name": audit.table_name,
            "action": audit.action,
            "created_at": audit.created_at.isoformat(),
            "user_id": audit.user_id
        })
    
    # 6. GRÁFICO: Orçamentos por status (últimas 30 dias)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    quotes_by_status = {
        "rascunho": session.query(func.count(Quote.id)).filter(
            Quote.status == "rascunho",
            Quote.created_at >= thirty_days_ago
        ).scalar() or 0,
        "enviado": session.query(func.count(Quote.id)).filter(
            Quote.status == "enviado",
            Quote.created_at >= thirty_days_ago
        ).scalar() or 0,
        "aprovado": session.query(func.count(Quote.id)).filter(
            Quote.status == "aprovado",
            Quote.created_at >= thirty_days_ago
        ).scalar() or 0,
        "faturado": session.query(func.count(Quote.id)).filter(
            Quote.status == "faturado",
            Quote.created_at >= thirty_days_ago
        ).scalar() or 0,
    }
    
    # 7. GRÁFICO: Clientes por status
    customers_by_status = {
        "ativo": active_customers,
        "pendente": pending_customers
    }
    
    # 8. TOP VENDEDORES (clientes por vendedor)
    top_salespeople = session.query(
        User.name,
        func.count(Customer.id).label("total_customers")
    ).outerjoin(
        Customer, Customer.salesperson_id == User.id
    ).filter(
        User.role_id.isnot(None)
    ).group_by(
        User.id, User.name
    ).order_by(
        func.count(Customer.id).desc()
    ).limit(5).all()
    
    salespeople_data = [
        {"name": name, "total_customers": count}
        for name, count in top_salespeople
    ]
    
    return {
        "customers": {
            "total": total_customers,
            "active": active_customers,
            "pending": pending_customers,
            "by_status": customers_by_status
        },
        "quotes": {
            "total": total_quotes,
            "draft": quotes_draft,
            "sent": quotes_sent,
            "approved": quotes_approved,
            "billed": quotes_billed,
            "by_status": quotes_by_status
        },
        "revenue": {
            "approved_total": float(approved_total),
            "billed_total": float(billed_total)
        },
        "inventory": {
            "total_products": total_products,
            "available_products": available_products,
            "total_services": total_services,
            "available_services": available_services
        },
        "recent_activities": audit_summary,
        "top_salespeople": salespeople_data
    }


@router.get("/quotes-timeline")
def get_quotes_timeline(
    days: int = 30,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna timeline de orçamentos dos últimos N dias
    Agrupa por data e status
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    quotes = session.query(Quote).filter(
        Quote.created_at >= cutoff_date
    ).order_by(Quote.created_at).all()
    
    timeline = {}
    for quote in quotes:
        date_key = quote.created_at.date().isoformat()
        if date_key not in timeline:
            timeline[date_key] = {
                "rascunho": 0,
                "enviado": 0,
                "aprovado": 0,
                "faturado": 0
            }
        timeline[date_key][quote.status] += 1
    
    return {"timeline": timeline}


@router.get("/revenue-by-month")
def get_revenue_by_month(
    months: int = 12,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna receita acumulada por mês (últimos N meses)
    """
    
    cutoff_date = datetime.utcnow() - timedelta(days=30 * months)
    
    quotes = session.query(Quote).filter(
        Quote.status.in_(["aprovado", "faturado"]),
        Quote.created_at >= cutoff_date
    ).all()
    
    revenue = {}
    for quote in quotes:
        month_key = quote.created_at.strftime("%Y-%m")
        if month_key not in revenue:
            revenue[month_key] = 0.0
        revenue[month_key] += float(quote.total or 0)
    
    # Preencher meses vazios
    current = datetime.utcnow()
    for i in range(months):
        month_date = current - timedelta(days=30 * i)
        month_key = month_date.strftime("%Y-%m")
        if month_key not in revenue:
            revenue[month_key] = 0.0
    
    return {
        "revenue_by_month": dict(sorted(revenue.items()))
    }
