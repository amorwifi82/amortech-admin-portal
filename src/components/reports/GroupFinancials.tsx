import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const GroupFinancials = () => {
  const { data: pendingClients } = useQuery({
    queryKey: ["pending-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("status", "Pending")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Group Financial Obligations</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Amount Due</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingClients?.map((client) => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>KES {client.amount_paid.toLocaleString()}</TableCell>
              <TableCell>{new Date(client.due_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={new Date(client.due_date) < new Date() ? "destructive" : "secondary"}>
                  {new Date(client.due_date) < new Date() ? "Overdue" : "Pending"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};