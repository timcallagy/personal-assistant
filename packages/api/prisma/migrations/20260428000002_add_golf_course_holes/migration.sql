CREATE TABLE "golf_course_holes" (
  "id" SERIAL PRIMARY KEY,
  "course_name" TEXT NOT NULL,
  "hole_number" INTEGER NOT NULL,
  "par" INTEGER NOT NULL,
  "stroke_index" INTEGER NOT NULL,
  CONSTRAINT "golf_course_holes_course_name_hole_number_key" UNIQUE ("course_name", "hole_number")
);
CREATE INDEX "golf_course_holes_course_name_idx" ON "golf_course_holes"("course_name");
