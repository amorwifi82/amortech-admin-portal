import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

const Expenses = () => {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const { toast } = useToast();

  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching expenses:", error);
        throw error;
      }
      return data as Expense[];
    },
    retry: 1, // Only retry once to avoid too many failed attempts
  });

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase
        .from("expenses")
        .insert([
          {
            description: formData.get("description") as string,
            amount: parseFloat(formData.get("amount") as string),
            category: formData.get("category") as string,
            date: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: "Expense added successfully",
        description: "The expense has been recorded in the system.",
      });

      setIsAddExpenseOpen(false);
      refetch();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading expenses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-red-500">Error loading expenses</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="description">Description</label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Enter expense description"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="amount">Amount</label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="category">Category</label>
                <Select name="category" defaultValue="operational">
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Wallet className="h-10 w-10 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <h3 className="text-2xl font-bold">
                KES {expenses?.reduce((acc, exp) => acc + exp.amount, 0)?.toLocaleString() || "0"}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Receipt className="h-10 w-10 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <h3 className="text-2xl font-bold">
                KES {expenses
                  ?.filter(exp => new Date(exp.date).getMonth() === new Date().getMonth())
                  .reduce((acc, exp) => acc + exp.amount, 0)
                  ?.toLocaleString() || "0"}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
        <div className="space-y-4">
          {expenses?.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString()} - {expense.category}
                </p>
              </div>
              <p className="font-semibold">KES {expense.amount.toLocaleString()}</p>
            </div>
          ))}
          {(!expenses || expenses.length === 0) && (
            <p className="text-center text-muted-foreground">No expenses recorded yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Expenses;