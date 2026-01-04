"""
Rotas HTTP de Serviços
Finas e limpas - toda lógica delegada para ServiceService
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlmodel import Session
from typing import Optional, List

from database import get_session
from models import Service
from dependencies import get_current_user
from schemas import ServiceCreate, ServiceRead, ServiceUpdate
from services.service_service import ServiceService

router = APIRouter(prefix="/services", tags=["services"])


@router.post("/", response_model=ServiceRead)
def create_service(
    service_input: ServiceCreate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Cria um novo serviço usando ServiceService.
    """
    service_data = service_input.dict()
    new_service = ServiceService.create_service(
        session=session,
        service_data=service_data,
        current_user=current_user
    )
    return new_service


@router.get("/")
def list_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Lista serviços com filtros opcionais de status e categoria.
    Retorna paginação com total.
    """
    services = ServiceService.get_services_for_user(
        session=session,
        user=current_user,
        skip=skip,
        limit=limit,
        status_filter=status,
        category_filter=category
    )
    
    # Contar total (sem limite)
    all_services = ServiceService.get_services_for_user(
        session=session,
        user=current_user,
        status_filter=status,
        category_filter=category
    )
    
    # Serializar serviços manualmente
    items_list = []
    for s in services:
        items_list.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "category": s.category,
            "status": s.status,
            "price_base": s.price_base,
            "price_hourly": s.price_hourly,
            "duration_type": s.duration_type,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        })
    
    return {
        "items": items_list,
        "total": len(all_services),
        "skip": skip,
        "limit": limit
    }


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(
    service_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Busca um serviço específico por ID.
    """
    service = ServiceService.get_service_by_id(
        session=session,
        service_id=service_id,
        user=current_user
    )
    
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    return service


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    service_input: ServiceUpdate,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza um serviço existente.
    """
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Filtrar apenas campos preenchidos
    service_data = service_input.dict(exclude_unset=True)
    
    updated_service = ServiceService.update_service(
        session=session,
        service=service,
        service_data=service_data,
        current_user=current_user
    )
    
    return updated_service


@router.patch("/{service_id}/status", response_model=ServiceRead)
def update_service_status(
    service_id: int,
    status: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Atualiza apenas o status do serviço (operação leve).
    Status válidos: ativo, inativo, pendente, descontinuado
    """
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    updated_service = ServiceService.update_service_status(
        session=session,
        service=service,
        new_status=status,
        current_user=current_user
    )
    
    return updated_service


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user)
):
    """
    Faz soft delete (marca como inativo) de um serviço.
    """
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    ServiceService.soft_delete_service(
        session=session,
        service=service,
        current_user=current_user
    )
    
    return {"detail": "Serviço deletado com sucesso (marcado como inativo)"}
