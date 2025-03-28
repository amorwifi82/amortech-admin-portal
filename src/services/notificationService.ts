import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientStatus } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { addDays, isBefore, isToday } from "date-fns";

const WHATSAPP_MESSAGE_TEMPLATES = {
  pending: (client: Client) => `
Dear ${client.name},

This is a friendly reminder that your WiFi payment of KES ${client.amount_paid} is due on ${new Date(client.due_date).toLocaleDateString()}. 

Please make your payment via Mpesa Paybill 522533 Account 7831501 to avoid service interruption.

Thank you for choosing our services!
`,
  overdue: (client: Client) => `
Dear ${client.name},

Your WiFi service is currently overdue. The payment of KES ${client.amount_paid} was due on ${new Date(client.due_date).toLocaleDateString()}. 

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
    let message = "";
    const dueDate = new Date(client.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Convert suspended status to overdue for message selection
    const status = client.status === "Suspended" ? "Overdue" as ClientStatus : client.status;

    if (client.debt > 0) {
      message = WHATSAPP_MESSAGE_TEMPLATES.debt(client);
    } else if (status === "Overdue") {
      message = WHATSAPP_MESSAGE_TEMPLATES.overdue(client);
    } else if (status === "Pending") {
      message = WHATSAPP_MESSAGE_TEMPLATES.pending(client);
    }

    if (message) {
      const phoneNumber = client.phone_number.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");

      // Record the message in the database
      const { error } = await supabase
        .from("messages")
        .insert({
          client_id: client.id,
          message: message,
          sent_at: new Date().toISOString(),
          status: "sent",
          created_at: new Date().toISOString(),
          type: "whatsapp"
        });

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error sending notification:", error);
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
      .or(`status.eq.Pending,status.eq.Overdue,status.eq.Suspended,debt.gt.0`);

    if (error) throw error;

    const typedClients = (clients || []).map(client => ({
      ...client,
      // Treat Suspended status as Overdue
      status: client.status === "Suspended" ? "Overdue" as ClientStatus : client.status as ClientStatus,
      debt: client.debt || 0
    })) as Client[];

    const now = new Date();
    const remindersToSend = typedClients.filter(client => {
      const dueDate = new Date(client.due_date);
      const reminderDate = addDays(dueDate, -reminderDays);
      
      return (
        (client.debt || 0) > 0 || // Always send reminders for clients with debt
        client.status === "Overdue" || // Always send reminders for overdue/suspended clients
        isToday(reminderDate) || // Send reminder X days before due date
        isBefore(dueDate, now) // Send reminder for overdue payments
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