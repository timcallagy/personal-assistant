ALTER TABLE "golf_rounds" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'complete';
CREATE INDEX "golf_rounds_status_idx" ON "golf_rounds"("status");
