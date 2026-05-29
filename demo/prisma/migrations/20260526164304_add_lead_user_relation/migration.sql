/*
  Warnings:

  - You are about to drop the column `emailVerified` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `verificationEmailSentAt` on the `lead` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "lead" DROP COLUMN "emailVerified",
DROP COLUMN "verificationEmailSentAt",
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "lead_userId_key" ON "lead"("userId");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
