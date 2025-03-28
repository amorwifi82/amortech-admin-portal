import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Archive, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Expense } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface ExpenseFormData {
  description: string;
  amount: number;
  category: string;
  date: string;
}

const EXPENSE_CATEGORIES = [
  "Internet",
  "Equipment",
  "Maintenance",
  "Utilities",
  "Salaries",
  "Marketing",
  "Other",
];

const Expenses = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [archivedExpenses, setArchivedExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("current");
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: 0,
    category: "",
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        
        // Calculate date ranges
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthEnd = endOfMonth(new Date());

        // Fetch current month expenses
        const { data: currentData, error: currentError } = await supabase
          .from("expenses")
          .select("*")
          .gte("date", currentMonthStart.toISOString())
          .lte("date", currentMonthEnd.toISOString())
          .order("date", { ascending: false });

        if (currentError) throw currentError;
        setExpenses(currentData || []);

        // Fetch archived expenses (previous months)
        const { data: archivedData, error: archivedError } = await supabase
          .from("expenses")
          .select("*")
          .lt("date", currentMonthStart.toISOString())
          .order("date", { ascending: false });

        if (archivedError) throw archivedError;
        setArchivedExpenses(archivedData || []);

      } catch (error) {
        console.error("Error fetching expenses:", error);
        toast({
          title: "Error",
          description: "Failed to load expenses",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();

    // Set up real-time subscription
    const subscription = supabase
      .channel('expenses-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'expenses' },
        fetchExpenses
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: 0,
      category: "",
      date: new Date().toISOString().split('T')[0],
    });
    setSelectedExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedExpense) {
        // Update existing expense
        const { error } = await supabase
          .from("expenses")
          .update({
            description: formData.description,
            amount: formData.amount,
            category: formData.category,
            date: formData.date,
          })
          .eq("id", selectedExpense.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
      } else {
        // Create new expense
        const { error } = await supabase.from("expenses").insert([
          {
            description: formData.description,
            amount: formData.amount,
            category: formData.category,
            date: formData.date,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const handleMonthChange = async (date: Date) => {
    try {
      setIsLoading(true);
      setSelectedMonth(date);

      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", monthStart.toISOString())
        .lte("date", monthEnd.toISOString())
        .order("date", { ascending: false });

      if (error) throw error;
      setArchivedExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses for month:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses for selected month",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentMonthTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const selectedMonthTotal = archivedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const renderExpenseTable = (data: Expense[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Amount (KES)</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
            <TableCell>{expense.description}</TableCell>
            <TableCell>{expense.category}</TableCell>
            <TableCell>{expense.amount.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(expense)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(expense.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">
            Manage and track your operational expenses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedExpense ? "Edit Expense" : "Add New Expense"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details for the expense
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  name="category"
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange({
                      target: { name: "category", value },
                    } as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {selectedExpense ? "Update" : "Add"} Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">
            <Calendar className="mr-2 h-4 w-4" />
            Current Month
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-2 h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Current Month Total</h3>
            <div className="text-3xl font-bold text-red-600">
              KES {currentMonthTotal.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total expenses for {format(new Date(), 'MMMM yyyy')}
            </p>
          </Card>

          <Card>
            {renderExpenseTable(expenses)}
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <div className="flex justify-between items-center mb-6">
            <Card className="p-6 flex-1">
              <h3 className="font-semibold mb-4">Selected Month Total</h3>
              <div className="text-3xl font-bold text-red-600">
                KES {selectedMonthTotal.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total expenses for {format(selectedMonth, 'MMMM yyyy')}
              </p>
            </Card>
            
            <div className="ml-4">
              <Select
                value={selectedMonth.toISOString()}
                onValueChange={(value) => handleMonthChange(new Date(value))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = subMonths(new Date(), i + 1);
                    return (
                      <SelectItem key={date.toISOString()} value={date.toISOString()}>
                        {format(date, 'MMMM yyyy')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            {renderExpenseTable(archivedExpenses)}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;