from __future__ import annotations

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "CarLink <noreply@carlink.com>")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def send_found_request_email(
    owner_email: str,
    owner_name: str,
    finder_name: str,
    finder_phone: str,
    message: str,
    vehicle_plate: str,
) -> bool:
    """Send email to vehicle owner when someone reports finding their key."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping email send")
        return False

    subject = f"CarLink — Alguien encontró el llavero de tu {vehicle_plate}"

    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">Alguien encontró tu llavero</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
          <strong>{finder_name}</strong> encontró el llavero de tu vehículo <strong>{vehicle_plate}</strong>.
        </p>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Mensaje</div>
          <div style="font-size: 14px; color: #333; line-height: 1.5;">{message}</div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee;">
          <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Teléfono de contacto</div>
          <div style="font-size: 16px; color: #F5C518; font-weight: 700;">{finder_phone}</div>
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        Abre CarLink para ver esta notificación y contactar a {finder_name}.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = owner_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, owner_email, msg.as_string())
        print(f"[email] Sent found-request email to {owner_email}")
        return True
    except Exception as e:
        print(f"[email] Failed to send: {e}")
        return False


def send_generic_email(to_email: str, subject: str, html_body: str) -> bool:
    """Envío genérico usado por el panel de negocio del taller (notificaciones
    a clientes: cita, vehículo listo, etc. — docs/PLAN_MIGRACION_TALLERPRO.md).
    Mismo patrón SMTP que el resto de este módulo, sin plantilla fija."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping email send")
        return False
    if not to_email:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[email] Sent generic email to {to_email}")
        return True
    except Exception as e:
        print(f"[email] Failed to send generic email: {e}")
        return False


def send_job_application_email(
    applicant_name: str,
    applicant_email: str,
    applicant_phone: str,
    area: str,
    offer_title: str | None = None,
    message: str | None = None,
    cv_url: str | None = None,
) -> bool:
    """Send email to admin when someone submits a job application."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping job application email")
        return False
    if not ADMIN_EMAIL:
        print("[email] ADMIN_EMAIL not configured — skipping job application email")
        return False

    subject = f"CarLink — Nueva postulación: {applicant_name} ({area})"
    offer_line = f"<br><strong>Oferta:</strong> {offer_title}" if offer_title else ""
    message_line = f"<br><br><strong>Mensaje:</strong><br>{message}" if message else ""
    cv_line = f"<br><br><a href='{cv_url}' style='color:#F5C518;font-weight:700;'>Ver hoja de vida</a>" if cv_url else ""

    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">Nueva postulación recibida</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
          <strong>{applicant_name}</strong> se postuló para un puesto en el equipo CarLink.
        </p>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; margin-bottom: 12px;">
          <div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Datos del candidato</div>
          <div style="font-size: 14px; color: #333; line-height: 1.8;">
            <strong>Nombre:</strong> {applicant_name}<br>
            <strong>Email:</strong> {applicant_email}<br>
            <strong>WhatsApp:</strong> {applicant_phone}<br>
            <strong>Área:</strong> {area}
            {offer_line}
            {message_line}
            {cv_line}
          </div>
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        Revisa las postulaciones en el panel de administración de CarLink.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = ADMIN_EMAIL
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, ADMIN_EMAIL, msg.as_string())
        print(f"[email] Sent job application email to {ADMIN_EMAIL}")
        return True
    except Exception as e:
        print(f"[email] Failed to send job application email: {e}")
        return False
