-- Datos de la tarjeta de propiedad (licencia de transito) de cada vehiculo (2026-10-05).
-- JSONB con: license_number, owner_document, vin, engine_number, chassis_number, cilindraje,
-- service, capacity, doors, registration_date. Los demas campos de la tarjeta ya tienen columna
-- propia (plate, city, brand, model, year, color, body_type, fuel_type, owner_name).
-- Todos son obligatorios para enviar a revision (backend/app/services/vehicle_card.py); se pueden
-- guardar de forma parcial mientras tanto. Aditiva: columna con default '{}'.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS card_data JSONB NOT NULL DEFAULT '{}'::jsonb;
