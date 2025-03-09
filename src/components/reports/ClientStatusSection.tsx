import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <span className="text-3xl">👥</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <h3 className="text-2xl font-bold">{clients?.length || 0}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <h3 className="text-2xl font-bold">{currentStatus.paid}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <span className="text-3xl">⏳</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Clients</p>
              <h3 className="text-2xl font-bold">{currentStatus.pending}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-500 rounded-lg">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue Clients</p>
              <h3 className="text-2xl font-bold">{currentStatus.overdue}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

