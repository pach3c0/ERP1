"""
Rotas HTTP de Relatórios
Análises e exportações de dados
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from typing import Optional
import json

from database import get_session
from models import Quote, Customer, User, Product, Service
from dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/sales-by-period")
def get_sales_by_period(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    salesperson_id: Optional[int] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna vendas agrupadas por período (dia/semana/mês)
    Filtros opcionais: data inicial, data final, vendedor
    """
    
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    # Query quotes
    query = select(Quote).filter(
        Quote.status.in_(["aprovado", "faturado"]),
        Quote.created_at >= start,
        Quote.created_at <= end
    )
    
    # Filter by salesperson if needed (via customer)
    if salesperson_id:
        query = query.join(Customer).filter(Customer.salesperson_id == salesperson_id)
    
    quotes = session.exec(query).all()
    
    # Agrupar por data (dia)
    sales_by_day = {}
    for quote in quotes:
        day_key = quote.created_at.date().isoformat()
        if day_key not in sales_by_day:
            sales_by_day[day_key] = {
                "date": day_key,
                "count": 0,
                "total": 0.0,
                "approved": 0,
                "invoiced": 0
            }
        sales_by_day[day_key]["count"] += 1
        sales_by_day[day_key]["total"] += float(quote.total or 0)
        if quote.status == "aprovado":
            sales_by_day[day_key]["approved"] += 1
        elif quote.status == "faturado":
            sales_by_day[day_key]["invoiced"] += 1
    
    return {
        "period": f"{start.date()} a {end.date()}",
        "total_sales": sum(s["total"] for s in sales_by_day.values()),
        "total_quotes": sum(s["count"] for s in sales_by_day.values()),
        "sales_by_day": dict(sorted(sales_by_day.items()))
    }


@router.get("/products-most-sold")
def get_products_most_sold(
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna os produtos mais vendidos (mais itens em quotes)
    Ordenado por quantidade
    """
    
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    # Buscar quotes no período
    quotes = session.exec(
        select(Quote).filter(
            Quote.created_at >= start,
            Quote.created_at <= end
        )
    ).all()
    
    # Processar items
    products_sold = {}
    for quote in quotes:
        items = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        
        for item in items:
            if item.get("type") == "product":
                product_name = item.get("name", "Desconhecido")
                quantity = float(item.get("quantity", 0))
                unit_price = float(item.get("unit_price", 0))
                
                if product_name not in products_sold:
                    products_sold[product_name] = {
                        "name": product_name,
                        "quantity": 0,
                        "revenue": 0.0,
                        "avg_price": 0.0
                    }
                
                products_sold[product_name]["quantity"] += quantity
                products_sold[product_name]["revenue"] += quantity * unit_price
    
    # Calcular preço médio
    for product in products_sold.values():
        if product["quantity"] > 0:
            product["avg_price"] = product["revenue"] / product["quantity"]
    
    # Ordenar por quantidade e pegar top N
    sorted_products = sorted(
        products_sold.values(),
        key=lambda x: x["quantity"],
        reverse=True
    )[:limit]
    
    return {
        "period": f"{start.date()} a {end.date()}",
        "total_products": len(products_sold),
        "products": sorted_products
    }


@router.get("/services-most-sold")
def get_services_most_sold(
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna os serviços mais vendidos (mais itens em quotes)
    Ordenado por quantidade
    """
    
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    # Buscar quotes no período
    quotes = session.exec(
        select(Quote).filter(
            Quote.created_at >= start,
            Quote.created_at <= end
        )
    ).all()
    
    # Processar items
    services_sold = {}
    for quote in quotes:
        items = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
        
        for item in items:
            if item.get("type") == "service":
                service_name = item.get("name", "Desconhecido")
                quantity = float(item.get("quantity", 0))
                unit_price = float(item.get("unit_price", 0))
                
                if service_name not in services_sold:
                    services_sold[service_name] = {
                        "name": service_name,
                        "quantity": 0,
                        "revenue": 0.0,
                        "avg_price": 0.0
                    }
                
                services_sold[service_name]["quantity"] += quantity
                services_sold[service_name]["revenue"] += quantity * unit_price
    
    # Calcular preço médio
    for service in services_sold.values():
        if service["quantity"] > 0:
            service["avg_price"] = service["revenue"] / service["quantity"]
    
    # Ordenar por quantidade e pegar top N
    sorted_services = sorted(
        services_sold.values(),
        key=lambda x: x["quantity"],
        reverse=True
    )[:limit]
    
    return {
        "period": f"{start.date()} a {end.date()}",
        "total_services": len(services_sold),
        "services": sorted_services
    }


@router.get("/top-customers")
def get_top_customers(
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna os principais clientes por valor total de pedidos
    """
    
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    # Query: Group by customer and sum totals
    customer_totals = {}
    
    quotes = session.exec(
        select(Quote).filter(
            Quote.created_at >= start,
            Quote.created_at <= end
        )
    ).all()
    
    for quote in quotes:
        if quote.customer_id not in customer_totals:
            customer = session.get(Customer, quote.customer_id)
            customer_totals[quote.customer_id] = {
                "customer_id": quote.customer_id,
                "customer_name": customer.name if customer else "Desconhecido",
                "total_spent": 0.0,
                "quote_count": 0,
                "avg_order_value": 0.0
            }
        
        customer_totals[quote.customer_id]["total_spent"] += float(quote.total or 0)
        customer_totals[quote.customer_id]["quote_count"] += 1
    
    # Calcular média
    for customer in customer_totals.values():
        if customer["quote_count"] > 0:
            customer["avg_order_value"] = customer["total_spent"] / customer["quote_count"]
    
    # Ordenar por total gasto
    sorted_customers = sorted(
        customer_totals.values(),
        key=lambda x: x["total_spent"],
        reverse=True
    )[:limit]
    
    return {
        "period": f"{start.date()} a {end.date()}",
        "total_customers": len(customer_totals),
        "customers": sorted_customers
    }


@router.get("/summary")
def get_reports_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Retorna resumo consolidado de todos os relatórios
    """
    
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    # Total de vendas
    total_sales = session.exec(
        select(func.sum(Quote.total)).filter(
            Quote.created_at >= start,
            Quote.created_at <= end,
            Quote.status.in_(["aprovado", "faturado"])
        )
    ).first() or 0.0
    
    # Total de orçamentos
    total_quotes = session.exec(
        select(func.count(Quote.id)).filter(
            Quote.created_at >= start,
            Quote.created_at <= end
        )
    ).first() or 0
    
    # Total de clientes que compraram
    total_customers = session.exec(
        select(func.count(func.distinct(Quote.customer_id))).filter(
            Quote.created_at >= start,
            Quote.created_at <= end
        )
    ).first() or 0
    
    # Ticket médio
    avg_ticket = float(total_sales) / total_quotes if total_quotes > 0 else 0.0
    
    return {
        "period": f"{start.date()} a {end.date()}",
        "total_sales": float(total_sales),
        "total_quotes": int(total_quotes),
        "total_customers": int(total_customers),
        "avg_ticket": avg_ticket,
        "quotes_approved": session.exec(
            select(func.count(Quote.id)).filter(
                Quote.status == "aprovado",
                Quote.created_at >= start,
                Quote.created_at <= end
            )
        ).first() or 0,
        "quotes_invoiced": session.exec(
            select(func.count(Quote.id)).filter(
                Quote.status == "faturado",
                Quote.created_at >= start,
                Quote.created_at <= end
            )
        ).first() or 0
    }
