import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientStatus } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";

const WHATSAPP_MESSAGE_TEMPLATES = {
  pending: (client: Client) => `
Dear ${client.name},

This is a friendly reminder that your WiFi payment of KES ${client.amount_paid} is due on ${new Date(client.due_date).toLocaleDateString()}. 

Please make your payment to avoid any service interruption.

Thank you for choosing our services!
`,
  suspended: (client: Client) => `
Dear ${client.name},

Your WiFi service has been suspended due to an overdue payment of KES ${client.amount_paid}. 

Please make your payment as soon as possible to restore your service.

If you have any questions, please don't hesitate to contact us.
`,
};

export const sendNotification = async (client: Client) => {
  try {
    const messageData: Database['public']['Tables']['messages']['Insert'] = {
      content: WHATSAPP_MESSAGE_TEMPLATES[client.status === "Suspended" ? "suspended" : "pending"](client),
      sender_id: "system",
      receiver_id: client.id,
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
    const { data: clients, error } = await supabase
      .from("clients")
      .select("*")
      .or("status.eq.Pending,status.eq.Suspended");

    if (error) throw error;

    const typedClients = (clients || []).map(client => ({
      ...client,
      status: client.status as ClientStatus
    }));

    for (const client of typedClients) {
      await sendNotification(client);
    }
  } catch (error) {
    console.error("Error checking clients:", error);
    throw error;
  }
};