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
  onSuccess?: () => void;
  children?: React.ReactNode;
}

const DebtManagementDialog = ({ client, onSuccess, children }: DebtManagementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debtAmount, setDebtAmount] = useState(client.debt.toString());
  const { toast } = useToast();

  const handleUpdateDebt = async () => {
    try {
      setLoading(true);
      const amount = parseFloat(debtAmount);
      
      if (isNaN(amount)) {
        throw new Error("Please enter a valid amount");
      }

      const { error } = await supabase
        .from("clients")
        .update({ debt: amount })
        .eq("id", client.id);

      if (error) throw error;

      // Send reminder if debt is updated
      if (amount > 0) {
        const message = `Dear ${client.name}, this is a reminder that you have an outstanding debt of KES ${amount.toLocaleString()}. Please clear your payment to avoid service interruption.`;
        
        await supabase
          .from("messages")
          .insert({
            content: message,
            sender_id: "system",
            receiver_id: client.id,
            type: "debt_reminder"
          });
      }

      toast({
        title: "Success",
        description: "Debt updated successfully",
      });
      
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update debt",
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
        message += `you have an outstanding debt of KES ${client.debt.toLocaleString()}. `;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            💰 Manage Debt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Client Debt</DialogTitle>
          <DialogDescription>
            Update debt amount and send payment reminders to {client.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Debt</Label>
            <Input
              type="number"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="Enter debt amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Next Payment Due</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(client.due_date).toLocaleDateString()}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={sendReminder}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            📱 Send Payment Reminder
          </Button>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleUpdateDebt}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Debt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DebtManagementDialog; 