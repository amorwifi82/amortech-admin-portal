import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface DebtManagementDialogProps {
  client: Client;
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const DebtManagementDialog = ({
  client,
  onSuccess,
  open,
  onOpenChange,
  children
}: DebtManagementDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [debtAmount, setDebtAmount] = useState(client.debt.toString());
  const [debtReason, setDebtReason] = useState("");
  const { toast } = useToast();

  const generateMessage = () => {
    const message = `Dear ${client.name}, this is a reminder that you have an outstanding balance of KES ${parseFloat(debtAmount).toLocaleString()} for additional charges${debtReason ? ` (${debtReason})` : ''}. Please clear your payment via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`;
    return encodeURIComponent(message);
  };

  const handleWhatsAppClick = () => {
    const message = generateMessage();
    const phoneNumber = client.phone_number.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handleSMSClick = () => {
    const message = generateMessage();
    const phoneNumber = client.phone_number.replace(/\D/g, "");
    window.open(`sms:${phoneNumber}?body=${message}`, "_blank");
  };

  const handleUpdateDebt = async () => {
    try {
      setLoading(true);
      const amount = parseFloat(debtAmount);
      
      if (isNaN(amount)) {
        throw new Error("Please enter a valid amount");
      }

      // Update client's debt amount
      const { error: clientError } = await supabase
        .from("clients")
        .update({ 
          debt: amount 
        } as Partial<Client>)
        .eq("id", client.id);

      if (clientError) throw clientError;

      // Create or update debt record
      if (amount > 0) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        const { error: debtError } = await supabase
          .from("debts")
          .upsert({
            client_id: client.id,
            amount: amount,
            status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
            collected_amount: 0,
            created_at: new Date().toISOString()
          });

        if (debtError) throw debtError;

        // Store the debt reminder in messages table
        const messageText = `Dear ${client.name}, this is a reminder that you have an outstanding balance of KES ${amount.toLocaleString()} for additional charges${debtReason ? ` (${debtReason})` : ''}. Please clear your payment.`;
        
        const { error: messageError } = await supabase
          .from("messages")
          .insert({
            client_id: client.id,
            message: messageText,
            sent_at: new Date().toISOString(),
            status: "sent",
            created_at: new Date().toISOString()
          });

        if (messageError) throw messageError;
      }

      toast({
        title: "Success",
        description: "Additional charges updated successfully",
      });
      
      if (onOpenChange) onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update additional charges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async () => {
    try {
      setLoading(true);
      const dueDate = new Date(client.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let message = `Dear ${client.name}, `;
      
      if (client.debt > 0) {
        message += `you have an outstanding balance of KES ${client.debt.toLocaleString()} for additional charges. `;
      }
      
      message += `Your internet subscription payment of KES ${client.amount_paid.toLocaleString()} is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()}). `;
      message += "Please ensure timely payment to avoid service interruption.";

      const { error } = await supabase
        .from("messages")
        .insert({
          content: message,
          sender_id: "system",
          receiver_id: client.id,
          type: "payment_reminder"
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            💰 Manage Additional Charges
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Additional Charges</DialogTitle>
          <DialogDescription>
            Add or update any additional charges for {client.name} (separate from internet subscription)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Additional Charges Amount</Label>
            <Input
              type="number"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="Enter amount"
            />
            <p className="text-sm text-muted-foreground">
              Enter any additional charges beyond the regular internet subscription (e.g., equipment fees, service charges, penalties)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Reason for Charges (Optional)</Label>
            <Input
              value={debtReason}
              onChange={(e) => setDebtReason(e.target.value)}
              placeholder="e.g., Router replacement, Installation fee"
            />
          </div>
          <div className="space-y-2">
            <Label>Regular Subscription Details</Label>
            <p className="text-sm text-muted-foreground">
              Monthly Internet: KES {client.amount_paid.toLocaleString()}<br />
              Next Due: {new Date(client.due_date).toLocaleDateString()}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Send Reminder</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsAppClick}
                className="flex-1"
              >
                📱 Send via WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSMSClick}
                className="flex-1"
              >
                ✉️ Send via SMS
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleUpdateDebt}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Additional Charges
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DebtManagementDialog; 