ALTER TABLE "golf_rounds" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "golf_rounds_archived_idx" ON "golf_rounds"("archived");
