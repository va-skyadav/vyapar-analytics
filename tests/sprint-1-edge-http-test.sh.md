# Sprint 1 — QA HTTP Test Script

Set these locally; never commit values:
- SUPABASE_URL=https://cdgmymahocwhugcllbxl.supabase.co
- SUPABASE_ANON_KEY=<publishable key>
- QA_SUPPORT_EMAIL / QA_SUPPORT_PASSWORD
- QA_OPS_EMAIL / QA_OPS_PASSWORD
- QA_FINANCE_EMAIL / QA_FINANCE_PASSWORD
- QA_SUPER_EMAIL / QA_SUPER_PASSWORD
- QA_CUSTOMER_EMAIL / QA_CUSTOMER_PASSWORD
- TARGET_ADMIN_USER_ID=<normal admin target>
- SUPER_ADMIN_USER_ID=<second SUPER_ADMIN target>
- BILLING_COMPANY_ID=<current company profile id>

Login helper:
```bash
login(){ curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password"   -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json"   -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
```

Record each HTTP status and JSON response body.

## 1. Non-super -> create-admin-user
Expected: HTTP 403.

```bash
TOKEN=$(login "$QA_SUPPORT_EMAIL" "$QA_SUPPORT_PASSWORD" | jq -r .access_token)
curl -i -X POST "$SUPABASE_URL/functions/v1/create-admin-user"  -H "Authorization: Bearer $TOKEN" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json"  -d '{"email":"qa-denied@example.invalid","display_name":"Denied QA","role_id":"<CUSTOMER_SUPPORT_ROLE_ID>"}'
```

## 2. Non-super -> create SUPER_ADMIN
Expected: HTTP 403.

Use the same QA support token and SUPER_ADMIN role ID.

## 3. Non-super -> admin-change-password
Expected: HTTP 403.

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/admin-change-password"  -H "Authorization: Bearer $TOKEN" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json"  -d "{\"target_user_id\":\"$TARGET_ADMIN_USER_ID\",\"password\":\"QA-New-Password-123!\"}"
```

## 4. SUPER_ADMIN -> change another SUPER_ADMIN
Expected: HTTP 403.

Use QA super token and SUPER_ADMIN target ID.

## 5. SUPER_ADMIN -> change normal admin
Expected: HTTP 200, `success:true`, session revocation count returned, `must_change_password=true`, exactly one password-change audit event.

## 6. Customer -> both Edge Functions
Expected: HTTP 403 for both.

Run scenarios 1 and 3 with QA customer token.

## 7. Finance Admin -> billing company RPC
Expected: HTTP 200 and exactly one audit row.

```bash
FINANCE_TOKEN=$(login "$QA_FINANCE_EMAIL" "$QA_FINANCE_PASSWORD" | jq -r .access_token)
curl -i -X POST "$SUPABASE_URL/rest/v1/rpc/admin_update_billing_company_profile"  -H "Authorization: Bearer $FINANCE_TOKEN" -H "apikey: $SUPABASE_ANON_KEY"  -H "Content-Type: application/json"  -d "{\"p_id\":\"$BILLING_COMPANY_ID\",\"p_payload\":{},\"p_reason\":\"Sprint 1 QA billing RPC test\"}"
```

Run inside a controlled QA transaction/test record or use a harmless field value; verify one audit row with actor = Finance Admin.

## 8. Finance Admin -> payment-method RPC
Expected: HTTP 200 and exactly one audit row.

For an existing payment method, send its complete non-secret public payload. Vault IDs are passed as IDs only; secret values must never be included in this RPC.

## 9. Customer Support -> billing RPCs
Expected: HTTP 403 for both company-profile and payment-method RPC.

## 10. Direct table-write negative tests
Expected: HTTP 401/403/permission denied for authenticated non-authorized clients.

Test:
- billing_company_profile UPDATE
- billing_payment_methods INSERT/UPDATE/DELETE

## Audit verification
After each successful mutation:
- exactly one corresponding audit event
- actor equals authenticated QA admin
- old/new data present
- mandatory reason present
- no secret value present in audit payload.

Never paste QA credentials, access tokens, passwords, or secret values into the test report.
