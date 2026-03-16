CREATE TYPE "NotifyChannel" AS ENUM ('sms', 'push', 'none');

ALTER TABLE "User"
ADD COLUMN "phone" TEXT,
ADD COLUMN "notifyVia" "NotifyChannel" NOT NULL DEFAULT 'none';

ALTER TABLE "HouseholdMember"
ADD COLUMN "parentNotifyUserId" UUID;

CREATE TABLE "PushSubscription" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsed" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationLog" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "channel" "NotifyChannel" NOT NULL,
  "event" TEXT NOT NULL,
  "taskId" UUID,
  "sentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL,
  "errorMsg" TEXT,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX "NotificationLog_taskId_idx" ON "NotificationLog"("taskId");
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
ADD CONSTRAINT "NotificationLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
ADD CONSTRAINT "NotificationLog_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
