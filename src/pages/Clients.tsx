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
import { ChevronUp, ChevronDown, Pencil, Trash2, Power, MessageCircle } from "lucide-react";
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
  const { toast } = useToast();
  const [sortField, setSortField] = useState<'name' | 'amount_paid' | 'due_date' | 'status' | null>(null);
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
          const dueDate = new Date(client.due_date);
          const today = new Date();
          
          dueDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          
          const daysDifference = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDifference <= 0 && client.status === "Paid") {
            supabase
              .from("clients")
              .update({ status: "Pending" })
              .eq("id", client.id)
              .then(({ error: updateError }) => {
                if (updateError) {
                  console.error("Error reverting client status:", updateError);
                } else {
                  toast({
                    title: "Status Updated",
                    description: `${client.name}'s payment status has been reset as the due date has passed`,
                  });
                }
              });
            return { ...client, status: "Pending" as ClientStatus };
          }
          return { ...client, status: client.status as ClientStatus };
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
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [searchTerm, clients, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'amount_paid' | 'due_date' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'amount_paid' | 'due_date' | 'status') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const handlePaymentToggle = async (clientId: string, currentStatus: ClientStatus, currentDueDate: string) => {
    try {
      let newStatus: ClientStatus;
      let updates: any = {};
      const currentDate = new Date();
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
        
        if (currentStatus === "Suspended") {
          const nextDueDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            currentDate.getDate()
          );
          updates.due_date = nextDueDate.toISOString().split('T')[0];
        } else {
          const nextDueDate = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth() + 1,
            dueDate.getDate()
          );
          updates.due_date = nextDueDate.toISOString().split('T')[0];
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
      const newStatus: ClientStatus = currentStatus === "Suspended" ? "Pending" : "Suspended";
      
      const { error } = await supabase
        .from("clients")
        .update({ status: newStatus })
        .eq("id", clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Client ${newStatus === "Suspended" ? "suspended" : "activated"}`,
      });
    } catch (error: any) {
      console.error("Error toggling suspension:", error);
      toast({
        title: "Error",
        description: "Failed to update suspension status",
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

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case "Paid":
        return "bg-green-500 hover:bg-green-600";
      case "Suspended":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-400 hover:bg-gray-500";
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
                      Name {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount_paid')}
                  >
                    <div className="flex items-center gap-1">
                      Amount {getSortIcon('amount_paid')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('due_date')}
                  >
                    <div className="flex items-center gap-1">
                      Due Date {getSortIcon('due_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Is Suspended</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Comm</TableHead>
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
                    <TableCell>KES {client.amount_paid}</TableCell>
                    <TableCell>{formatDate(client.due_date)}</TableCell>
                    <TableCell>{client.status}</TableCell>
                    <TableCell>
                      <Switch
                        checked={client.status === "Paid"}
                        onCheckedChange={() => handlePaymentToggle(client.id, client.status, client.due_date)}
                        className={
                          client.status === "Paid"
                            ? "bg-green-500 hover:bg-green-600"
                            : client.status === "Suspended"
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
                            client.status === "Suspended"
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <ClientDialog 
                          mode="edit" 
                          client={client} 
                          onSuccess={handleRefresh}
                        >
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ClientDialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setClientToDelete(client.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MessageDialog client={client}>
                        <Button variant="ghost" size="icon">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </MessageDialog>
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
                <Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                </Fragment>
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
              Enter admin password to delete this client. This action cannot be undone.
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
    </div>
  );
};

export default Clients;
