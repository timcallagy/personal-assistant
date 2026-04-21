-- CreateTable
CREATE TABLE "babblo_funnel_configs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "steps" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "babblo_funnel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "babblo_funnel_configs_user_id_key" ON "babblo_funnel_configs"("user_id");

-- AddForeignKey
ALTER TABLE "babblo_funnel_configs" ADD CONSTRAINT "babblo_funnel_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
