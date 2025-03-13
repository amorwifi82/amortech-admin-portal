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

type Debt = {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'paid';
  collected_amount: number;
  created_at: string;
  client: {
    name: string;
  };
};

const DebtPage = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDebts = async () => {
    try {
      const { data: debtsData, error } = await supabase
        .from('debts')
        .select(`
          *,
          client:clients(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDebts(debtsData || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch debts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (debtId: string) => {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ 
          status: 'paid',
          collected_amount: debts.find(d => d.id === debtId)?.amount || 0
        })
        .eq('id', debtId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Debt marked as paid',
      });

      // Update local state
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === debtId 
            ? { ...debt, status: 'paid', collected_amount: debt.amount } 
            : debt
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

  const handlePartialPayment = async (debtId: string, amount: number) => {
    try {
      const debt = debts.find(d => d.id === debtId);
      if (!debt) throw new Error('Debt not found');

      const newCollectedAmount = (debt.collected_amount || 0) + amount;
      const newStatus = newCollectedAmount >= debt.amount ? 'paid' : 'partially_paid';

      const { error } = await supabase
        .from('debts')
        .update({ 
          status: newStatus,
          collected_amount: newCollectedAmount
        })
        .eq('id', debtId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      // Update local state
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === debtId 
            ? { ...debt, status: newStatus, collected_amount: newCollectedAmount } 
            : debt
        )
      );
    } catch (error) {
      console.error('Error updating debt:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    fetchDebts();

    const subscription = supabase
      .channel('debts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts',
        },
        () => {
          fetchDebts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const totalDebt = debts
    .filter((debt) => debt.status !== 'paid')
    .reduce((sum, debt) => sum + (debt.amount - (debt.collected_amount || 0)), 0);

  const totalCollected = debts
    .reduce((sum, debt) => sum + (debt.collected_amount || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debt Management</h1>
        <div className="flex gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold">₱{totalDebt.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">₱{totalCollected.toLocaleString()}</p>
          </Card>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : debts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No debts found
                </TableCell>
              </TableRow>
            ) : (
              debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>{debt.client.name}</TableCell>
                  <TableCell>₱{debt.amount.toLocaleString()}</TableCell>
                  <TableCell>₱{(debt.collected_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>₱{(debt.amount - (debt.collected_amount || 0)).toLocaleString()}</TableCell>
                  <TableCell>{new Date(debt.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        debt.status === 'paid'
                          ? 'default'
                          : debt.status === 'partially_paid'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {debt.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {debt.status !== 'paid' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(debt.id)}
                        >
                          Mark as Paid
                        </Button>
                        {debt.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePartialPayment(debt.id, debt.amount * 0.5)}
                          >
                            Record 50% Payment
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default DebtPage; 