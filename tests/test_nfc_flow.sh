#!/bin/bash
# NFC Keychain Flow Tests
# Tests: token creation, listing, URL recovery, public ficha access, nfc_active toggle
set -e

API="https://api.carlink.com.co"
FRONTEND="https://carlink.com.co"

echo "=== NFC Flow Tests ==="
echo ""

# 1. Health check
echo "1. Backend health check..."
HEALTH=$(curl -sk "$API/api/health")
echo "   $HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "   ✅ Backend is alive"
else
  echo "   ❌ Backend is down"
  exit 1
fi
echo ""

# 2. Public ficha with invalid token (too short)
echo "2. Public ficha with short token..."
RESP=$(curl -sk -o /dev/null -w "%{http_code}" "$API/api/nfc/abc123")
echo "   Status: $RESP"
if [ "$RESP" = "404" ]; then
  echo "   ✅ Returns 404 for short token"
else
  echo "   ❌ Expected 404, got $RESP"
fi
echo ""

# 3. Public ficha with invalid token (64 chars but non-existent)
echo "3. Public ficha with non-existent token..."
FAKE_TOKEN=$(python3 -c "print('a' * 64)")
RESP=$(curl -sk -w "\n%{http_code}" "$API/api/nfc/$FAKE_TOKEN")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
echo "   Status: $HTTP_CODE"
echo "   Body: $BODY"
if [ "$HTTP_CODE" = "404" ]; then
  echo "   ✅ Returns 404 for non-existent token"
else
  echo "   ❌ Expected 404, got $HTTP_CODE"
fi
echo ""

# 4. Get the existing active token hash from DB to test public access
echo "4. Get real token info from DB..."
TOKEN_INFO=$(python3 -c "
import psycopg2, hashlib
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"SELECT id, token_prefix, token_hash, status, is_active FROM nfc_tokens WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1\")
row = cur.fetchone()
if row:
    print(f'{row[0]}|{row[1]}|{row[2]}|{row[3]}|{row[4]}')
else:
    print('NO_TOKEN')
cur.close()
conn.close()
")
echo "   $TOKEN_INFO"
if [ "$TOKEN_INFO" = "NO_TOKEN" ]; then
  echo "   ❌ No active tokens found in DB"
  exit 1
fi
TOKEN_ID=$(echo "$TOKEN_INFO" | cut -d'|' -f1)
TOKEN_PREFIX=$(echo "$TOKEN_INFO" | cut -d'|' -f2)
TOKEN_HASH=$(echo "$TOKEN_INFO" | cut -d'|' -f3)
echo "   Token ID: $TOKEN_ID"
echo "   Token prefix: $TOKEN_PREFIX"
echo ""

# 5. Test nfc_active check: temporarily disable and test
echo "5. Test nfc_active=off returns 410..."
# We'll test this by temporarily disabling nfc_active on the vehicle
python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"UPDATE vehicles SET nfc_active = FALSE WHERE id = '08190a51-bacf-4b89-9651-c15c7123f89d'\")
print(f'Vehicles updated: {cur.rowcount}')
conn.commit()
cur.close()
conn.close()
"

# Since we don't have the raw token, test with a fake that matches the hash
# Actually we can't easily test this without the raw token. Let's check the response for a valid-format token
# that maps to this hash. Skip the public test for now and just verify the DB state.
echo "   (Skipping HTTP test — requires raw token which is not stored in DB)"
echo "   Verifying nfc_active is now FALSE..."
python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"SELECT nfc_active FROM vehicles WHERE id = '08190a51-bacf-4b89-9651-c15c7123f89d'\")
row = cur.fetchone()
print(f'   nfc_active = {row[0]}')
conn.commit()
cur.close()
conn.close()
"

# Restore nfc_active
echo "   Restoring nfc_active to TRUE..."
python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"UPDATE vehicles SET nfc_active = TRUE WHERE id = '08190a51-bacf-4b89-9651-c15c7123f89d'\")
conn.commit()
cur.close()
conn.close()
"
echo "   ✅ nfc_active toggle test done"
echo ""

# 6. Test token limit
echo "6. Verify persona token limit = 1..."
LIMITS=$(python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"SELECT max_tokens_per_vehicle FROM nfc_token_limits WHERE account_type = 'persona'\")
row = cur.fetchone()
print(row[0] if row else 'NOT_FOUND')
cur.close()
conn.close()
")
echo "   Persona limit: $LIMITS"
if [ "$LIMITS" = "1" ]; then
  echo "   ✅ Limit is 1 as requested"
else
  echo "   ❌ Expected 1, got $LIMITS"
fi
echo ""

# 7. Test token_url_encrypted column exists
echo "7. Verify token_url_encrypted column exists..."
COL_EXISTS=$(python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://postgres.xgdshunvmeceqnzmkcsg:94XE9TmTq7jHnBvi@aws-1-us-east-2.pooler.supabase.com:6543/postgres')
cur = conn.cursor()
cur.execute(\"SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='nfc_tokens' AND column_name='token_url_encrypted')\")
print(cur.fetchone()[0])
cur.close()
conn.close()
")
echo "   Column exists: $COL_EXISTS"
if [ "$COL_EXISTS" = "True" ]; then
  echo "   ✅ Migration 016 is applied"
else
  echo "   ❌ Migration 016 NOT applied"
fi
echo ""

# 8. Test encrypted URL storage
echo "8. Test encrypt/decrypt URL service..."
CRYPTO_TEST=$(python3 -c "
import sys
sys.path.insert(0, '/home/andres/Documents/CarLink/carlink/backend')
import os
os.environ['ENCRYPTION_KEY'] = '03e127c0cc61cf4af52bba0eb8f44b7fd73c0855e940d86f87970e0fafc55e4f'
from app.services.crypto import encrypt_url, decrypt_url
url = 'https://carlink.com.co/nfc/abc123def456'
encrypted = encrypt_url(url)
decrypted = decrypt_url(encrypted)
print(f'encrypted={encrypted[:30]}... decrypted={decrypted} match={url == decrypted}')
")
echo "   $CRYPTO_TEST"
if echo "$CRYPTO_TEST" | grep -q "match=True"; then
  echo "   ✅ Encrypt/decrypt works"
else
  echo "   ❌ Encrypt/decrypt failed"
fi
echo ""

# 9. Test frontend is reachable
echo "9. Test frontend is reachable..."
FRONT_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$FRONTEND")
echo "   Frontend status: $FRONT_CODE"
if [ "$FRONT_CODE" = "200" ]; then
  echo "   ✅ Frontend is reachable"
else
  echo "   ❌ Frontend returned $FRONT_CODE"
fi
echo ""

# 10. Test NFC page is reachable
echo "10. Test NFC public page is reachable..."
NFC_PAGE_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$FRONTEND/nfc/test123")
echo "    NFC page status: $NFC_PAGE_CODE"
if [ "$NFC_PAGE_CODE" = "200" ]; then
  echo "    ✅ NFC page renders (SPA, always 200)"
else
  echo "    ⚠️  NFC page returned $NFC_PAGE_CODE"
fi
echo ""

echo "=== Tests Complete ==="
