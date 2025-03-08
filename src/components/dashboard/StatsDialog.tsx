import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import type { Client } from "@/lib/supabase";
import MessageDialog from "../clients/MessageDialog";

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  clients: Client[];
  type: "total" | "overdue" | "active";
}

const StatsDialog = ({
  open,
  onOpenChange,
  title,
  description,
  clients,
  type,
}: StatsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.phone_number}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      KES {client.amount_paid.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {type === "overdue"
                        ? `Due: ${format(new Date(client.due_date), "do MMM yyyy")}`
                        : `Last paid: ${formatDistanceToNow(new Date(client.updated_at), {
                            addSuffix: true,
                          })}`}
                    </p>
                  </div>
                  {(type === "overdue" || type === "active") && (
                    <MessageDialog client={client} />
                  )}
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-center text-muted-foreground">No clients found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StatsDialog;