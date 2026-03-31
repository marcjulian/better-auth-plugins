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

-- AddForeignKey
ALTER TABLE "cookieConsent" ADD CONSTRAINT "cookieConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
