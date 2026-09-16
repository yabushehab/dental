import { prisma } from "@dentalos/db";
import { renderTemplateBody } from "@dentalos/meta";
import { dateStrInTz, formatTime12h } from "@dentalos/shared";
import { sendViaChannel } from "../send";

/**
 * Send appointment reminders: for each active rule, find appointments
 * starting within `offsetHours` that haven't been reminded (ReminderLog
 * unique on appointment+rule), and send the WhatsApp template to opted-in
 * patients through the org's WhatsApp channel.
 */
export async function runReminderScan(): Promise<void> {
  const rules = await prisma.reminderRule.findMany({
    where: { isActive: true },
    include: { template: true, organization: true },
  });

  for (const rule of rules) {
    const now = new Date();
    const horizon = new Date(now.getTime() + rule.offsetHours * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId: rule.organizationId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startsAt: { gte: now, lte: horizon },
      },
      include: { patient: true, clinic: true },
    });

    const channel = await prisma.channel.findFirst({
      where: { organizationId: rule.organizationId, platform: "WHATSAPP", status: "CONNECTED" },
    });

    for (const appt of appointments) {
      const already = await prisma.reminderLog.findUnique({
        where: { appointmentId_ruleId: { appointmentId: appt.id, ruleId: rule.id } },
      });
      if (already) continue;
      // only remind unconfirmed appointments when the rule asks for confirmation
      if (rule.requiresConfirmation && appt.status === "CONFIRMED") {
        await prisma.reminderLog.create({
          data: {
            organizationId: rule.organizationId,
            appointmentId: appt.id,
            ruleId: rule.id,
            status: "SKIPPED",
            detail: "already confirmed",
          },
        });
        continue;
      }

      const skip = (detail: string) =>
        prisma.reminderLog.create({
          data: {
            organizationId: rule.organizationId,
            appointmentId: appt.id,
            ruleId: rule.id,
            status: "SKIPPED",
            detail,
          },
        });

      if (!channel) {
        await skip("no connected WhatsApp channel");
        continue;
      }
      if (!appt.patient.phone || !appt.patient.whatsappOptIn) {
        await skip(!appt.patient.phone ? "no phone" : "opted out");
        continue;
      }

      const tz = rule.organization.timezone;
      const params = [
        appt.patient.firstName,
        rule.organization.name,
        dateStrInTz(appt.startsAt, tz),
        formatTime12h(appt.startsAt, tz),
      ];
      const waId = appt.patient.phone.replace(/\D/g, "");
      const template = rule.template;

      const result = template
        ? await sendViaChannel(channel, waId, {
            kind: "template",
            name: template.name,
            language: template.language,
            params,
          })
        : await sendViaChannel(channel, waId, {
            kind: "text",
            text: `Reminder: appointment at ${params[1]} on ${params[2]} at ${params[3]}. Reply CONFIRM to confirm.`,
          });

      // record the outbound message in the patient's conversation
      if (result.ok) {
        const contact = await prisma.contact.upsert({
          where: {
            organizationId_platform_externalUserId: {
              organizationId: rule.organizationId,
              platform: "WHATSAPP",
              externalUserId: waId,
            },
          },
          create: {
            organizationId: rule.organizationId,
            platform: "WHATSAPP",
            externalUserId: waId,
            displayName: `${appt.patient.firstName} ${appt.patient.lastName}`,
            phone: appt.patient.phone,
            patientId: appt.patient.id,
          },
          update: { patientId: appt.patient.id },
        });
        const conversation = await prisma.conversation.upsert({
          where: { channelId_contactId: { channelId: channel.id, contactId: contact.id } },
          create: {
            organizationId: rule.organizationId,
            channelId: channel.id,
            contactId: contact.id,
            lastMessageAt: new Date(),
          },
          update: { lastMessageAt: new Date() },
        });
        await prisma.message.create({
          data: {
            organizationId: rule.organizationId,
            conversationId: conversation.id,
            direction: "OUT",
            externalMessageId: result.externalMessageId || null,
            type: "TEMPLATE",
            templateName: template?.name ?? null,
            body: template ? renderTemplateBody(template.body, params) : null,
            status: "SENT",
          },
        });
      }

      await prisma.reminderLog.create({
        data: {
          organizationId: rule.organizationId,
          appointmentId: appt.id,
          ruleId: rule.id,
          status: result.ok ? "SENT" : "FAILED",
          detail: result.ok ? ("simulated" in result && result.simulated ? "simulated" : null) : result.error,
        },
      });
    }
  }
}
