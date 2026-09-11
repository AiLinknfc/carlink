from __future__ import annotations

import os

import httpx

# Migrado de SMTP directo (Hostinger) a la API HTTP de Resend el 2026-09-10.
# Causa: Railway nunca logra completar el handshake TCP con
# smtp.hostinger.com en ningún puerto (465/587/25), con o sin IPv4 forzado —
# siempre termina en timeout, nunca en un error de autenticación. Verificado
# desde ambos lados: soporte de Hostinger confirmó que el buzón no está
# bloqueado y que MX/SPF/DKIM/DMARC de carlink.com.co están bien; Railway no
# bloquea salida general (un socket a google.com:443 conecta sin problema).
# Conclusión: algún firewall de red intermedio (probablemente del lado
# Hostinger, contra rangos de IP de proveedores cloud/hosting) descarta el
# tráfico SMTP antes de que llegue a la capa de aplicación — invisible para
# el soporte de buzón de cualquiera de los dos lados. Resend manda por HTTPS
# (puerto 443), el mismo protocolo que ya sabíamos que funciona sin
# problema desde este contenedor. Ver docs/PENDIENTES.md para el detalle
# completo de la investigación (incluye que la afirmación previa de "email
# verificado en producción, 2026-08-12" era falsa — nunca había funcionado).
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_API_URL = "https://api.resend.com/emails"
FROM_EMAIL = os.getenv("FROM_EMAIL", "CarLink <noreply@carlink.com>")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

_HTTP_TIMEOUT = 15  # segundos


def _send_email(to_email: str, subject: str, html: str, *, log_label: str) -> bool:
    """Único punto de envío real — las funciones de abajo solo arman
    subject/html y delegan acá. Antes cada una repetía su propio bloque
    smtplib con try/except; con una llamada HTTP no hace falta repetirlo."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY not configured — skipping {log_label}")
        return False
    if not to_email:
        return False

    try:
        response = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": FROM_EMAIL, "to": [to_email], "subject": subject, "html": html},
            timeout=_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        print(f"[email] Sent {log_label} to {to_email}")
        return True
    except httpx.HTTPStatusError as e:
        # raise_for_status() por sí solo solo deja el código de estado en el
        # log (ej. "403 Forbidden"), sin el cuerpo — y ahí es donde Resend
        # manda el motivo real del rechazo (dominio no verificado, key con
        # permisos restringidos, etc.). Verificado en incidente 2026-09-11:
        # un 403 sin cuerpo obligó a ir a adivinar entre dos causas posibles
        # en el dashboard de Resend en vez de leerlo directo del log.
        print(f"[email] Failed to send {log_label}: {e} — response body: {e.response.text}")
        return False
    except Exception as e:
        print(f"[email] Failed to send {log_label}: {e}")
        return False


def send_found_request_email(
    owner_email: str,
    owner_name: str,
    finder_name: str,
    finder_phone: str,
    message: str,
    vehicle_plate: str,
) -> bool:
    """Send email to vehicle owner when someone reports finding their key."""
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
    return _send_email(owner_email, subject, html, log_label="found-request email")


def send_guide_email(to_email: str, guide_url: str) -> bool:
    """Guía de Mantenimiento Preventivo gratis — disparado desde POST
    /waitlist cuando source='shop_guia_mantenimiento' y el contacto dejado
    tiene forma de correo (ver app/routers/waitlist.py). El PDF vive en R2
    (docs/CONTEXTO.md); acá se linkea, no se adjunta — un adjunto de ~1.4MB
    dispara más filtros de spam y algunos clientes de correo lo recortan."""
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
    return _send_email(to_email, subject, html, log_label="guide email")


def send_generic_email(to_email: str, subject: str, html_body: str) -> bool:
    """Envío genérico usado por el panel de negocio del taller (notificaciones
    a clientes: cita, vehículo listo, etc. — docs/PLAN_MIGRACION_TALLERPRO.md).
    Sin plantilla fija — el llamador arma su propio HTML."""
    return _send_email(to_email, subject, html_body, log_label="generic email")


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
    return _send_email(ADMIN_EMAIL, subject, html, log_label="job application email")


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
    return _send_email(customer_email, subject, html, log_label=f"order-received email ({reference})")


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
    return _send_email(customer_email, subject, html, log_label=f"order-confirmed email ({reference})")


def send_order_shipped_email(
    customer_email: str,
    customer_name: str,
    reference: str,
    plate_text: str,
    tracking_note: str = "",
) -> bool:
    """Al cliente, cuando el admin marca la orden como enviada desde 'Mis
    pedidos' (PATCH /shop/orders/{reference}/fulfillment)."""
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
    return _send_email(customer_email, subject, html, log_label=f"order-shipped email ({reference})")


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
    return _send_email(ADMIN_EMAIL, subject, html, log_label=f"order admin-notification email ({reference})")
