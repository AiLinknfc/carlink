-- Paso 3 de docs/PLAN_FACTURACION_AUTOMATICA.md: cuando un taller entrega y
-- cobra una orden de un vehículo vinculado a una cuenta CarLink real, se
-- crea sola una `Part` (repuesto reemplazado) y un `maintenance_records`
-- (ya tenía workshop_id, ver 001). Estas columnas marcan la procedencia
-- (para que el cliente no pueda editarlo) y dan idempotencia (no duplicar
-- si la orden se re-guarda).

alter table parts
  add column if not exists workshop_id uuid references workshops(id) on delete set null,
  add column if not exists source_work_order_id uuid references work_orders(id) on delete set null;

alter table maintenance_records
  add column if not exists source_work_order_id uuid references work_orders(id) on delete set null;

create index if not exists idx_parts_source_work_order on parts(source_work_order_id);
create index if not exists idx_maintenance_records_source_work_order on maintenance_records(source_work_order_id);
