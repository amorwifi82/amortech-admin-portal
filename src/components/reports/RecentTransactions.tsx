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
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const RecentTransactions = () => {
  const { data: transactions } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.name}</TableCell>
              <TableCell>KES {transaction.amount_paid.toLocaleString()}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    transaction.status === "Paid"
                      ? "default"
                      : transaction.status === "Pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {transaction.status}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(transaction.updated_at), {
                  addSuffix: true,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};