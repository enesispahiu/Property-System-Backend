CREATE TABLE "ReviewAnalysis" (
  "id" SERIAL NOT NULL,
  "reviewId" INTEGER NOT NULL,
  "sentiment" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "issue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReviewAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewAnalysis_reviewId_key" ON "ReviewAnalysis"("reviewId");

ALTER TABLE "ReviewAnalysis"
ADD CONSTRAINT "ReviewAnalysis_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "Review"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
