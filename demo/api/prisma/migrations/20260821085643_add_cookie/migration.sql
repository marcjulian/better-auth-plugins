-- CreateTable
CREATE TABLE "cookieConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "consent" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookieConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cookieConsent_userId_key" ON "cookieConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cookieConsent_anonymousId_key" ON "cookieConsent"("anonymousId");

-- AddForeignKey
ALTER TABLE "cookieConsent" ADD CONSTRAINT "cookieConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
