-- Reconcile audit trace id schema that existed in the database/schema before
-- this migration was recorded. Keep this idempotent so existing dev databases
-- can apply it without reset, while fresh databases still get the column.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "traceId" TEXT;

CREATE INDEX IF NOT EXISTS "audit_logs_traceId_idx" ON "audit_logs"("traceId");
