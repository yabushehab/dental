-- Row-Level Security backstop for multi-tenancy.
--
-- Apply in staging/production AFTER `prisma migrate deploy`, connected as the
-- database owner. The application must then connect as `app_user` and set
-- `app.org_id` per request/transaction:
--
--   SELECT set_config('app.org_id', '<organizationId>', true);
--
-- Local dev connects as a superuser, which bypasses RLS — the Prisma
-- `orgScoped` extension is the first line of defense everywhere; RLS is the
-- production backstop.

-- Application role (set a real password via ALTER ROLE in your secret store)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_ME';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Tenant-scoped tables: keep in sync with TENANT_MODELS in src/tenancy.ts
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clinics', 'memberships', 'providers', 'audit_events',
    'patients', 'medical_histories', 'documents',
    'chairs', 'appointment_types', 'appointments', 'counters',
    'tooth_records', 'chart_entries', 'procedure_codes',
    'treatment_plans', 'treatment_plan_items',
    'clinical_notes', 'note_amendments', 'prescriptions',
    'invoices', 'invoice_lines', 'payments',
    'insurance_companies', 'insurance_policies', 'insurance_claims'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("organizationId" = current_setting(''app.org_id'', true))
         WITH CHECK ("organizationId" = current_setting(''app.org_id'', true))',
      t
    );
  END LOOP;
END
$$;

-- organizations: a session may only see its own org row
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organizations;
CREATE POLICY tenant_isolation ON organizations
  USING (id = current_setting('app.org_id', true))
  WITH CHECK (id = current_setting('app.org_id', true));

-- users is global (sign-in happens before an org is known): no RLS.
