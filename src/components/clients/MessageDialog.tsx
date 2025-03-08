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
import { MessageCircle } from "lucide-react";
import type { Client } from "@/lib/supabase";
import { format } from "date-fns";

interface MessageDialogProps {
  client: Client;
  children?: React.ReactNode;
}

const MessageDialog = ({ client, children }: MessageDialogProps) => {
  const [open, setOpen] = useState(false);

  const generateMessage = () => {
    const isPending = client.status === "Pending";
    const formattedDate = format(new Date(client.due_date), "do MMM yyyy");
    const template = isPending
      ? `Dear ${client.name},\nThis is a reminder that your WiFi payment of KSH ${client.amount_paid} is due on ${formattedDate}. Please ensure timely payment to avoid service interruption. Pay via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`
      : `Dear ${client.name},\nThis is a reminder that your WiFi payment of KSH ${client.amount_paid} was due on ${formattedDate}. Please update your payment to resume service. Pay via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`;
    return encodeURIComponent(template);
  };

  const handleWhatsAppClick = () => {
    const message = generateMessage();
    const phoneNumber = client.phone_number.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    setOpen(false);
  };

  const handleSMSClick = () => {
    const message = generateMessage();
    const phoneNumber = client.phone_number.replace(/\D/g, "");
    window.open(`sms:${phoneNumber}?body=${message}`, "_blank");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Payment Reminder</DialogTitle>
          <DialogDescription>
            Choose how you would like to send the payment reminder to {client.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={handleWhatsAppClick} className="w-full">
            Send via WhatsApp
          </Button>
          <Button onClick={handleSMSClick} variant="outline" className="w-full">
            Send via SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageDialog;