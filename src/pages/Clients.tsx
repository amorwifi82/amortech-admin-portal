import { useEffect, useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientStatus } from "@/lib/supabase";
import ClientDialog from "@/components/clients/ClientDialog";
import BatchOperationsDialog from "@/components/clients/BatchOperationsDialog";
import ImportContactsButton from "@/components/clients/ImportContactsButton";
import ExportButton from "@/components/clients/ExportButton";
import { ChevronUp, ChevronDown, DollarSign, Users, Search, Power } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MessageDialog from "@/components/clients/MessageDialog";
import DebtManagementDialog from "@/components/clients/DebtManagementDialog";

const PAGE_SIZES = [10, 20, 50, 100];

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previousDates, setPreviousDates] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDebtDialog, setShowDebtDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const [sortField, setSortField] = useState<'name' | 'amount_paid' | 'due_date' | 'status' | 'debt' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const typedClients = (data || []).map(client => {
          const rawClient = client as {
            id: string;
            name: string;
            phone_number: string;
            amount_paid: number;
            debt?: number;
            status: string;
            created_at: string;
            updated_at: string;
            due_date: string;
          };

          const typedClient: Client = {
            id: rawClient.id,
            name: rawClient.name,
            phone_number: rawClient.phone_number,
            amount_paid: rawClient.amount_paid,
            debt: rawClient.debt ?? 0,
            status: rawClient.status as ClientStatus,
            created_at: rawClient.created_at,
            updated_at: rawClient.updated_at,
            due_date: rawClient.due_date
          };
          return typedClient;
        });

        setClients(typedClients);
        setFilteredClients(typedClients);
      } catch (error: any) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();

    const subscription = supabase
      .channel("clients")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    const filtered = clients.filter((client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'amount_paid':
            comparison = a.amount_paid - b.amount_paid;
            break;
          case 'due_date':
            comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'debt':
            comparison = a.debt - b.debt;
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [searchTerm, clients, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'amount_paid' | 'due_date' | 'status' | 'debt') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'amount_paid' | 'due_date' | 'status' | 'debt') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const handlePaymentToggle = async (clientId: string, currentStatus: ClientStatus, currentDueDate: string) => {
    try {
      let newStatus: ClientStatus;
      let updates: any = {};
      const dueDate = new Date(currentDueDate);
      
      setPreviousDates(prev => ({
        ...prev,
        [clientId]: currentDueDate
      }));

      if (currentStatus === "Paid") {
        newStatus = "Pending";
        const previousDate = previousDates[clientId];
        if (previousDate) {
          updates.due_date = previousDate;
        }
      } else {
        newStatus = "Paid";
        
        const nextDueDate = new Date(dueDate);
        const currentDay = dueDate.getDate();
        
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const nextMonth = nextDueDate.getMonth();
        nextDueDate.setDate(1);
        nextDueDate.setMonth(nextMonth);
        
        const lastDayOfMonth = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(currentDay, lastDayOfMonth);
        nextDueDate.setDate(targetDay);
        
        updates.due_date = nextDueDate.toISOString().split('T')[0];
        
        // Get current client's debt
        const { data: client, error: fetchError } = await supabase
          .from("clients")
          .select("debt")
          .eq("id", clientId)
          .single();

        if (fetchError) throw fetchError;

        // If client has debt, record it as paid
        if (client.debt > 0) {
          // Store payment record in messages
          const messageText = `Full payment of KES ${client.debt.toLocaleString()} received. Debt fully paid.`;
          
          const { error: messageError } = await supabase
            .from("messages")
            .insert({
              client_id: clientId,
              message: messageText,
              sent_at: new Date().toISOString(),
              status: "sent",
              type: "payment_reminder",
              created_at: new Date().toISOString()
            });

          if (messageError) {
            console.warn('Error creating message:', messageError);
          }

          // Reset debt to 0
          updates.debt = 0;
        }
      }

      updates.status = newStatus;

      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const toggleSuspension = async (clientId: string, currentStatus: ClientStatus) => {
    try {
      const newStatus: ClientStatus = currentStatus === "Overdue" ? "Pending" : "Overdue";
      
      const { error } = await supabase
        .from("clients")
        .update({ status: newStatus })
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Client ${newStatus === "Overdue" ? "marked as overdue" : "activated"}`,
      });
    } catch (error: any) {
      console.error("Error toggling status:", error);
      toast({
        title: "Error",
        description: "Failed to update client status",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(clients.map((client) => client.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (checked: boolean, clientId: string) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, clientId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== clientId));
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || adminPassword !== import.meta.env.VITE_ADMIN_PASSWORD) {
      toast({
        title: "Error",
        description: "Invalid admin password",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      setAdminPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleRefresh = () => {
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const getStatusEmoji = (status: ClientStatus) => {
    switch (status) {
      case "Paid":
        return "✅";
      case "Pending":
        return "⏳";
      case "Overdue":
        return "⚠️";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case "Paid":
        return "text-green-600 bg-green-50";
      case "Pending":
        return "text-yellow-600 bg-yellow-50";
      case "Overdue":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client information and payment status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ImportContactsButton onImport={handleRefresh} />
          <ExportButton clients={filteredClients} />
          <ClientDialog mode="import" onSuccess={handleRefresh} />
          <ClientDialog mode="add" onSuccess={handleRefresh} />
          <BatchOperationsDialog selectedIds={selectedIds} onSuccess={handleRefresh} />
        </div>
      </div>

      <Card className="p-4 h-[calc(100vh-12rem)]">
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select page size" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border h-[calc(100%-5rem)] overflow-hidden">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === currentClients.length}
                      onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      👤 Name {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount_paid')}
                  >
                    <div className="flex items-center gap-1">
                      💰 Amount {getSortIcon('amount_paid')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('debt')}
                  >
                    <div className="flex items-center gap-1">
                      🚨 Debt {getSortIcon('debt')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center gap-1">
                      📅 Due Date {getSortIcon('due_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      ⭐ Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead>💳 Payment</TableHead>
                  <TableHead>⚠️ Is Suspended</TableHead>
                  <TableHead>⚙️ Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={(checked: boolean) =>
                          handleSelectOne(checked, client.id)
                        }
                      />
                    </TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>KES {client.amount_paid.toLocaleString()}</TableCell>
                    <TableCell>
                      {client.debt > 0 ? (
                        <span className="text-red-500">
                          KES {client.debt.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-green-500">No Debt</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(client.due_date)}</TableCell>
                    <TableCell className="font-medium">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(client.status)}`}>
                        <span className="text-xl">{getStatusEmoji(client.status)}</span>
                        <span>{client.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={client.status === "Paid"}
                        onCheckedChange={() => handlePaymentToggle(client.id, client.status, client.due_date)}
                        className={
                          client.status === "Paid"
                            ? "bg-green-500 hover:bg-green-600"
                            : client.status === "Overdue"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gray-400 hover:bg-gray-500"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSuspension(client.id, client.status)}
                      >
                        <Power 
                          className={
                            client.status === "Overdue"
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowMessageDialog(true);
                          }}
                          className="hover:bg-green-50 text-green-600"
                        >
                          <span className="text-xl">💬</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowEditDialog(true);
                          }}
                          className="hover:bg-blue-50 text-blue-600"
                        >
                          <span className="text-xl">✏️</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDebtDialog(true);
                          }}
                          className="hover:bg-purple-50 text-purple-600"
                        >
                          <span className="text-xl">💰</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setClientToDelete(client.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="hover:bg-red-50 text-red-600"
                        >
                          <span className="text-xl">🗑️</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              )
              .map((page, index, array) => (
                <div key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                </div>
              ))}
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
              Please enter the admin password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setClientToDelete(null);
              setAdminPassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedClient && (
        <>
          <MessageDialog client={selectedClient} />
          <ClientDialog
            mode="edit"
            client={selectedClient}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={() => {
              setShowEditDialog(false);
              setSelectedClient(null);
              handleRefresh();
            }}
          />

          <DebtManagementDialog
            client={selectedClient}
            open={showDebtDialog}
            onOpenChange={setShowDebtDialog}
            onSuccess={() => {
              setShowDebtDialog(false);
              setSelectedClient(null);
              handleRefresh();
            }}
          />
        </>
      )}
    </div>
  );
};

export default Clients;
