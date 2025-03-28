import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientStatus } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import StatsDialog from "@/components/dashboard/StatsDialog";
import MessageDialog from "@/components/clients/MessageDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PaymentActivity {
  id: string;
  client_name: string;
  amount: number;
  created_at: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientStats, setClientStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    suspended: 0,
    revenue: 0,
    overdue: 0,
    active: 0,
  });
  const [recentActivities, setRecentActivities] = useState<PaymentActivity[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDialog, setSelectedDialog] = useState<"total" | "overdue" | "active" | "upcoming" | null>(null);
  const [dialogClients, setDialogClients] = useState<Client[]>([]);

  const fetchClientStats = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedClients = (data || []).map(client => {
        // Check if client should be reverted to unpaid
        const dueDate = new Date(client.due_date);
        const today = new Date();
        const daysDifference = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const status = client.status as ClientStatus;
        if (daysDifference <= 10 && status === "Paid") {
          // Calculate next due date maintaining the same day of the month
          const nextDueDate = new Date(dueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          
          // Automatically revert to pending if within 10 days of due date
          supabase
            .from("clients")
            .update({ 
              status: "Pending" as ClientStatus,
              due_date: nextDueDate.toISOString().split('T')[0]
            })
            .eq("id", client.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error("Error reverting client status:", updateError);
              } else {
                toast({
                  title: "Status Updated",
                  description: `${client.name}'s payment status has been reset for next billing cycle`,
                });
              }
            });
          return { ...client, status: "Pending" as ClientStatus };
        }
        return { ...client, status };
      });

      const stats = (typedClients as Client[]).reduce(
        (acc, client) => ({
          total: acc.total + 1,
          paid: acc.paid + (client.status === 'Paid' ? 1 : 0),
          pending: acc.pending + (client.status === 'Pending' ? 1 : 0),
          overdue: acc.overdue + (client.status === 'Overdue' ? 1 : 0),
          revenue: acc.revenue + (client.amount_paid || 0),
        }),
        { total: 0, paid: 0, pending: 0, overdue: 0, revenue: 0 }
      );

      const updatedStats = {
        ...stats,
        active: stats.paid + stats.pending,
      };

      setClientStats(updatedStats);

      const { data: activities, error: activitiesError } = await supabase
        .from('clients')
        .select('id, name, amount_paid, updated_at')
        .eq('status', 'Paid')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (activitiesError) throw activitiesError;

      setRecentActivities(
        activities.map(activity => ({
          id: activity.id,
          client_name: activity.name,
          amount: activity.amount_paid,
          created_at: activity.updated_at,
        }))
      );

      const { data: upcoming, error: upcomingError } = await supabase
        .from('clients')
        .select('*')
        .order('due_date', { ascending: true });

      if (upcomingError) throw upcomingError;

      // Filter clients with due dates within 5 days before and after current date
      const now = new Date();
      const fiveDaysAgo = new Date();
      const fiveDaysFromNow = new Date();
      fiveDaysAgo.setDate(now.getDate() - 5);
      fiveDaysFromNow.setDate(now.getDate() + 5);

      const upcomingClients = (upcoming as Client[])
        .filter(client => {
          const dueDate = new Date(client.due_date);
          return dueDate >= fiveDaysAgo && dueDate <= fiveDaysFromNow;
        })
        .sort((a, b) => {
          const dateA = new Date(a.due_date);
          const dateB = new Date(b.due_date);
          return dateA.getTime() - dateB.getTime();
        });

      // Show up to 20 clients in the preview card
      setUpcomingPayments(upcomingClients.slice(0, 20));
      
      // Store all upcoming clients for the dialog
      setDialogClients(upcomingClients);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientStats();

    const subscription = supabase
      .channel('clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, 
        () => {
          fetchClientStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleCardClick = async (type: "total" | "overdue" | "active" | "upcoming") => {
    try {
      if (type === "upcoming") {
        // For upcoming payments, we already have the filtered clients
        setSelectedDialog(type);
        return;
      }

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*');

      if (error) throw error;

      let filteredClients = [];
      switch (type) {
        case "total":
          filteredClients = clients;
          break;
        case "overdue":
          filteredClients = clients.filter(client => client.status === "Suspended");
          break;
        case "active":
          filteredClients = clients.filter(client => 
            client.status === "Paid" || client.status === "Pending"
          );
          break;
      }

      setDialogClients(filteredClients);
      setSelectedDialog(type);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load client data",
        variant: "destructive",
      });
    }
  };

  const stats = [
    {
      title: "Total Clients",
      value: clientStats.total.toString(),
      emoji: "👥",
      trend: "Updated in real-time",
      color: "#0891b2",
      bgColor: "bg-cyan-50",
      type: "total" as const,
    },
    {
      title: "Monthly Revenue",
      value: `KES ${clientStats.revenue.toLocaleString()}`,
      emoji: "💵",
      trend: "Total collected",
      color: "#059669",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Overdue Payments",
      value: clientStats.overdue.toString(),
      emoji: "⚠️",
      trend: "Requires attention",
      color: "#dc2626",
      bgColor: "bg-red-50",
      type: "overdue" as const,
    },
    {
      title: "Active Subscriptions",
      value: clientStats.active.toString(),
      emoji: "📈",
      trend: "Currently active",
      color: "#7c3aed",
      bgColor: "bg-violet-50",
      type: "active" as const,
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <nav className="space-y-4">
              {/* Add your navigation items here */}
            </nav>
          </SheetContent>
        </Sheet>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={`p-6 hover-card glass-card ${stat.bgColor} ${
              stat.type ? 'cursor-pointer' : ''
            } transition-all hover:scale-105`}
            onClick={() => stat.type && handleCardClick(stat.type)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{stat.emoji}</span>
              <span className="text-sm text-muted-foreground">{stat.trend}</span>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
            <p className="text-muted-foreground">{stat.title}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 glass-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">New payment received</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.client_name} - KES {activity.amount.toLocaleString()}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recent payment activities
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 glass-card hover:bg-accent/50 cursor-pointer transition-all hover:scale-105"
          onClick={() => setSelectedDialog("upcoming")}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Upcoming Payments</h3>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {upcomingPayments.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: KES {client.amount_paid.toLocaleString()} - {new Date(client.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageDialog client={client} />
                    <span className="text-sm text-amber-500">Pending</span>
                  </div>
                </div>
              ))}
              {upcomingPayments.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No upcoming payments
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <StatsDialog
        open={selectedDialog !== null}
        onOpenChange={() => setSelectedDialog(null)}
        title={
          selectedDialog === "total"
            ? "All Clients"
            : selectedDialog === "overdue"
            ? "Overdue Payments"
            : selectedDialog === "upcoming"
            ? "Upcoming Payments"
            : "Active Subscriptions"
        }
        description={
          selectedDialog === "total"
            ? "List of all registered clients"
            : selectedDialog === "overdue"
            ? "Clients with pending payments"
            : selectedDialog === "upcoming"
            ? "Payments due in the next few days"
            : "Clients with active subscriptions"
        }
        clients={selectedDialog === "upcoming" ? upcomingPayments : dialogClients}
        type={selectedDialog || "total"}
      />
    </div>
  );
};

export default Dashboard;
