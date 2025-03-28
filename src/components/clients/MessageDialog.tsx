import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Client } from "@/lib/supabase";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageDialogProps {
  client: Client;
  children?: React.ReactNode;
}

const MessageDialog = ({ client, children }: MessageDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const generateMessage = () => {
    const formattedDate = format(new Date(client.due_date), "do MMM yyyy");
    let template = "";

    if (client.debt > 0) {
      // If there's outstanding debt, include both debt and subscription information
      if (client.status === "Overdue") {
        template = `Dear ${client.name},\n\nThis is a reminder about your outstanding payments:\n\n1. Outstanding Debt: KES ${client.debt.toLocaleString()}\n2. Overdue Subscription: KES ${client.amount_paid.toLocaleString()} (due on ${formattedDate})\n\nTotal Amount Due: KES ${(client.debt + client.amount_paid).toLocaleString()}\n\nPlease clear all payments via Mpesa Paybill 522533 Account 7831501 to restore your service.\n\nThank you for your attention to this matter.`;
      } else if (client.status === "Pending") {
        template = `Dear ${client.name},\n\nThis is a reminder about your payments:\n\n1. Outstanding Debt: KES ${client.debt.toLocaleString()}\n2. Upcoming Subscription: KES ${client.amount_paid.toLocaleString()} (due on ${formattedDate})\n\nTotal Amount Due: KES ${(client.debt + client.amount_paid).toLocaleString()}\n\nPlease clear all payments via Mpesa Paybill 522533 Account 7831501 to avoid service interruption.\n\nThank you for your attention to this matter.`;
      } else {
        template = `Dear ${client.name},\n\nThis is a reminder about your outstanding debt of KES ${client.debt.toLocaleString()}. Your next subscription payment of KES ${client.amount_paid.toLocaleString()} will be due on ${formattedDate}.\n\nPlease clear your debt via Mpesa Paybill 522533 Account 7831501.\n\nThank you for your attention to this matter.`;
      }
    } else if (client.status === "Overdue") {
      template = `Dear ${client.name},\n\nYour WiFi service is currently overdue. The payment of KES ${client.amount_paid.toLocaleString()} was due on ${formattedDate}. Please make your payment via Mpesa Paybill 522533 Account 7831501 to restore your service.\n\nThank you for your business.`;
    } else if (client.status === "Pending") {
      template = `Dear ${client.name},\n\nThis is a reminder that your WiFi payment of KES ${client.amount_paid.toLocaleString()} is due on ${formattedDate}. Please ensure timely payment to avoid service interruption. Pay via Mpesa Paybill 522533 Account 7831501.\n\nThank you for your business.`;
    } else {
      template = `Dear ${client.name},\n\nThank you for your payment of KES ${client.amount_paid.toLocaleString()}. Your next payment of the same amount will be due on ${formattedDate}. Pay via Mpesa Paybill 522533 Account 7831501.\n\nThank you for your business.`;
    }

    return encodeURIComponent(template);
  };

  const handleWhatsAppClick = async () => {
    try {
      const message = generateMessage();
      const phoneNumber = client.phone_number.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");

      // Record the message in the database
      const decodedMessage = decodeURIComponent(message);
      const { error } = await supabase
        .from("messages")
        .insert({
          client_id: client.id,
          message: decodedMessage,
          sent_at: new Date().toISOString(),
          status: "sent",
          created_at: new Date().toISOString(),
          type: "whatsapp"
        });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Message sent and recorded successfully",
      });
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record message",
        variant: "destructive",
      });
    }
  };

  const handleSMSClick = async () => {
    try {
      const message = generateMessage();
      const phoneNumber = client.phone_number.replace(/\D/g, "");
      window.open(`sms:${phoneNumber}?body=${message}`, "_blank");

      // Record the message in the database
      const decodedMessage = decodeURIComponent(message);
      const { error } = await supabase
        .from("messages")
        .insert({
          client_id: client.id,
          message: decodedMessage,
          sent_at: new Date().toISOString(),
          status: "sent",
          created_at: new Date().toISOString(),
          type: "sms"
        });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Message sent and recorded successfully",
      });
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record message",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <span className="text-xl text-blue-500">💬</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message to {client.name}</DialogTitle>
          <DialogDescription>
            Choose how you want to send the message to {client.name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button
            onClick={handleWhatsAppClick}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Send via WhatsApp
          </Button>
          <Button
            onClick={handleSMSClick}
            variant="outline"
          >
            Send via SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;