"""Qué puede hacer cada tipo de negocio en el panel (docs/PLAN_ALIADOS_NEGOCIO.md, secciones 3 y 10: matriz v2).

La fuente de verdad es el backend: el menú del panel se dibuja con la lista que devuelve GET /workshops/me, y los
routers del panel (`workshop_gate`) rechazan lo que el tipo no incluye aunque alguien llame la API a mano."""
from __future__ import annotations

# Lo que tienen todos los tipos de negocio.
_BASE = {"perfil", "notificaciones", "documentos", "resenas", "alianza"}

KIND_CAPABILITIES: dict[str, frozenset[str]] = {
    # Taller: el panel completo.
    "taller": frozenset(_BASE | {
        "clientes", "ordenes", "mecanicos", "catalogo", "inventario", "citas", "diagnostico_ia", "rentabilidad",
    }),
    # CDA: sin órdenes de trabajo (objeto exclusivo por normativa, a confirmar con abogado). El registro de revisiones
    # RTM y el aviso de vencimientos llegan en la Fase 3.
    "cda": frozenset(_BASE | {"clientes", "citas", "revisiones"}),
    # Concesionario y compraventa: clientes e historial; la ficha de vehículos en venta llega en la Fase 3.
    "concesionario": frozenset(_BASE | {"clientes", "vehiculos_venta", "consignacion"}),
    "compraventa": frozenset(_BASE | {"clientes", "vehiculos_venta"}),
    # Proveedor de repuestos: su inventario, sin clientes ni órdenes.
    "repuestos": frozenset(_BASE | {"inventario"}),
}

DEFAULT_KIND = "taller"


def capabilities_for(kind: str | None) -> frozenset[str]:
    """Capacidades del tipo. Un tipo desconocido recibe solo lo básico (nunca el panel completo por descuido)."""
    return KIND_CAPABILITIES.get(kind or DEFAULT_KIND, frozenset(_BASE))
