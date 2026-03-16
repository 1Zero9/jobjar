import type { NotifyChannel } from "@prisma/client";
import webPush from "web-push";
import { prisma } from "@/lib/prisma";

type NotifyEvent =
  | "task_logged"
  | "task_assigned"
  | "task_completed";

type PushPayload = {
  body: string;
  title: string;
  url?: string;
};

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;
const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);

if (pushConfigured) {
  webPush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export async function notifyUser(
  userId: string,
  event: NotifyEvent,
  payload: PushPayload,
  taskId?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyVia: true,
    },
  });

  if (!user || user.notifyVia === "none") {
    return;
  }

  let success = false;
  let errorMsg: string | null = null;

  try {
    if (user.notifyVia === "push") {
      const pushResult = await sendPush(userId, payload);
      success = pushResult.success;
      errorMsg = pushResult.errorMsg;
    } else {
      errorMsg = "SMS delivery is not configured yet.";
    }
  } catch (error) {
    success = false;
    errorMsg = error instanceof Error ? error.message : "Notification failed.";
  }

  await prisma.notificationLog.create({
    data: {
      userId,
      channel: user.notifyVia as NotifyChannel,
      event,
      taskId: taskId ?? null,
      success,
      errorMsg,
    },
  });
}

export async function resolveNotificationRecipientUserId(householdId: string, userId: string) {
  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    select: {
      userId: true,
      audienceBand: true,
      parentNotifyUserId: true,
    },
  });

  if (!membership) {
    return null;
  }

  if (membership.audienceBand === "under_12" && membership.parentNotifyUserId) {
    return membership.parentNotifyUserId;
  }

  return membership.userId;
}

async function sendPush(userId: string, payload: PushPayload) {
  if (!pushConfigured) {
    return { success: false, errorMsg: "VAPID keys are not configured." };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { success: false, errorMsg: "No active push subscriptions for this user." };
  }

  let delivered = 0;
  let lastError: string | null = null;

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth,
            p256dh: subscription.p256dh,
          },
        },
        JSON.stringify(payload),
      );

      delivered += 1;

      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { lastUsed: new Date() },
      });
    } catch (error: unknown) {
      if (isGoneError(error)) {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        });
      }

      lastError = error instanceof Error ? error.message : "Push delivery failed.";
    }
  }

  return {
    success: delivered > 0,
    errorMsg: delivered > 0 ? null : lastError ?? "Push delivery failed.",
  };
}

function isGoneError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 410
  );
}
