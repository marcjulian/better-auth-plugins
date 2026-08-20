-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmationSentAt" TIMESTAMP(3),
    "metadata" TEXT,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_email_key" ON "lead"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_userId_key" ON "lead"("userId");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
