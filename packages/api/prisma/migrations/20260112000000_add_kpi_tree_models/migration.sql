-- CreateTable
CREATE TABLE "kpi_periods" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "quarter" INTEGER,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_metrics" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layer" INTEGER NOT NULL,
    "parent_key" TEXT,
    "unit" TEXT NOT NULL,
    "favorable" TEXT NOT NULL,
    "formula" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_metric_values" (
    "id" SERIAL NOT NULL,
    "metric_id" INTEGER NOT NULL,
    "period_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_metric_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_periods_is_current_idx" ON "kpi_periods"("is_current");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_periods_type_year_month_key" ON "kpi_periods"("type", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_periods_type_year_quarter_key" ON "kpi_periods"("type", "year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_metrics_key_key" ON "kpi_metrics"("key");

-- CreateIndex
CREATE INDEX "kpi_metrics_layer_idx" ON "kpi_metrics"("layer");

-- CreateIndex
CREATE INDEX "kpi_metrics_parent_key_idx" ON "kpi_metrics"("parent_key");

-- CreateIndex
CREATE INDEX "kpi_metric_values_metric_id_idx" ON "kpi_metric_values"("metric_id");

-- CreateIndex
CREATE INDEX "kpi_metric_values_period_id_idx" ON "kpi_metric_values"("period_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_metric_values_metric_id_period_id_key" ON "kpi_metric_values"("metric_id", "period_id");

-- AddForeignKey
ALTER TABLE "kpi_metric_values" ADD CONSTRAINT "kpi_metric_values_metric_id_fkey" FOREIGN KEY ("metric_id") REFERENCES "kpi_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_metric_values" ADD CONSTRAINT "kpi_metric_values_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "kpi_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
