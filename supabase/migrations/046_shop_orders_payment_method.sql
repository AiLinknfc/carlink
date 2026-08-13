-- Distingue cómo se paga cada pedido del llavero NFC — hasta ahora create_shop_order
-- no lo registraba, así que no había forma de saber (ni de operar sobre) un pedido
-- contraentrega distinto de uno pagado con Wompi. Sin esto, un pedido contraentrega
-- quedaba en 'pending' para siempre: no hay ninguna otra ruta que lo mueva a
-- 'approved' salvo la confirmación real de Wompi. Ver docs/PENDIENTES.md.
--
-- Default 'wompi' para que los pedidos ya existentes (todos pagados por pasarela
-- hasta ahora) queden clasificados correctamente sin tocarlos a mano.

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'wompi';

COMMENT ON COLUMN shop_orders.payment_method IS 'wompi (pasarela real, se aprueba sola vía webhook/confirm) | cod (contraentrega, requiere que un admin lo marque pagado a mano — POST /shop/orders/{reference}/mark-paid).';
