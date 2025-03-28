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

interface BatchOperationsDialogProps {
  selectedIds: string[];
  onSuccess: () => void;
}

const BatchOperationsDialog = ({ selectedIds, onSuccess }: BatchOperationsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");

  const handleBatchUpdate = async () => {
    try {
      setLoading(true);
      const updates: Record<string, any> = {};
      
      if (dueDate) updates.due_date = dueDate;
      if (amount) updates.amount_paid = parseFloat(amount);
      
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("clients")
          .update(updates)
          .in("id", selectedIds);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Clients updated successfully",
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("clients")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Clients deleted successfully",
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={selectedIds.length === 0}>
          Batch Operations ({selectedIds.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Batch Operations</DialogTitle>
          <DialogDescription>
            Update or delete multiple clients at once
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="due_date">New Due Date (Optional)</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">New Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter new amount"
            />
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            type="button"
            variant="destructive"
            onClick={handleBatchDelete}
            disabled={loading}
          >
            Delete Selected
          </Button>
          <Button
            type="button"
            onClick={handleBatchUpdate}
            disabled={loading || (!dueDate && !amount)}
          >
            Update Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchOperationsDialog;