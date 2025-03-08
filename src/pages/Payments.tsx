import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import StatsDialog from "@/components/dashboard/StatsDialog";
import type { Client, ClientStatus } from "@/lib/supabase";
import { startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { Wallet, TrendingUp, Receipt } from "lucide-react";
import ExportButton from "@/components/clients/ExportButton"; // Import the ExportButton component

const Payments = () => {
  const [monthlyCollection, setMonthlyCollection] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [showPaidClients, setShowPaidClients] = useState(false);
  const [paidClients, setPaidClients] = useState<Client[]>([]);
  const [recentPayments, setRecentPayments] = useState<Client[]>([]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // Get current month's start and end dates
        const now = new Date();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Fetch all paid clients for current month
        const { data: currentMonthPaid, error: monthError } = await supabase
          .from("clients")
          .select("*")
          .eq("status", "Paid")
          .gte("updated_at", monthStart)
          .lte("updated_at", monthEnd);

        if (monthError) throw monthError;

        // Fetch current month's expenses
        const { data: currentMonthExpenses, error: expensesError } = await supabase
          .from("expenses")
          .select("amount")
          .gte("date", monthStart)
          .lte("date", monthEnd);

        if (expensesError) throw expensesError;

        // Calculate monthly collection
        const monthlyTotal = currentMonthPaid?.reduce((sum, client) => sum + (client.amount_paid || 0), 0) || 0;
        setMonthlyCollection(monthlyTotal);
        
        // Map and explicitly cast the status to ClientStatus
        setPaidClients(currentMonthPaid?.map(client => ({
          ...client,
          status: client.status as ClientStatus,
          debt: client.debt || 0
        })) || []);

        // Calculate monthly expenses
        const monthlyExpenses = currentMonthExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

        // Calculate monthly profit (revenue - expenses)
        setMonthlyProfit(monthlyTotal - monthlyExpenses);

        // Fetch all clients to calculate total revenue and debt
        const { data: allClients, error: totalError } = await supabase
          .from("clients")
          .select("*");

        if (totalError) throw totalError;

        // Calculate total revenue and debt
        const total = allClients?.reduce((sum, client) => sum + (client.amount_paid || 0), 0) || 0;
        const debt = allClients?.reduce((sum, client) => sum + (client.debt || 0), 0) || 0;
        setTotalRevenue(total);
        setTotalDebt(debt);

        // Fetch recent payments (last 5)
        const { data: recent, error: recentError } = await supabase
          .from("clients")
          .select("*")
          .eq("status", "Paid")
          .order("updated_at", { ascending: false })
          .limit(5);

        if (recentError) throw recentError;
        
        setRecentPayments(recent?.map(client => ({
          ...client,
          status: client.status as ClientStatus,
          debt: client.debt || 0
        })) || []);

      } catch (error) {
        console.error("Error fetching payment data:", error);
      }
    };

    fetchPayments();

    // Set up real-time subscription
    const subscription = supabase
      .channel("clients")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, fetchPayments)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Payment Dashboard</h2>
        <ExportButton clients={paidClients} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100" onClick={() => setShowPaidClients(true)}>
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <span className="text-2xl">💵</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Collection</p>
                <h3 className="text-2xl font-bold">KES {monthlyCollection.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground">Click to view paid clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Profit</p>
                <h3 className="text-2xl font-bold">KES {monthlyProfit.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground">After expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground">All time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-500 rounded-lg">
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding Debt</p>
                <h3 className="text-2xl font-bold">KES {totalDebt.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground">All clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
        <div className="space-y-4">
          {recentPayments.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{client.name}</p>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Paid: KES {client.amount_paid.toLocaleString()}
                  </p>
                  {client.debt > 0 && (
                    <p className="text-sm text-red-500">
                      Outstanding: KES {client.debt.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(client.updated_at), { addSuffix: true })}
              </span>
            </div>
          ))}
          {recentPayments.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No recent payments
            </p>
          )}
        </div>
      </Card>

      <StatsDialog
        open={showPaidClients}
        onOpenChange={setShowPaidClients}
        title="Paid Clients This Month"
        description="List of clients who have paid this month"
        clients={paidClients}
        type="total"
      />
    </div>
  );
};

export default Payments;
