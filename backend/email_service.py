"""
Email service for sending notifications via SMTP.
Supports HTML and plain text emails with customer and internal notifications.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from os import getenv

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_HOST = getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(getenv("SMTP_PORT", "587"))
SMTP_USER = getenv("SMTP_USER", "")
SMTP_PASSWORD = getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = getenv("SMTP_FROM_EMAIL", "noreply@erpsystem.com.br")
SMTP_FROM_NAME = getenv("SMTP_FROM_NAME", "ERP System")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    plain_text: str = None,
    cc_emails: list = None,
) -> bool:
    """
    Send email via SMTP server.
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        html_content: HTML content of email
        plain_text: Plain text fallback (optional)
        cc_emails: List of CC email addresses (optional)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # If SMTP credentials not configured, log and return gracefully
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.warning(
                f"Email credentials not configured. "
                f"Would send to {to_email} with subject: {subject}"
            )
            return False

        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        if cc_emails:
            msg["Cc"] = ", ".join(cc_emails)

        # Attach plain text version
        if plain_text:
            part1 = MIMEText(plain_text, "plain")
            msg.attach(part1)

        # Attach HTML version (preferred)
        part2 = MIMEText(html_content, "html")
        msg.attach(part2)

        # Send via SMTP
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()  # Enable TLS encryption
            server.login(SMTP_USER, SMTP_PASSWORD)

            recipients = [to_email]
            if cc_emails:
                recipients.extend(cc_emails)

            server.sendmail(SMTP_FROM_EMAIL, recipients, msg.as_string())

        logger.info(f"Email sent successfully to {to_email} - Subject: {subject}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD.")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error occurred: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        return False


def send_quote_status_notification(
    customer_email: str,
    customer_name: str,
    quote_number: str,
    new_status: str,
    previous_status: str = None,
    internal_emails: list = None,
) -> bool:
    """
    Send quote status change notification to customer and internal team.
    
    Args:
        customer_email: Customer email address
        customer_name: Customer full name
        quote_number: Quote identifier (e.g., ORC-2026-0001)
        new_status: New status (rascunho, enviado, aprovado, faturado)
        previous_status: Previous status (optional)
        internal_emails: List of internal team emails to CC (optional)
    
    Returns:
        bool: True if sent successfully
    """
    # Status translations and colors
    status_translations = {
        "rascunho": "Draft",
        "enviado": "Sent",
        "aprovado": "Approved",
        "faturado": "Invoiced",
    }
    
    status_colors = {
        "rascunho": "#94a3b8",
        "enviado": "#f97316",
        "aprovado": "#eab308",
        "faturado": "#22c55e",
    }
    
    status_pt = status_translations.get(new_status, new_status)
    status_color = status_colors.get(new_status, "#000000")

    # Build HTML content
    html_content = f"""
    <html>
      <head>
        <style>
          body {{ font-family: Arial, sans-serif; color: #333; }}
          .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
          .header {{ background-color: #1e40af; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
          .header h1 {{ margin: 0; font-size: 24px; }}
          .content {{ background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
          .status-badge {{ 
              display: inline-block; 
              background-color: {status_color}; 
              color: white; 
              padding: 8px 16px; 
              border-radius: 4px; 
              font-weight: bold;
              margin: 10px 0;
          }}
          .detail {{ margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid #1e40af; }}
          .detail-label {{ font-weight: bold; color: #1e40af; }}
          .footer {{ font-size: 12px; color: #666; text-align: center; margin-top: 20px; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Quote Status Updated</h1>
            <p>Your quote has been updated in our system</p>
          </div>
          
          <div class="content">
            <p>Hi <strong>{customer_name}</strong>,</p>
            
            <p>The status of your quote <strong>{quote_number}</strong> has been updated.</p>
            
            <div class="status-badge">{status_pt}</div>
            
            <div class="detail">
              <div class="detail-label">Quote Number:</div>
              <div>{quote_number}</div>
            </div>
            
            <div class="detail">
              <div class="detail-label">New Status:</div>
              <div>{status_pt}</div>
            </div>
            
            {f'<div class="detail"><div class="detail-label">Previous Status:</div><div>{status_translations.get(previous_status, previous_status)}</div></div>' if previous_status else ''}
            
            <div class="detail">
              <div class="detail-label">Updated At:</div>
              <div>{datetime.now().strftime("%d/%m/%Y %H:%M:%S")}</div>
            </div>
            
            <p style="margin-top: 20px; color: #666;">
              If you have any questions or need further assistance, please contact our sales team.
            </p>
          </div>
          
          <div class="footer">
            <p>© 2026 ERP System. All rights reserved.<br>
            This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
    """

    # Plain text version
    plain_text = f"""
    Quote Status Update
    
    Hi {customer_name},
    
    The status of your quote {quote_number} has been updated to: {status_pt}
    
    Updated at: {datetime.now().strftime("%d/%m/%Y %H:%M:%S")}
    
    If you have any questions, please contact our sales team.
    
    ---
    © 2026 ERP System
    """

    return send_email(
        to_email=customer_email,
        subject=f"Quote {quote_number} - Status: {status_pt}",
        html_content=html_content,
        plain_text=plain_text,
        cc_emails=internal_emails,
    )


def send_quote_approval_reminder(
    customer_email: str,
    customer_name: str,
    quote_number: str,
    days_pending: int = 0,
) -> bool:
    """
    Send reminder email to customer about pending quote approval.
    
    Args:
        customer_email: Customer email address
        customer_name: Customer full name
        quote_number: Quote identifier
        days_pending: Number of days the quote has been pending (optional)
    
    Returns:
        bool: True if sent successfully
    """
    html_content = f"""
    <html>
      <head>
        <style>
          body {{ font-family: Arial, sans-serif; color: #333; }}
          .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
          .header {{ background-color: #1e40af; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }}
          .header h1 {{ margin: 0; font-size: 24px; }}
          .alert {{ background-color: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 5px; margin: 20px 0; }}
          .footer {{ font-size: 12px; color: #666; text-align: center; margin-top: 20px; }}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Quote Approval Reminder</h1>
          </div>
          
          <div class="alert">
            <p><strong>We're waiting for your approval!</strong></p>
            <p>Your quote <strong>{quote_number}</strong> has been pending for {days_pending} days.</p>
            <p>Please review and approve at your earliest convenience so we can proceed.</p>
          </div>
          
          <p>If you have any questions about this quote, please reach out to our sales team immediately.</p>
          
          <div class="footer">
            <p>© 2026 ERP System</p>
          </div>
        </div>
      </body>
    </html>
    """

    return send_email(
        to_email=customer_email,
        subject=f"Reminder: Quote {quote_number} Awaiting Approval",
        html_content=html_content,
    )
