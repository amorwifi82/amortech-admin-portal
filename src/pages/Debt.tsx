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
  Loader2,
  ChevronRight,
  Send,
  Plus,
  MessageSquare
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '@/config/settings';

type Client = {
  id: string;
  name: string;
  phone_number: string;
  debt: number;
  due_date: string;
  created_at: string;
  updated_at: string;
};

type Debt = {
  id: string;
  client_id: string;
  amount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  collected_amount: number;
  due_date: string;
  created_at: string;
  reason: string;
  client: {
    id: string;
    name: string;
    phone_number: string;
    due_date: string;
  };
};

// Add WhatsApp icon component for consistency
const WhatsAppIcon = () => (
  <svg className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const SmsIcon = () => (
  <MessageSquare className="h-4 w-4 mr-1 text-blue-500" />
);

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
  const [recordDebtDialog, setRecordDebtDialog] = useState(false);
  const [newDebt, setNewDebt] = useState({
    clientName: '',
    phoneNumber: '',
    amount: '',
    dueDate: '',
    reason: ''
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [showAllUpcomingDialog, setShowAllUpcomingDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [reminderClientId, setReminderClientId] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();
  const [existingClients, setExistingClients] = useState<Client[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [showFailedReminderDialog, setShowFailedReminderDialog] = useState(false);
  const [failedReminderClient, setFailedReminderClient] = useState<{ id: string; phone: string; message: string } | null>(null);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Authentication error:', error.message);
        toast({
          title: 'Authentication Error',
          description: 'Please sign in to access this page',
          variant: 'destructive',
        });
        navigate('/auth/login', { replace: true }); // Using replace to prevent back navigation
        return false;
      }
      
      if (!session) {
        console.log('No active session, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.log('Session refresh failed, redirecting to login...');
          toast({
            title: 'Session Expired',
            description: 'Please sign in again to continue',
            variant: 'destructive',
          });
          navigate('/auth/login', { replace: true });
          return false;
        }
        
        console.log('Session refreshed successfully');
        setSession(refreshedSession);
        setIsAuthenticated(true);
        return true;
      }
      
      console.log('Session active for:', session.user.email);
      setSession(session);
      setIsAuthenticated(true);
      return true;
    } catch (error: any) {
      console.error('Error checking authentication:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify authentication status',
        variant: 'destructive',
      });
      navigate('/auth/login', { replace: true });
      return false;
    }
  };

  const fetchDebts = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching client debts...');
      
      // Get only clients with debt greater than 0
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          phone_number,
          debt,
          due_date,
          created_at
        `)
        .gt('debt', 0) // Only get clients with debt greater than 0
        .order('created_at', { ascending: false });

      if (clientsError) {
        console.error('Error fetching client debts:', clientsError);
        throw clientsError;
      }

      console.log('Raw clients data:', clientsData);
      console.log('Number of clients with debt:', clientsData?.length || 0);

      if (!clientsData || clientsData.length === 0) {
        console.log('No clients with debt found');
        setDebts([]);
        return;
      }

      // Transform client data into debt records
      const validDebts = clientsData
        .map(client => ({
          id: client.id,
          client_id: client.id,
          amount: client.debt || 0,
          status: 'pending',
          collected_amount: 0,
          due_date: client.due_date,
          created_at: client.created_at,
          reason: '',
          client: {
            id: client.id,
            name: client.name,
            phone_number: client.phone_number,
            due_date: client.due_date
          }
        })) as Debt[];

      console.log('Processed client debts:', validDebts);
      console.log('Number of valid debts:', validDebts.length);

      setDebts(validDebts);
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

      // Update client's debt to 0
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          debt: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', debt.client_id);

      if (updateError) {
        console.error('Error updating client debt:', updateError);
        throw new Error('Failed to update client debt');
      }

      // Store payment record in messages
      const messageText = `Full payment of KES ${debt.amount.toLocaleString()} received. Debt fully paid.`;
        
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          client_id: debt.client_id,
          message: messageText,
          sent_at: new Date().toISOString(),
          status: "sent",
          type: "payment_confirmation",
          amount_paid: debt.amount,
          created_at: new Date().toISOString(),
          user_id: session?.user?.id
        });

      if (messageError) {
        console.warn('Error creating message:', messageError);
      }

      toast({
        title: 'Success',
        description: 'Debt marked as paid',
      });

      // Update local state
      setDebts(prevDebts => 
        prevDebts.map(d => 
          d.id === debtId 
            ? { ...d, status: 'paid', collected_amount: d.amount }
            : d
        )
      );

      // Update total collected and collection rate
      const newTotalCollected = totalCollected + debt.amount;
      const newCollectionRate = ((newTotalCollected) / (totalDebt + newTotalCollected)) * 100;

      // Refresh the debts list
      fetchDebts();
    } catch (error: any) {
      console.error('Error updating debt:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update debt status',
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

      const debt = debts.find(d => d.id === paymentDialog.debtId);
      if (!debt) throw new Error('Debt not found');

      if (amount > debt.amount) {
        throw new Error('Payment amount cannot exceed the debt amount');
      }

      const remainingAmount = debt.amount - amount;

      // Update client's debt amount
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          debt: remainingAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', debt.client_id);

      if (updateError) {
        console.error('Error updating client debt:', updateError);
        throw new Error('Failed to update client debt');
      }

      // Store payment record in messages
      const messageText = `Payment of KES ${amount.toLocaleString()} received for additional charges. ${
        remainingAmount > 0 
          ? `Remaining balance: KES ${remainingAmount.toLocaleString()}` 
          : 'Debt fully paid.'
      }`;
        
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          client_id: debt.client_id,
          message: messageText,
          sent_at: new Date().toISOString(),
          status: "sent",
          type: "payment_confirmation",
          amount_paid: amount,
          created_at: new Date().toISOString()
        });

      if (messageError) {
        console.warn('Error creating message:', messageError);
      }

      // Update local state
      setDebts(prevDebts => 
        prevDebts.map(d => 
          d.id === paymentDialog.debtId 
            ? { 
                ...d, 
                status: remainingAmount > 0 ? 'partially_paid' : 'paid',
                collected_amount: (d.collected_amount || 0) + amount,
                amount: remainingAmount
              }
            : d
        )
      );

      toast({
        title: 'Success',
        description: remainingAmount > 0 
          ? 'Partial payment recorded successfully' 
          : 'Full payment recorded successfully'
      });

      handleClosePaymentDialog();
      
      // Refresh the debts list
      fetchDebts();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUpcomingPayments = (limit?: number) => {
    const now = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(now.getDate() + 5);
    
    const upcomingDebts = debts.filter(debt => {
      const dueDate = new Date(debt.due_date);
      return debt.status !== 'paid' && 
             dueDate >= now && 
             dueDate <= fiveDaysFromNow;
    });

    return limit ? upcomingDebts.slice(0, limit) : upcomingDebts;
  };

  const handleSendReminder = async (clientId: string) => {
    const debt = debts.find(d => d.client_id === clientId);
    if (!debt) return;

    await sendReminderMessage(clientId, '');
  };

  const sendReminderMessage = async (clientId: string, reason: string) => {
    if (!reminderMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a reminder message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingReminder(true);
      
      // Get client's phone number
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('phone_number')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Try to send via WhatsApp first
      const phoneNumber = client.phone_number.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(reminderMessage)}`, "_blank");

      // Record the message in the database
      const { error } = await supabase
        .from('messages')
        .insert({
          client_id: clientId,
          message: reminderMessage,
          status: 'sent',
          type: "whatsapp",
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: session?.user?.id
        });

      if (error) {
        // If database recording fails, show confirmation dialog
        setFailedReminderClient({
          id: clientId,
          phone: phoneNumber,
          message: reminderMessage
        });
        setShowFailedReminderDialog(true);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Payment reminder has been sent',
      });

      setReminderMessage('');
      setReminderClientId(null);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to record reminder in database',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleRetryReminder = async () => {
    if (!failedReminderClient) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          client_id: failedReminderClient.id,
          message: failedReminderClient.message,
          status: 'sent',
          type: "whatsapp",
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          user_id: session?.user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminder recorded successfully',
      });
    } catch (error: any) {
      console.error('Error recording reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to record reminder',
        variant: 'destructive',
      });
    } finally {
      setShowFailedReminderDialog(false);
      setFailedReminderClient(null);
    }
  };

  const fetchExistingClients = async () => {
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, phone_number, debt, due_date, created_at, updated_at')
        .order('name');

      if (error) throw error;
      setExistingClients(clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch existing clients',
        variant: 'destructive',
      });
    }
  };

  const handleRecordDebt = async () => {
    try {
      if (isNewClient && (!newDebt.clientName || !newDebt.phoneNumber)) {
        toast({
          title: 'Error',
          description: 'Please fill in all client details',
          variant: 'destructive',
        });
        return;
      }

      if (!isNewClient && !selectedClientId) {
        toast({
          title: 'Error',
          description: 'Please select a client',
          variant: 'destructive',
        });
        return;
      }

      if (!newDebt.amount || !newDebt.dueDate || !newDebt.reason) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      const amount = parseFloat(newDebt.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        return;
      }

      setIsProcessing(true);

      let clientId = selectedClientId;

      if (isNewClient) {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: newDebt.clientName,
            phone_number: newDebt.phoneNumber,
            debt: amount,
            due_date: newDebt.dueDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      } else {
        // Get current client's debt
        const { data: currentClient, error: fetchError } = await supabase
          .from('clients')
          .select('debt')
          .eq('id', selectedClientId)
          .single();

        if (fetchError) throw fetchError;

        // Update existing client's debt by adding the new amount
        const newTotalDebt = (currentClient.debt || 0) + amount;
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            debt: newTotalDebt,
            due_date: newDebt.dueDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedClientId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: 'Debt recorded successfully',
      });

      setRecordDebtDialog(false);
      resetDebtForm();
      fetchDebts();
    } catch (error: any) {
      console.error('Error recording debt:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record debt',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDebtForm = () => {
    setNewDebt({
      clientName: '',
      phoneNumber: '',
      amount: '',
      dueDate: '',
      reason: ''
    });
    setSelectedClientId(null);
    setIsNewClient(false);
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

  useEffect(() => {
    if (recordDebtDialog) {
      fetchExistingClients();
    }
  }, [recordDebtDialog]);

  const filteredDebts = debts.filter(debt => 
    debt.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = debts
    .filter(debt => debt.status !== 'paid')
    .reduce((sum, debt) => sum + (debt.amount - (debt.collected_amount || 0)), 0);

  const totalCollected = debts
    .reduce((sum, debt) => sum + (debt.collected_amount || 0), 0);

  const pendingDebts = debts.filter(debt => debt.status === 'pending');
  const partiallyPaidDebts = debts.filter(debt => debt.status === 'partially_paid');
  const paidDebts = debts.filter(debt => debt.status === 'paid');

  const collectionRate = totalDebt + totalCollected > 0 
    ? (totalCollected / (totalDebt + totalCollected)) * 100 
    : 0;

  const getStatusEmoji = (status: Debt['status']) => {
    switch (status) {
      case 'paid': return '✅';
      case 'partially_paid': return '⏳';
      case 'pending': return '⚠️';
    }
  };

  const formatDueDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getSmsTemplate = (debt: Debt) => {
    return `Dear ${debt.client.name},\n\nThis is a reminder that you have an outstanding balance of KES ${debt.amount.toLocaleString()} due on ${formatDueDate(debt.due_date)}. Please make your payment to avoid any service interruption.\n\nThank you for your cooperation.`;
  };

  const getWhatsAppTemplate = (debt: Debt) => {
    return `*Payment Reminder*\n\nDear ${debt.client.name},\n\nThis is a friendly reminder about your outstanding balance:\n\n💰 Amount: KES ${debt.amount.toLocaleString()}\n📅 Due Date: ${formatDueDate(debt.due_date)}\n\nPlease make your payment to ensure uninterrupted service. If you have already made the payment, kindly ignore this message.\n\nThank you for your business! 🙏`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Debt Management
            <span className="text-xs text-muted-foreground ml-2">v{APP_VERSION}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage client debts</p>
        </div>
        <Button 
          onClick={() => setRecordDebtDialog(true)}
          className="bg-green-500 hover:bg-green-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record New Debt
        </Button>
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
                      <TableHead>Due Date</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Notifications</TableHead>
                      <TableHead>Reason</TableHead>
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
                              <div className={`flex items-center gap-2 ${
                                isOverdue(debt.due_date) && debt.status !== 'paid' 
                                  ? 'text-red-500' 
                                  : ''
                              }`}>
                                <Calendar className="h-4 w-4" />
                                {formatDueDate(debt.due_date)}
                                {isOverdue(debt.due_date) && debt.status !== 'paid' && (
                                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                )}
                              </div>
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
                            <TableCell>{debt.reason}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const template = getSmsTemplate(debt);
                                    setReminderMessage(template);
                                    setReminderClientId(debt.client_id);
                                  }}
                                >
                                  <SmsIcon />
                                  SMS
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const template = getWhatsAppTemplate(debt);
                                    setReminderMessage(template);
                                    setReminderClientId(debt.client_id);
                                  }}
                                >
                                  <WhatsAppIcon />
                                  WhatsApp
                                </Button>
                              </div>
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

      <Card 
        className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => setShowAllUpcomingDialog(true)}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Upcoming Payments
          </h2>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {getUpcomingPayments(3).length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No upcoming payments in the next 5 days
            </div>
          ) : (
            getUpcomingPayments(3).map(debt => (
              <div 
                key={debt.id} 
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{debt.client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDueDate(debt.due_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-red-500">
                      Kshs {debt.amount.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {debt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPaymentDialog(debt.id, debt.amount)}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog 
        open={paymentDialog.isOpen} 
        onOpenChange={handleClosePaymentDialog}
      >
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the amount paid by the client in KES.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Debt Amount:</span>
                <span className="font-medium">KES {paymentDialog.maxAmount?.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount (KES)</label>
                <Input
                  type="number"
                  placeholder="Enter amount in KES"
                  value={paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentAmount(value);
                  }}
                  min={0}
                  max={paymentDialog.maxAmount}
                />
              </div>
              {paymentAmount && !isNaN(parseFloat(paymentAmount)) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining Balance:</span>
                  <span className={`font-medium ${
                    paymentDialog.maxAmount - parseFloat(paymentAmount) > 0 
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    KES {Math.max(0, paymentDialog.maxAmount - parseFloat(paymentAmount)).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {paymentAmount && !isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 && (
                  <p>
                    {paymentDialog.maxAmount - parseFloat(paymentAmount) > 0 
                      ? '⚠️ This will be recorded as a partial payment'
                      : '✅ This will clear the entire debt'}
                  </p>
                )}
              </div>
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
              disabled={
                isProcessing || 
                !paymentAmount || 
                parseFloat(paymentAmount) <= 0 ||
                parseFloat(paymentAmount) > paymentDialog.maxAmount
              }
              variant={paymentDialog.maxAmount - parseFloat(paymentAmount || '0') > 0 
                ? 'secondary'
                : 'default'
              }
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentDialog.maxAmount - parseFloat(paymentAmount || '0') > 0 
                ? 'Record Partial Payment'
                : 'Record Full Payment'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllUpcomingDialog} onOpenChange={setShowAllUpcomingDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-3xl">
          <DialogHeader>
            <DialogTitle>All Upcoming Payments</DialogTitle>
            <DialogDescription>
              Payments due within the next 5 days
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {getUpcomingPayments().map(debt => (
                <div 
                  key={debt.id} 
                  className="flex items-center justify-between p-3 rounded-lg border mb-3"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{debt.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {debt.client.phone_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDueDate(debt.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-medium text-red-500">
                      Kshs {debt.amount.toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPaymentDialog(debt.id, debt.amount)}
                      >
                        Record Payment
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setReminderClientId(debt.client_id)}
                      >
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={reminderClientId !== null} 
        onOpenChange={() => {
          setReminderClientId(null);
          setReminderMessage('');
        }}
      >
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder message to the client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Templates</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const debt = debts.find(d => d.client_id === reminderClientId);
                    if (!debt) return;
                    
                    const template = getSmsTemplate(debt);
                    setReminderMessage(template);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <SmsIcon />
                    SMS Template
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const debt = debts.find(d => d.client_id === reminderClientId);
                    if (!debt) return;
                    
                    const template = getWhatsAppTemplate(debt);
                    setReminderMessage(template);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon />
                    WhatsApp Template
                  </div>
                </Button>
              </div>
              <Textarea
                placeholder="Enter your reminder message..."
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={6}
                className="mt-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReminderClientId(null);
                setReminderMessage('');
              }}
              disabled={sendingReminder}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reminderClientId && handleSendReminder(reminderClientId)}
              disabled={sendingReminder || !reminderMessage.trim()}
            >
              {sendingReminder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={recordDebtDialog} 
        onOpenChange={(open) => {
          setRecordDebtDialog(open);
          if (!open) resetDebtForm();
        }}
      >
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <DialogHeader>
            <DialogTitle>Record New Debt</DialogTitle>
            <DialogDescription>
              Select an existing client or add a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={isNewClient ? "outline" : "default"}
                  onClick={() => setIsNewClient(false)}
                  className="flex-1"
                >
                  Existing Client
                </Button>
                <Button
                  variant={isNewClient ? "default" : "outline"}
                  onClick={() => setIsNewClient(true)}
                  className="flex-1"
                >
                  New Client
                </Button>
              </div>

              {isNewClient ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client Name</label>
                    <Input
                      placeholder="Enter client name"
                      value={newDebt.clientName}
                      onChange={(e) => setNewDebt(prev => ({ ...prev, clientName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      placeholder="Enter phone number"
                      value={newDebt.phoneNumber}
                      onChange={(e) => setNewDebt(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Client</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedClientId || ''}
                    onChange={(e) => {
                      const client = existingClients.find(c => c.id === e.target.value);
                      setSelectedClientId(e.target.value);
                      if (client) {
                        setNewDebt(prev => ({
                          ...prev,
                          clientName: client.name,
                          phoneNumber: client.phone_number
                        }));
                      }
                    }}
                  >
                    <option value="">Select a client...</option>
                    {existingClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.phone_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Debt Amount (KES)</label>
                <Input
                  type="number"
                  placeholder="Enter amount in KES"
                  value={newDebt.amount}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, amount: e.target.value }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={newDebt.dueDate}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, dueDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Debt</label>
                <Textarea
                  placeholder="Enter reason for the debt..."
                  value={newDebt.reason}
                  onChange={(e) => setNewDebt(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRecordDebtDialog(false);
                resetDebtForm();
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordDebt}
              disabled={
                isProcessing || 
                !newDebt.amount || 
                !newDebt.dueDate || 
                (isNewClient ? (!newDebt.clientName || !newDebt.phoneNumber) : !selectedClientId)
              }
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Debt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showFailedReminderDialog} 
        onOpenChange={setShowFailedReminderDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Failed to Record Reminder</DialogTitle>
            <DialogDescription>
              The message was sent to the client's WhatsApp but failed to record in the database. Would you like to retry recording the reminder?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFailedReminderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetryReminder}
            >
              Retry Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtPage; 