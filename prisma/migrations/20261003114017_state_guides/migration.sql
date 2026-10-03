-- CreateTable
CREATE TABLE "StateGuide" (
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "biPerPerson" INTEGER NOT NULL DEFAULT 0,
    "biPerAccident" INTEGER NOT NULL DEFAULT 0,
    "pd" INTEGER NOT NULL DEFAULT 0,
    "noFault" BOOLEAN NOT NULL DEFAULT false,
    "pipRequired" BOOLEAN NOT NULL DEFAULT false,
    "pipMinimum" INTEGER,
    "umRequired" BOOLEAN NOT NULL DEFAULT false,
    "uimRequired" BOOLEAN NOT NULL DEFAULT false,
    "medPayRequired" BOOLEAN NOT NULL DEFAULT false,
    "requirementNote" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "intro" TEXT NOT NULL DEFAULT '',
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "avgAnnualPremium" INTEGER,
    "premiumSource" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateGuide_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "StateGuide_slug_key" ON "StateGuide"("slug");

-- CreateIndex
CREATE INDEX "StateGuide_published_idx" ON "StateGuide"("published");
