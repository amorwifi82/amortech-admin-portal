import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear, format, parseISO } from "date-fns";
import type { Client } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface MonthlyPaymentReportProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export const MonthlyPaymentReport = ({ selectedYear, onYearChange }: MonthlyPaymentReportProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const subscription = supabase
      .channel('monthly-payments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['monthly-payments', selectedYear] });
          toast({
            title: "Monthly Report Updated",
            description: "Payment data has been updated in real-time",
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, selectedYear, toast]);

  const currentYear = new Date().getFullYear();

  const { data: clients } = useQuery({
    queryKey: ["monthly-payments", selectedYear],
    queryFn: async () => {
      const startDate = startOfYear(new Date(parseInt(selectedYear, 10)));
      const endDate = endOfYear(new Date(parseInt(selectedYear, 10)));
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const monthlyData = React.useMemo(() => {
    if (!clients) return [];

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthClients = clients.filter(client => {
        const clientDate = parseISO(client.created_at);
        return clientDate.getMonth() === i;
      });

      return {
        month: format(new Date(parseInt(selectedYear, 10), i), 'MMMM'),
        totalClients: monthClients.length,
        paidClients: monthClients.filter(c => c.status === "Paid").length,
        pendingClients: monthClients.filter(c => c.status === "Pending").length,
        overdueClients: monthClients.filter(c => c.status === "Overdue").length,
        totalCollected: monthClients.reduce((sum, client) => 
          sum + (client.amount_paid || 0), 0),
      };
    });

    return months;
  }, [clients, selectedYear]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => 
    (currentYear - i).toString()
  );

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Monthly Payment Report</h3>
        <Select 
          value={selectedYear} 
          onValueChange={onYearChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(year => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Total Enrolled</TableHead>
              <TableHead>Paid Clients</TableHead>
              <TableHead>Pending Clients</TableHead>
              <TableHead>Overdue Clients</TableHead>
              <TableHead className="text-right">Total Collected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((data) => (
              <TableRow key={data.month}>
                <TableCell className="font-medium">{data.month}</TableCell>
                <TableCell>{data.totalClients}</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-500">
                    {data.paidClients}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {data.pendingClients}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {data.overdueClients}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  KES {data.totalCollected.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

