"""
Gerador de PDF para Orçamentos
Cria PDFs profissionais usando ReportLab
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from decimal import Decimal
from typing import List, Dict, Any


def generate_quote_pdf(quote_data: Dict[str, Any]) -> bytes:
    """
    Gera um PDF de orçamento a partir dos dados da quote
    
    Args:
        quote_data: Dicionário contendo os dados do orçamento
        
    Returns:
        bytes: Conteúdo do PDF em bytes
    """
    
    # Criar buffer para o PDF
    buffer = BytesIO()
    
    # Criar documento
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
    )
    
    # Elementos do documento
    elements = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=4,
    )
    
    # ===== CABEÇALHO =====
    header_data = [
        [
            Paragraph('<b>ERP Agent MVP</b>', title_style),
            Paragraph(f'<b>Orçamento</b><br/>{quote_data.get("quote_number", "N/A")}', heading_style)
        ]
    ]
    
    header_table = Table(header_data, colWidths=[3.5*inch, 2.5*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 14),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== INFORMAÇÕES PRINCIPAIS =====
    info_data = [
        [
            f"<b>Data de Emissão:</b> {datetime.now().strftime('%d/%m/%Y')}",
            f"<b>Status:</b> {quote_data.get('status', 'N/A').upper()}"
        ],
        [
            f"<b>Válido até:</b> {quote_data.get('valid_until', 'N/A')}",
            f"<b>Data de Criação:</b> {quote_data.get('created_at', 'N/A')[:10]}"
        ]
    ]
    
    info_table = Table(info_data, colWidths=[3.25*inch, 3.25*inch])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== DADOS DO CLIENTE =====
    elements.append(Paragraph('<b>DADOS DO CLIENTE</b>', heading_style))
    
    customer = quote_data.get('customer', {})
    client_data = [
        [
            f"<b>Cliente:</b> {customer.get('name', 'N/A')}",
            f"<b>Documento:</b> {customer.get('document', 'N/A')}"
        ],
        [
            f"<b>Email:</b> {customer.get('email', 'N/A')}",
            f"<b>Telefone:</b> {customer.get('phone', 'N/A')}"
        ],
        [
            f"<b>Endereço:</b> {customer.get('address_line', '')} {customer.get('number', '')}, {customer.get('city', '')}, {customer.get('state', '')}",
            ""
        ]
    ]
    
    client_table = Table(client_data, colWidths=[3.25*inch, 3.25*inch])
    client_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(client_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== ITENS DO ORÇAMENTO =====
    elements.append(Paragraph('<b>ITENS DO ORÇAMENTO</b>', heading_style))
    
    items = quote_data.get('items', [])
    
    # Cabeçalho da tabela de itens
    items_data = [
        ['Descrição', 'Quantidade', 'Valor Unit.', 'Total']
    ]
    
    # Adicionar itens
    total_items = Decimal(0)
    for item in items:
        description = item.get('description', 'N/A')
        quantity = Decimal(str(item.get('quantity', 0)))
        unit_price = Decimal(str(item.get('unit_price', 0)))
        item_total = quantity * unit_price
        total_items += item_total
        
        items_data.append([
            description,
            f"{quantity:.2f}",
            f"R$ {unit_price:,.2f}",
            f"R$ {item_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[2.5*inch, 1.2*inch, 1.3*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        # Cabeçalho
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        
        # Corpo
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ===== RESUMO FINANCEIRO =====
    summary_data = [
        ['Subtotal', f"R$ {quote_data.get('subtotal', 0):,.2f}"],
        ['Desconto', f"R$ {quote_data.get('discount', 0):,.2f}"],
        ['Desconto %', f"{quote_data.get('discount_percent', 0):.2f}%"],
        ['<b>TOTAL</b>', f"<b>R$ {quote_data.get('total', 0):,.2f}</b>"],
    ]
    
    summary_table = Table(summary_data, colWidths=[5.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -2), 10),
        ('FONTSIZE', (0, -1), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#dbeafe')),
        ('BACKGROUND', (0, 0), (-1, -2), colors.HexColor('#f8f9fa')),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # ===== INFORMAÇÕES ADICIONAIS =====
    if quote_data.get('payment_terms') or quote_data.get('delivery_terms') or quote_data.get('notes'):
        elements.append(Paragraph('<b>INFORMAÇÕES ADICIONAIS</b>', heading_style))
        
        additional_data = []
        
        if quote_data.get('payment_terms'):
            additional_data.append([
                '<b>Condições de Pagamento:</b>',
                quote_data.get('payment_terms', '')
            ])
        
        if quote_data.get('delivery_terms'):
            additional_data.append([
                '<b>Termos de Entrega:</b>',
                quote_data.get('delivery_terms', '')
            ])
        
        if quote_data.get('notes'):
            additional_data.append([
                '<b>Observações:</b>',
                quote_data.get('notes', '')
            ])
        
        if additional_data:
            additional_table = Table(additional_data, colWidths=[1.5*inch, 5.0*inch])
            additional_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ]))
            
            elements.append(additional_table)
            elements.append(Spacer(1, 0.3*inch))
    
    # ===== RODAPÉ =====
    footer_text = f"Documento gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')} | ERP Agent MVP"
    elements.append(Paragraph(f'<i style="font-size: 8px">{footer_text}</i>', normal_style))
    
    # Gerar PDF
    doc.build(elements)
    
    # Retornar conteúdo do PDF
    buffer.seek(0)
    return buffer.getvalue()
