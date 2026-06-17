/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `cookieConsent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[anonymousId]` on the table `cookieConsent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cookieConsent_userId_key" ON "cookieConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cookieConsent_anonymousId_key" ON "cookieConsent"("anonymousId");
