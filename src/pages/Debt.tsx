import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';

interface DebtRecord {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'paid';
  created_at: string;
  client_name?: string;
  collected_amount?: number;
}

export default function DebtPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);
  const [collectedAmount, setCollectedAmount] = useState(0);

  useEffect(() => {
    fetchDebts();
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('debt-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts'
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchDebts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchDebts = async () => {
    try {
      const { data: debtsData, error } = await supabase
        .from('debts')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedDebts = debtsData.map(debt => ({
        ...debt,
        client_name: debt.clients?.name
      }));

      setDebts(formattedDebts);
      
      // Calculate totals
      const total = formattedDebts.reduce((sum, debt) => sum + debt.amount, 0);
      const collected = formattedDebts.reduce((sum, debt) => sum + (debt.collected_amount || 0), 0);
      
      setTotalDebt(total);
      setCollectedAmount(collected);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast.error('Failed to fetch debt records');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (debtId: string, amount: number) => {
    try {
      const { data: debt, error: fetchError } = await supabase
        .from('debts')
        .select('amount, collected_amount')
        .eq('id', debtId)
        .single();

      if (fetchError) throw fetchError;

      const newCollectedAmount = (debt.collected_amount || 0) + amount;
      const status = newCollectedAmount >= debt.amount ? 'paid' : 'partially_paid';

      const { error: updateError } = await supabase
        .from('debts')
        .update({
          collected_amount: newCollectedAmount,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', debtId);

      if (updateError) throw updateError;

      toast.success('Payment recorded successfully');
      fetchDebts();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debt Management</h1>
        <Button variant="outline" onClick={fetchDebts}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-2">Total Debt</h3>
          <p className="text-2xl font-bold text-red-500">
            ${totalDebt.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-2">Collected Amount</h3>
          <p className="text-2xl font-bold text-green-500">
            ${collectedAmount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-2">Remaining</h3>
          <p className="text-2xl font-bold text-blue-500">
            ${(totalDebt - collectedAmount).toLocaleString()}
          </p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>{debt.client_name}</TableCell>
                <TableCell>${debt.amount.toLocaleString()}</TableCell>
                <TableCell>${(debt.collected_amount || 0).toLocaleString()}</TableCell>
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-24"
                      min={0}
                      max={debt.amount - (debt.collected_amount || 0)}
                      disabled={debt.status === 'paid'}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value);
                        if (!isNaN(amount)) {
                          handlePayment(debt.id, amount);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={debt.status === 'paid'}
                      onClick={() => {
                        const amount = debt.amount - (debt.collected_amount || 0);
                        handlePayment(debt.id, amount);
                      }}
                    >
                      Pay Full
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
} 