
import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/supabase";
import { startOfYear, endOfYear, format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface ClientStatusSectionProps {
  selectedYear: string;
}

export const ClientStatusSection = ({ selectedYear }: ClientStatusSectionProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const subscription = supabase
      .channel('clients-status')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clients-status', selectedYear] });
          toast({
            title: "Status Updated",
            description: "Client status data has been updated in real-time",
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, selectedYear, toast]);

  const { data: clients } = useQuery({
    queryKey: ["clients-status", selectedYear],
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

  const monthlyStatusData = React.useMemo(() => {
    if (!clients) return [];

    return Array.from({ length: 12 }, (_, i) => {
      const monthClients = clients.filter(client => {
        const clientDate = parseISO(client.created_at);
        return clientDate.getMonth() === i;
      });

      return {
        name: format(new Date(parseInt(selectedYear, 10), i), 'MMM'),
        paid: monthClients.filter(c => c.status === "Paid").length,
        pending: monthClients.filter(c => c.status === "Pending").length,
        overdue: monthClients.filter(c => c.status === "Suspended").length,
      };
    });
  }, [clients, selectedYear]);

  const currentStatus = {
    paid: clients?.filter(c => c.status === "Paid").length || 0,
    pending: clients?.filter(c => c.status === "Pending").length || 0,
    overdue: clients?.filter(c => c.status === "Suspended").length || 0,
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Client Payment Status</h3>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="h-[300px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyStatusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="paid" 
              name="Paid Clients" 
              stroke="#22c55e"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              name="Pending Clients" 
              stroke="#94a3b8"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="overdue" 
              name="Overdue Clients" 
              stroke="#ef4444"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
          <Label htmlFor="paid" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            Paid Clients ({currentStatus.paid})
          </Label>
          <Switch id="paid" checked={true} disabled />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
          <Label htmlFor="pending" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            Pending Clients ({currentStatus.pending})
          </Label>
          <Switch id="pending" checked={true} disabled />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
          <Label htmlFor="overdue" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            Overdue Clients ({currentStatus.overdue})
          </Label>
          <Switch id="overdue" checked={true} disabled />
        </div>
      </div>
    </Card>
  );
};

