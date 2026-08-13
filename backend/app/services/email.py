from __future__ import annotations

import os
import socket
import smtplib
from contextlib import contextmanager
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "CarLink <noreply@carlink.com>")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


_SMTP_TIMEOUT = 15  # segundos — sin esto, un Hostinger lento/caído puede colgar
# la conexión indefinidamente (smtplib no tiene timeout por defecto).


@contextmanager
def _force_ipv4():
    """Fuerza resolución DNS a solo-IPv4 mientras dura la conexión SMTP.

    Visto en producción (Railway, 2026-08-13): smtp.hostinger.com resuelve a
    IPv6 *y* IPv4, y getaddrinfo() devuelve la IPv6 primero. El contenedor
    de Railway no tiene salida IPv6, así que ese intento falla con [Errno
    101] Network is unreachable. socket.create_connection() sí reintenta con
    la siguiente dirección (la IPv4) — pero si por lo que sea ese segundo
    intento también falla, Python reporta el error del *primer* intento
    (la IPv6), no el real. Forzar IPv4 acá elimina la ambigüedad y el salto
    en falso a IPv6 en un solo paso. Alcance mínimo: solo se activa durante
    la conexión (smtplib.SMTP/SMTP_SSL __init__), se restaura enseguida."""
    original = socket.getaddrinfo

    def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
        return original(host, port, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = _ipv4_only
    try:
        yield
    finally:
        socket.getaddrinfo = original


def _smtp_client() -> smtplib.SMTP:
    """Conexión SMTP lista para usar con `with`. El puerto 465 (Hostinger) es
    SSL directo desde el saludo inicial — STARTTLS ahí falla porque STARTTLS
    negocia el cifrado DESPUÉS de conectar en texto plano, y un server que
    espera SSL directo corta la conexión antes de llegar a esa negociación.
    Cualquier otro puerto (587 típico) sigue usando STARTTLS como antes."""
    with _force_ipv4():
        if SMTP_PORT == 465:
            return smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=_SMTP_TIMEOUT)
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=_SMTP_TIMEOUT)
        server.starttls()
        return server


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
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, owner_email, msg.as_string())
        print(f"[email] Sent found-request email to {owner_email}")
        return True
    except Exception as e:
        print(f"[email] Failed to send: {e}")
        return False


def send_guide_email(to_email: str, guide_url: str) -> bool:
    """Guía de Mantenimiento Preventivo gratis — disparado desde POST
    /waitlist cuando source='shop_guia_mantenimiento' y el contacto dejado
    tiene forma de correo (ver app/routers/waitlist.py). El PDF vive en R2
    (docs/CONTEXTO.md); acá se linkea, no se adjunta — un adjunto de ~1.4MB
    dispara más filtros de spam y algunos clientes de correo lo recortan."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping guide email")
        return False

    subject = "CarLink — Tu Guía de Mantenimiento Preventivo"
    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">Acá está tu guía</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 20px;">
          Mantenimiento preventivo, historial documentado y normativa vehicular en Colombia —
          todo en un PDF corto para tener a mano.
        </p>
        <div style="text-align: center;">
          <a href="{guide_url}" style="display: inline-block; background: #F5C518; color: #111; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 26px; border-radius: 10px;">
            Descargar la guía (PDF)
          </a>
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        ¿Preguntas? Responde a este correo o escríbenos por WhatsApp.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"[email] Sent guide email to {to_email}")
        return True
    except Exception as e:
        print(f"[email] Failed to send guide email: {e}")
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
        with _smtp_client() as server:
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
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, ADMIN_EMAIL, msg.as_string())
        print(f"[email] Sent job application email to {ADMIN_EMAIL}")
        return True
    except Exception as e:
        print(f"[email] Failed to send job application email: {e}")
        return False


# ── Checkout del llavero NFC (app/routers/shop_orders.py) ──
# Toman argumentos primitivos, no el modelo ShopOrder, para no acoplar este
# módulo a app/models — mismo criterio que el resto de este archivo.

def _format_cop(amount_in_cents: int) -> str:
    return "$" + f"{amount_in_cents / 100:,.0f}".replace(",", ".")


def _stage_line(active_step: int) -> str:
    """1 = pagado, 2 = enviado, 3 = entregado. Texto plano con color en vez
    de flexbox, para que se vea bien en cualquier cliente de correo."""
    steps = ["Pagado", "Enviado", "Entregado"]
    parts = []
    for i, label in enumerate(steps, start=1):
        if i <= active_step:
            parts.append(f'<span style="color:#F5C518;font-weight:700;">{label} &#10003;</span>')
        else:
            parts.append(f'<span style="color:#999;">{label}</span>')
    return " &nbsp;&rarr;&nbsp; ".join(parts)


def send_order_received_email(
    customer_email: str,
    customer_name: str,
    reference: str,
    plate_text: str,
    quantity: int,
    amount_in_cents: int,
    currency: str = "COP",
) -> bool:
    """Solo para pedidos contraentrega (payment_method='cod'), apenas se crea
    la orden (antes de pagar) — es la única señal automática que recibe el
    cliente hasta que un admin la marque pagada (POST
    /shop/orders/{reference}/mark-paid, ver app/routers/shop_orders.py). Los
    pedidos Wompi no la reciben: ya les llega send_order_confirmed_email
    apenas se aprueba el pago, que alcanza como confirmación."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping order-received email")
        return False

    subject = "CarLink — Recibimos tu pedido, coordinamos el pago por WhatsApp"
    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">¡Gracias, {customer_name}!</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
          Registramos tu pedido contraentrega. Nuestro equipo te escribe por WhatsApp para
          coordinar el pago al recibir el llavero — si ya nos escribiste, te contactamos en breve.
        </p>
        <div style="text-align: center; margin-bottom: 16px;">{_stage_line(0)}</div>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; font-size: 14px; color: #333; line-height: 1.8;">
          <strong>Pedido:</strong> {reference}<br>
          <strong>Placa:</strong> {plate_text}<br>
          <strong>Cantidad:</strong> {quantity}<br>
          <strong>Total (contraentrega):</strong> {_format_cop(amount_in_cents)} {currency}
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        Te confirmamos por acá apenas quede pagado y en preparación.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = customer_email
    msg.attach(MIMEText(html, "html"))

    try:
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, customer_email, msg.as_string())
        print(f"[email] Sent order-received email to {customer_email} ({reference})")
        return True
    except Exception as e:
        print(f"[email] Failed to send order-received email: {e}")
        return False


def send_order_confirmed_email(
    customer_email: str,
    customer_name: str,
    reference: str,
    plate_text: str,
    quantity: int,
    amount_in_cents: int,
    currency: str = "COP",
) -> bool:
    """Al cliente, apenas Wompi confirma el pago (transición a 'approved') —
    ver app/routers/shop_orders.py."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping order-confirmed email")
        return False

    subject = "CarLink — Pago confirmado, tu llavero NFC va en camino"
    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">¡Gracias, {customer_name}!</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
          Tu pago quedó confirmado y ya estamos preparando tu llavero NFC.
        </p>
        <div style="text-align: center; margin-bottom: 16px;">{_stage_line(1)}</div>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; font-size: 14px; color: #333; line-height: 1.8;">
          <strong>Pedido:</strong> {reference}<br>
          <strong>Placa:</strong> {plate_text}<br>
          <strong>Cantidad:</strong> {quantity}<br>
          <strong>Total:</strong> {_format_cop(amount_in_cents)} {currency}<br>
          <strong>Entrega estimada:</strong> 5 días hábiles
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        Te avisamos por acá apenas salga hacia tu dirección.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = customer_email
    msg.attach(MIMEText(html, "html"))

    try:
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, customer_email, msg.as_string())
        print(f"[email] Sent order-confirmed email to {customer_email} ({reference})")
        return True
    except Exception as e:
        print(f"[email] Failed to send order-confirmed email: {e}")
        return False


def send_order_shipped_email(
    customer_email: str,
    customer_name: str,
    reference: str,
    plate_text: str,
    tracking_note: str = "",
) -> bool:
    """Al cliente, cuando el admin marca la orden como enviada desde 'Mis
    pedidos' (PATCH /shop/orders/{reference}/fulfillment)."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping order-shipped email")
        return False

    subject = "CarLink — Tu llavero NFC ya salió"
    tracking_line = f'<div style="margin-top:12px;"><strong>Seguimiento:</strong> {tracking_note}</div>' if tracking_note else ""
    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">¡{customer_name}, tu llavero va en camino!</h2>
        <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
          Acabamos de despachar el pedido <strong>{reference}</strong> (placa {plate_text}).
        </p>
        <div style="text-align: center; margin-bottom: 16px;">{_stage_line(2)}</div>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; font-size: 14px; color: #333;">
          Debería llegar en los próximos días.{tracking_line}
        </div>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = customer_email
    msg.attach(MIMEText(html, "html"))

    try:
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, customer_email, msg.as_string())
        print(f"[email] Sent order-shipped email to {customer_email} ({reference})")
        return True
    except Exception as e:
        print(f"[email] Failed to send order-shipped email: {e}")
        return False


def send_order_admin_notification_email(
    reference: str,
    plate_text: str,
    quantity: int,
    amount_in_cents: int,
    currency: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    shipping_address: str,
    shipping_city: str,
) -> bool:
    """Al admin (ADMIN_EMAIL), apenas Wompi confirma un pago — todo lo que
    hace falta para preparar y despachar el llavero."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping order admin-notification email")
        return False
    if not ADMIN_EMAIL:
        print("[email] ADMIN_EMAIL not configured — skipping order admin-notification email")
        return False

    subject = f"CarLink — Nuevo pedido pagado: {reference}"
    html = f"""
    <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Anton', sans-serif; font-size: 24px; color: #111;">Car<span style="color: #F5C518;">Link</span></span>
      </div>
      <div style="background: #f9f9f9; border-radius: 16px; padding: 24px; border: 1px solid #eee;">
        <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">Pedido pagado — hay que despachar</h2>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; font-size: 14px; color: #333; line-height: 1.8;">
          <strong>Pedido:</strong> {reference}<br>
          <strong>Placa:</strong> {plate_text} &times;{quantity}<br>
          <strong>Total:</strong> {_format_cop(amount_in_cents)} {currency}
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #eee; margin-top: 12px; font-size: 14px; color: #333; line-height: 1.8;">
          <strong>Cliente:</strong> {customer_name}<br>
          <strong>Contacto:</strong> {customer_phone} · {customer_email}<br>
          <strong>Enviar a:</strong> {shipping_address}, {shipping_city}
        </div>
      </div>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        Marca el pedido como enviado desde "Mis pedidos" cuando lo despaches — eso le avisa al cliente.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = ADMIN_EMAIL
    msg.attach(MIMEText(html, "html"))

    try:
        with _smtp_client() as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, ADMIN_EMAIL, msg.as_string())
        print(f"[email] Sent order admin-notification email to {ADMIN_EMAIL} ({reference})")
        return True
    except Exception as e:
        print(f"[email] Failed to send order admin-notification email: {e}")
        return False
