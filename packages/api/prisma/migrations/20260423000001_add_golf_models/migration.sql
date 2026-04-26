-- Golf Tracker Models

CREATE TABLE "golf_users" (
  "id"            SERIAL PRIMARY KEY,
  "username"      TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "golf_sessions" (
  "id"         TEXT PRIMARY KEY,
  "user_id"    INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "golf_users"("id") ON DELETE CASCADE
);

CREATE INDEX "golf_sessions_user_id_idx" ON "golf_sessions"("user_id");

CREATE TABLE "golf_rounds" (
  "id"          SERIAL PRIMARY KEY,
  "user_id"     INTEGER NOT NULL,
  "course"      TEXT NOT NULL,
  "holes"       INTEGER NOT NULL,
  "total_shots" INTEGER NOT NULL,
  "hole_data"   JSONB NOT NULL,
  "played_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "golf_users"("id") ON DELETE CASCADE
);

CREATE INDEX "golf_rounds_user_id_idx" ON "golf_rounds"("user_id");
