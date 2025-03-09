import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear, format } from "date-fns";
import { TrendingUp, Wallet, ArrowDownCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FinancialSummaryProps {
  selectedYear: string;
}

export const FinancialSummary = ({ selectedYear }: FinancialSummaryProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const clientsSubscription = supabase
      .channel('financial-summary-clients')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['financial-summary', selectedYear] });
          toast({
            title: "Financial Summary Updated",
            description: "Financial data has been updated in real-time",
          });
        }
      )
      .subscribe();

    const expensesSubscription = supabase
      .channel('financial-summary-expenses')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['financial-summary', selectedYear] });
          toast({
            title: "Financial Summary Updated",
            description: "Expense data has been updated in real-time",
          });
        }
      )
      .subscribe();

    return () => {
      clientsSubscription.unsubscribe();
      expensesSubscription.unsubscribe();
    };
  }, [queryClient, selectedYear, toast]);

  const { data: transactions } = useQuery({
    queryKey: ["financial-summary", selectedYear],
    queryFn: async () => {
      const startDate = startOfYear(new Date(parseInt(selectedYear, 10)));
      const endDate = endOfYear(new Date(parseInt(selectedYear, 10)));
      
      const { data: clients, error } = await supabase
        .from("clients")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return clients;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses-summary", selectedYear],
    queryFn: async () => {
      const startDate = startOfYear(new Date(parseInt(selectedYear, 10)));
      const endDate = endOfYear(new Date(parseInt(selectedYear, 10)));
      
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const totalCollected = transactions?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  const netProfit = totalCollected - totalExpenses;

  const monthlyData = Array.from({ length: 12 }, (_, month) => {
    const monthTransactions = transactions?.filter(t => 
      new Date(t.created_at).getMonth() === month
    ) || [];
    
    const monthExpenses = expenses?.filter(e => 
      new Date(e.created_at).getMonth() === month
    ) || [];

    return {
      name: format(new Date(parseInt(selectedYear, 10), month), 'MMM'),
      revenue: monthTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0),
      expenses: monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  });

  const outstandingPayments = 0; // Assuming outstandingPayments is 0

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Financial Overview</h3>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <span className="text-3xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">KES {totalCollected.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-500 rounded-lg">
                <span className="text-3xl">💸</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <h3 className="text-2xl font-bold">KES {totalExpenses.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <span className="text-3xl">📈</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <h3 className="text-2xl font-bold">KES {netProfit.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <h3 className="text-2xl font-bold">KES {outstandingPayments.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#22c55e" 
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="expenses" 
              stroke="#ef4444" 
              name="Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
