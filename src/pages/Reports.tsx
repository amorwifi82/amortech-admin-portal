import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/lib/supabase";

type Client = Database['public']['Tables']['clients']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Debt = Database['public']['Tables']['debts']['Row'];

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  debt: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface DebtData {
  range: string;
  count: number;
  total: number;
}

const Reports = () => {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days" | "1year">("30days");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [clientStatuses, setClientStatuses] = useState<StatusCount[]>([]);
  const [debtRanges, setDebtRanges] = useState<DebtData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const COLORS = ["#4ade80", "#fbbf24", "#f87171", "#60a5fa", "#c084fc"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        switch (timeRange) {
          case "7days":
            startDate.setDate(now.getDate() - 7);
            break;
          case "30days":
            startDate.setDate(now.getDate() - 30);
            break;
          case "90days":
            startDate.setDate(now.getDate() - 90);
            break;
          case "1year":
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        // Fetch clients data
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .gte("created_at", startDate.toISOString());

        if (clientsError) throw clientsError;
        const clients = clientsData as Client[];

        // Fetch expenses data
        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select("*")
          .gte("date", startDate.toISOString());

        if (expensesError) throw expensesError;
        const expenses = expensesData as Expense[];

        // Fetch debts data
        const { data: debtsData, error: debtsError } = await supabase
          .from("debts")
          .select("*")
          .gte("created_at", startDate.toISOString());

        if (debtsError) throw debtsError;
        const debts = debtsData as Debt[];

        // Process data
        const monthlyStats = processMonthlyData(clients, expenses, debts);
        const statusStats = processClientStatuses(clients);
        const debtStats = processDebtRanges(debts);

        // Calculate totals
        const revenue = clients.reduce((sum, client) => sum + (client.amount_paid || 0), 0);
        const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const debtTotal = debts.reduce((sum, debt) => sum + (debt.amount - (debt.collected_amount || 0)), 0);

        // Update state
        setMonthlyData(monthlyStats);
        setClientStatuses(statusStats);
        setDebtRanges(debtStats);
        setTotalRevenue(revenue);
        setTotalExpenses(expensesTotal);
        setTotalProfit(revenue - expensesTotal);
        setTotalClients(clients.length);
        setActiveClients(clients.filter(c => c.status === "paid").length);
        setTotalDebt(debtTotal);

      } catch (error) {
        console.error("Error fetching report data:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load report data",
          variant: "destructive",
        });
        setMonthlyData([]);
        setClientStatuses([]);
        setDebtRanges([]);
        setTotalRevenue(0);
        setTotalExpenses(0);
        setTotalProfit(0);
        setTotalClients(0);
        setActiveClients(0);
        setTotalDebt(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscriptions
    const clientsSubscription = supabase
      .channel('clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        fetchData
      )
      .subscribe();

    const expensesSubscription = supabase
      .channel('expenses-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        fetchData
      )
      .subscribe();

    const debtsSubscription = supabase
      .channel('debts-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        fetchData
      )
      .subscribe();

    return () => {
      clientsSubscription.unsubscribe();
      expensesSubscription.unsubscribe();
      debtsSubscription.unsubscribe();
    };
  }, [timeRange, toast]);

  const processMonthlyData = (clients: Client[], expenses: Expense[], debts: Debt[]): MonthlyData[] => {
    const monthlyMap = new Map<string, MonthlyData>();

    // Process revenue from clients
    clients.forEach(client => {
      const date = new Date(client.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0, debt: 0 });
      }
      
      const data = monthlyMap.get(monthKey)!;
      data.revenue += client.amount_paid || 0;
    });

    // Process expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0, debt: 0 });
      }
      
      const data = monthlyMap.get(monthKey)!;
      data.expenses += expense.amount;
    });

    // Process debts
    debts.forEach(debt => {
      const date = new Date(debt.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0, debt: 0 });
      }
      
      const data = monthlyMap.get(monthKey)!;
      data.debt += debt.amount - (debt.collected_amount || 0);
    });

    // Calculate profit and sort by date
    return Array.from(monthlyMap.values())
      .map(data => ({
        ...data,
        profit: data.revenue - data.expenses
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(" ");
        const [monthB, yearB] = b.month.split(" ");
        return new Date(`${monthA} 20${yearA}`).getTime() - new Date(`${monthB} 20${yearB}`).getTime();
      });
  };

  const processClientStatuses = (clients: Client[]): StatusCount[] => {
    const statusMap = new Map<string, number>();
    
    clients.forEach(client => {
      const count = statusMap.get(client.status) || 0;
      statusMap.set(client.status, count + 1);
    });

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count
    }));
  };

  const processDebtRanges = (debts: Debt[]): DebtData[] => {
    const ranges = [
      { min: 0, max: 0, label: "No Debt" },
      { min: 1, max: 1000, label: "0-1,000" },
      { min: 1001, max: 5000, label: "1,001-5,000" },
      { min: 5001, max: 10000, label: "5,001-10,000" },
      { min: 10001, max: Infinity, label: "10,000+" }
    ];

    const debtData = ranges.map(range => ({
      range: range.label,
      count: 0,
      total: 0
    }));

    debts.forEach(debt => {
      const remainingDebt = debt.amount - (debt.collected_amount || 0);
      const rangeIndex = ranges.findIndex(range => 
        remainingDebt >= range.min && remainingDebt <= range.max
      );
      
      if (rangeIndex !== -1) {
        debtData[rangeIndex].count++;
        debtData[rangeIndex].total += remainingDebt;
      }
    });

    return debtData;
  };

  const handleExport = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Add sheets
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(monthlyData),
        "Monthly Data"
      );
      
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(clientStatuses),
        "Client Statuses"
      );
      
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(debtRanges),
        "Debt Analysis"
      );

      // Add summary sheet
      const summary = [{
        "Total Revenue": totalRevenue,
        "Total Expenses": totalExpenses,
        "Total Profit": totalProfit,
        "Total Clients": totalClients,
        "Active Clients": activeClients,
        "Total Debt": totalDebt
      }];
      
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summary),
        "Summary"
      );

      // Export the file
      XLSX.writeFile(workbook, `financial_report_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Success",
        description: "Report exported successfully",
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Financial Reports</h2>
          <p className="text-muted-foreground">
            View real-time financial metrics and client statistics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={timeRange}
            onValueChange={(value: "7days" | "30days" | "90days" | "1year") => setTimeRange(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Revenue</h3>
          <div className="text-3xl font-bold text-green-600">
            KES {totalRevenue.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total revenue from all clients
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Expenses</h3>
          <div className="text-3xl font-bold text-red-600">
            KES {totalExpenses.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total operational expenses
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Net Profit</h3>
          <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            KES {totalProfit.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Revenue minus expenses
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Clients</h3>
          <div className="text-3xl font-bold">
            {activeClients}/{totalClients}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Active clients / Total clients
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Outstanding Debt</h3>
          <div className="text-3xl font-bold text-yellow-600">
            KES {totalDebt.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total outstanding debt
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Collection Rate</h3>
          <div className="text-3xl font-bold text-blue-600">
            {totalClients ? Math.round((activeClients / totalClients) * 100) : 0}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Percentage of paying clients
          </p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Revenue vs Expenses</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#4ade80" name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#f87171" name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#60a5fa" name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Client Status Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientStatuses}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {clientStatuses.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h3 className="font-semibold mb-4">Debt Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis yAxisId="left" orientation="left" stroke="#4ade80" />
                <YAxis yAxisId="right" orientation="right" stroke="#f87171" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Number of Clients" fill="#4ade80" />
                <Bar yAxisId="right" dataKey="total" name="Total Debt (KES)" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
