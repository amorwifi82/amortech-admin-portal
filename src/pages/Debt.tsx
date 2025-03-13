import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Search,
  Loader2
} from 'lucide-react';

type Debt = {
  id: string;
  client_id: string;
  amount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  created_at: string;
  client: {
    id: string;
    name: string;
    phone_number: string;
    amount_paid: number;
    status: string;
  };
};

const DebtPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentDialog, setPaymentDialog] = useState<{
    isOpen: boolean;
    debtId: string | null;
    maxAmount: number;
  }>({
    isOpen: false,
    debtId: null,
    maxAmount: 0
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchDebts = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching debts from clients...');
      
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone_number,
          amount_paid,
          status,
          created_at
        `)
        .neq('status', 'Paid')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients with debt:', error);
        throw error;
      }

      console.log('Clients with unpaid status:', clientsData);

      if (!clientsData || clientsData.length === 0) {
        console.log('No clients with debt found');
        setDebts([]);
        return;
      }

      // Transform clients data into debt records
      const transformedData = clientsData.map(client => ({
        id: client.id, // Using client id as debt id
        client_id: client.id,
        amount: client.amount_paid, // Using amount_paid as the debt amount
        status: client.status === 'Paid' ? 'paid' : 
                client.status === 'Partially Paid' ? 'partially_paid' : 'pending',
        created_at: client.created_at,
        client: {
          id: client.id,
          name: client.name,
          phone_number: client.phone_number,
          amount_paid: client.amount_paid,
          status: client.status
        }
      })) as Debt[];

      console.log('Transformed debt data:', transformedData);
      setDebts(transformedData);
    } catch (error: any) {
      console.error('Detailed error fetching debts:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: 'Error',
        description: `Failed to fetch debts: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (debtId: string) => {
    try {
      const debt = debts.find(d => d.id === debtId);
      if (!debt) throw new Error('Debt not found');

      const { error } = await supabase
        .from('debts')
        .update({ 
          status: 'paid'
        })
        .eq('id', debtId);

      if (error) throw error;

      // Update client's amount_paid
      const { error: clientError } = await supabase
        .from('clients')
        .update({ 
          amount_paid: debt.client.amount_paid + debt.amount
        })
        .eq('id', debt.client_id);

      if (clientError) throw clientError;

      toast({
        title: 'Success',
        description: 'Debt marked as paid',
      });

      // Update local state
      setDebts((prevDebts) =>
        prevDebts.map((d) =>
          d.id === debtId 
            ? { 
                ...d, 
                status: 'paid',
                client: {
                  ...d.client,
                  amount_paid: d.client.amount_paid + d.amount
                }
              } 
            : d
        )
      );
    } catch (error) {
      console.error('Error updating debt:', error);
      toast({
        title: 'Error',
        description: 'Failed to update debt status',
        variant: 'destructive',
      });
    }
  };

  const handleOpenPaymentDialog = (debtId: string, maxAmount: number) => {
    setPaymentDialog({
      isOpen: true,
      debtId,
      maxAmount
    });
    setPaymentAmount('');
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialog({
      isOpen: false,
      debtId: null,
      maxAmount: 0
    });
    setPaymentAmount('');
  };

  const handlePartialPayment = async () => {
    if (!paymentDialog.debtId || !paymentAmount) return;

    try {
      setIsProcessing(true);
      const amount = parseFloat(paymentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount > paymentDialog.maxAmount) {
        throw new Error('Payment amount cannot exceed the debt amount');
      }

      const debt = debts.find(d => d.id === paymentDialog.debtId);
      if (!debt) throw new Error('Debt not found');

      // Update client's amount_paid and status
      const { error: clientError } = await supabase
        .from('clients')
        .update({ 
          amount_paid: debt.client.amount_paid + amount,
          status: amount === paymentDialog.maxAmount ? 'Paid' : 'Partially Paid'
        })
        .eq('id', debt.client_id);

      if (clientError) throw clientError;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully'
      });

      // Update local state
      setDebts(prevDebts =>
        prevDebts.map(d =>
          d.id === paymentDialog.debtId 
            ? {
                ...d,
                status: amount === paymentDialog.maxAmount ? 'paid' : 'partially_paid',
                client: {
                  ...d.client,
                  amount_paid: d.client.amount_paid + amount,
                  status: amount === paymentDialog.maxAmount ? 'Paid' : 'Partially Paid'
                }
              }
            : d
        )
      );

      handleClosePaymentDialog();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Update the subscription to watch clients table instead
  useEffect(() => {
    console.log('Setting up debt subscriptions...');
    fetchDebts();

    const subscription = supabase
      .channel('clients-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          console.log('Client change detected:', payload);
          fetchDebts();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription...');
      subscription.unsubscribe();
    };
  }, []);

  const filteredDebts = debts.filter(debt => 
    debt.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = debts
    .filter((debt) => debt.status !== 'paid')
    .reduce((sum, debt) => sum + debt.amount, 0);

  const totalCollected = debts
    .filter((debt) => debt.status === 'paid')
    .reduce((sum, debt) => sum + debt.amount, 0);

  const pendingDebts = debts.filter(debt => debt.status === 'pending');
  const partiallyPaidDebts = debts.filter(debt => debt.status === 'partially_paid');
  const paidDebts = debts.filter(debt => debt.status === 'paid');

  const collectionRate = totalDebt > 0 
    ? (totalCollected / (totalDebt + totalCollected)) * 100 
    : 100;

  const getStatusEmoji = (status: Debt['status']) => {
    switch (status) {
      case 'paid': return '✅';
      case 'partially_paid': return '⏳';
      case 'pending': return '⚠️';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Debt Management
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage client debts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <DollarSign className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold">Kshs {totalDebt.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold">Kshs {totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-4">
            <TrendingUp className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{collectionRate.toFixed(1)}%</p>
                <Progress value={collectionRate} className="h-2" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Debtors</p>
              <p className="text-2xl font-bold">{debts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Debts ({debts.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            ⚠️ Pending ({pendingDebts.length})
          </TabsTrigger>
          <TabsTrigger value="partial">
            ⏳ Partially Paid ({partiallyPaidDebts.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            ✅ Paid ({paidDebts.length})
          </TabsTrigger>
        </TabsList>

        {['all', 'pending', 'partial', 'paid'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Debt Amount</TableHead>
                      <TableHead>Client Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            Loading debts...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredDebts.filter(debt => 
                      tab === 'all' || 
                      (tab === 'pending' && debt.status === 'pending') ||
                      (tab === 'partial' && debt.status === 'partially_paid') ||
                      (tab === 'paid' && debt.status === 'paid')
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-8 w-8" />
                            <p>No debts found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDebts
                        .filter(debt => 
                          tab === 'all' || 
                          (tab === 'pending' && debt.status === 'pending') ||
                          (tab === 'partial' && debt.status === 'partially_paid') ||
                          (tab === 'paid' && debt.status === 'paid')
                        )
                        .map((debt) => (
                          <TableRow key={debt.id}>
                            <TableCell className="font-medium">{debt.client.name}</TableCell>
                            <TableCell>{debt.client.phone_number}</TableCell>
                            <TableCell>
                              <div className="font-medium text-red-500">
                                Kshs {debt.amount.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {debt.client.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  debt.status === 'paid'
                                    ? 'default'
                                    : debt.status === 'partially_paid'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className="flex w-fit items-center gap-1"
                              >
                                {getStatusEmoji(debt.status)}
                                {debt.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="space-x-2">
                              {debt.status !== 'paid' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkAsPaid(debt.id)}
                                    className="bg-green-500 hover:bg-green-600"
                                  >
                                    ✅ Mark as Paid
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenPaymentDialog(debt.id, debt.amount)}
                                  >
                                    ⏳ Record Payment
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={paymentDialog.isOpen} onOpenChange={handleClosePaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the amount paid by the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min={0}
                max={paymentDialog.maxAmount}
              />
              <p className="text-sm text-muted-foreground">
                Maximum amount: Kshs {paymentDialog.maxAmount?.toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClosePaymentDialog}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePartialPayment}
              disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtPage; 