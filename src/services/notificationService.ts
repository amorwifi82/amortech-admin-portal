import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientStatus } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { addDays, isBefore, isToday } from "date-fns";

const WHATSAPP_MESSAGE_TEMPLATES = {
  pending: (client: Client) => `
Dear ${client.name},

This is a friendly reminder that your WiFi payment of KES ${client.amount_paid} is due on ${new Date(client.due_date).toLocaleDateString()}. 

Please make your payment via Mpesa Paybill 522533 Account 7831501 to avoid any service interruption.

Thank you for choosing our services!
`,
  suspended: (client: Client) => `
Dear ${client.name},

Your WiFi service has been suspended due to an overdue payment of KES ${client.amount_paid}. 

Please make your payment via Mpesa Paybill 522533 Account 7831501 to restore your service.

If you have any questions, please don't hesitate to contact us.
`,
  debt: (client: Client) => `
Dear ${client.name},

This is a reminder about your outstanding debt of KES ${client.debt || 0}. 

Please clear your payment via Mpesa Paybill 522533 Account 7831501.

Thank you for your attention to this matter.
`
};

export const sendNotification = async (client: Client) => {
  try {
    let messageContent: string;
    
    if (client.debt > 0) {
      messageContent = WHATSAPP_MESSAGE_TEMPLATES.debt(client);
    } else if (client.status === "Suspended") {
      messageContent = WHATSAPP_MESSAGE_TEMPLATES.suspended(client);
    } else {
      messageContent = WHATSAPP_MESSAGE_TEMPLATES.pending(client);
    }

    const messageData = {
      client_id: client.id,
      message: messageContent,
      status: client.debt > 0 ? "debt_reminder" : "payment_reminder",
      sent_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("messages")
      .insert([messageData]);

    if (error) throw error;

    console.log("Notification sent to:", client.name, "via", client.phone_number);

    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

export const checkAndNotifyClients = async () => {
  try {
    // Get settings for reminder days
    const { data: settingsData } = await supabase
      .from("settings")
      .select("*")
      .single();

    const reminderDays = settingsData?.payment_reminder_days || 3;
    const notificationsEnabled = settingsData?.notification_enabled || false;

    if (!notificationsEnabled) {
      console.log("Notifications are disabled in settings");
      return;
    }

    // Get all clients
    const { data: clients, error } = await supabase
      .from("clients")
      .select("*")
      .or(`status.eq.Pending,status.eq.Suspended,debt.gt.0`);

    if (error) throw error;

    const typedClients = (clients || []).map(client => ({
      ...client,
      status: client.status as ClientStatus,
      debt: client.debt || 0
    })) as Client[];

    const now = new Date();
    const remindersToSend = typedClients.filter(client => {
      const dueDate = new Date(client.due_date);
      const reminderDate = addDays(dueDate, -reminderDays);
      
      return (
        (client.debt || 0) > 0 || // Always send reminders for clients with debt
        client.status === "Suspended" || // Always send reminders for suspended clients
        isToday(reminderDate) || // Send reminder X days before due date
        isBefore(dueDate, now) || // Send reminder for overdue payments
        client.status === "Overdue" || // Always send reminders for overdue clients
        client.status === "Suspended" // Always send reminders for suspended clients
      );
    });

    for (const client of remindersToSend) {
      await sendNotification(client);
    }

    return remindersToSend.length;
  } catch (error) {
    console.error("Error checking clients:", error);
    throw error;
  }
};