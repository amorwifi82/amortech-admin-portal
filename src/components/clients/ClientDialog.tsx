import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { FileUp, Plus, Pencil, Loader2 } from "lucide-react";
import type { ClientStatus } from "@/lib/supabase";

interface ClientDialogProps {
  mode: "add" | "import" | "edit";
  onSuccess: () => void;
  children?: ReactNode;
  client?: {
    id: string;
    name: string;
    phone_number: string;
    amount_paid: number;
    due_date: string;
    status: ClientStatus;
  };
}

const validateKenyanPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle numbers starting with 0
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Handle numbers starting with 7 or 1
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // Validate the final format
  const kenyanRegex = /^\+254[17]\d{8}$/;
  if (!kenyanRegex.test(cleaned)) {
    throw new Error('Invalid Kenyan phone number format. Must be +254 followed by a valid 9-digit number starting with 7 or 1');
  }
  
  return cleaned;
};

const ClientDialog = ({ mode, onSuccess, children, client }: ClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const [clientData, setClientData] = useState({
    name: "",
    phone_number: "",
    amount_paid: 0,
    due_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (client && mode === "edit") {
      setClientData({
        name: client.name,
        phone_number: client.phone_number,
        amount_paid: client.amount_paid,
        due_date: client.due_date,
      });
    }
  }, [client, mode]);

  const validateClientData = (data: Record<string, any>) => {
    console.log('Validating row data:', data);

    // Check if the row is empty or contains only metadata
    const hasValidData = Object.entries(data).some(([key, value]) => {
      return !key.startsWith('__') && 
             value !== null && 
             value !== undefined && 
             value !== '' &&
             value !== false;
    });

    if (!hasValidData) {
      console.log('Skipping empty or metadata-only row');
      return null;
    }

    // Find the name field with stricter validation
    let name = '';
    const nameFields = ['name', 'Name', 'CLIENT_NAME', 'client_name', 'fullname', 'full_name', 'Client', 'PPPOE'];
    
    for (const field of nameFields) {
      if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
        name = String(data[field]).trim();
        console.log(`Found name in field "${field}":`, name);
        break;
      }
    }
    
    if (!name) {
      const possibleNameFields = Object.entries(data).filter(([key, value]) => 
        typeof value === 'string' && 
        value.trim() !== '' &&
        !key.toLowerCase().includes('phone') &&
        !key.toLowerCase().includes('amount') &&
        !key.toLowerCase().includes('date') &&
        !key.toLowerCase().includes('email') &&
        !key.toLowerCase().includes('address') &&
        !key.startsWith('__')
      );
      
      if (possibleNameFields.length > 0) {
        name = String(possibleNameFields[0][1]).trim();
        console.log('Found potential name in field:', possibleNameFields[0][0], name);
      }
    }
    
    if (!name || name.trim().length < 2) {
      throw new Error('Name is required and must be at least 2 characters long');
    }

    // Validate and format phone number
    let phoneNumber = '';
    const phoneFields = [
      'phone', 'Phone', 'PHONE', 'phone_number', 'PhoneNumber', 
      'contact', 'Contact', 'Mobile', 'mobile', 'Tel', 'tel', 
      'Telephone', 'telephone', 'Phone Number', 'Contact Number',
      'Mobile Number', 'cell', 'Cell', 'Number'
    ];
    
    for (const field of phoneFields) {
      if (data[field]) {
        try {
          const rawPhone = String(data[field]).trim();
          phoneNumber = validateKenyanPhoneNumber(rawPhone);
          console.log(`Validated phone number in field "${field}":`, phoneNumber);
          break;
        } catch (error) {
          console.log(`Invalid phone number in field "${field}"`, error);
          continue;
        }
      }
    }
    
    if (!phoneNumber) {
      throw new Error('Valid Kenyan phone number is required');
    }

    // Find amount paid with improved validation
    let amountPaid = 0;
    const amountFields = ['amount', 'Amount', 'amount_paid', 'AmountPaid', 'payment', 'Payment', 'Amount Paid', 'DUE'];
    
    for (const field of amountFields) {
      if (data[field] !== undefined && data[field] !== null) {
        const cleanAmount = String(data[field]).replace(/[^\d.-]/g, '');
        const parsedAmount = parseFloat(cleanAmount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amountPaid = parsedAmount;
          console.log(`Found valid amount in field "${field}":`, amountPaid);
          break;
        }
      }
    }

    if (amountPaid <= 0) {
      throw new Error('Amount paid must be greater than 0');
    }

    // Handle due date with current month and year
    let dueDate = '';
    const dateFields = ['due_date', 'DueDate', 'date', 'Date', 'Due date', 'Day', 'day', 'DUE_DATE'];
    const currentDate = new Date();
    
    for (const field of dateFields) {
      if (data[field]) {
        const value = data[field];
        
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          const day = parseInt(String(value));
          if (day >= 1 && day <= 31) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            dueDate = date.toISOString().split('T')[0];
            console.log(`Created due date from day number:`, dueDate);
            break;
          }
        }
        
        if (value instanceof Date) {
          dueDate = value.toISOString().split('T')[0];
          break;
        }
        
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate.toISOString().split('T')[0];
          break;
        }
      }
    }
    
    if (!dueDate) {
      dueDate = currentDate.toISOString().split('T')[0];
      console.log('Using current date as due date:', dueDate);
    }

    return {
      name: name.trim(),
      phone_number: phoneNumber.trim(),
      amount_paid: amountPaid,
      due_date: dueDate,
      status: 'Pending' as ClientStatus,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          let jsonData;

          if (file.name.endsWith('.csv')) {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(sheet);
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(sheet);
          } else {
            throw new Error('Unsupported file format. Please use CSV or Excel files.');
          }

          if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('No valid data found in the file');
          }

          const validatedData = [];
          for (const row of jsonData) {
            try {
              const validatedRow = validateClientData(row);
              if (validatedRow) {
                validatedData.push(validatedRow);
              }
            } catch (error: any) {
              console.error('Row validation error:', error, row);
              throw new Error(`Row validation failed: ${error.message}`);
            }
          }

          if (validatedData.length === 0) {
            throw new Error('No valid client data found in the file');
          }

          setPreviewData(validatedData);
          setShowPreview(true);
        } catch (error: any) {
          console.error("Error processing file:", error);
          throw error;
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      console.error("Error importing clients:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from("clients").insert(previewData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${previewData.length} clients successfully`,
      });
      setOpen(false);
      setShowPreview(false);
      setPreviewData([]);
      onSuccess();
    } catch (error: any) {
      console.error("Error importing clients:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const validatedData = validateClientData(clientData);

      if (mode === "edit" && client) {
        const { error } = await supabase
          .from("clients")
          .update(validatedData)
          .eq("id", client.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        const { error } = await supabase.from("clients").insert([validatedData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Client added successfully",
        });
      }

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneInput = async () => {
    try {
      // @ts-ignore - Contacts API types not in TypeScript
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['tel'];
        const opts = { multiple: false };
        
        // @ts-ignore - Contacts API
        const contacts = await navigator.contacts.select(props, opts);
        
        if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
          try {
            const validatedNumber = validateKenyanPhoneNumber(contacts[0].tel[0]);
            setClientData(prev => ({
              ...prev,
              phone_number: validatedNumber
            }));
          } catch (error: any) {
            toast({
              title: "Invalid Phone Number",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Error accessing contacts:", error);
      toast({
        title: "Error",
        description: "Could not access contacts",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={mode === "import" ? "outline" : "default"}>
            {mode === "import" ? (
              <>
                <FileUp className="mr-2" />
                Import Clients
              </>
            ) : mode === "edit" ? (
              <>
                <Pencil className="mr-2" />
                Edit Client
              </>
            ) : (
              <>
                <Plus className="mr-2" />
                Add Client
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "import" 
              ? "Import Clients" 
              : mode === "edit" 
                ? "Edit Client"
                : "Add New Client"
            }
          </DialogTitle>
          <DialogDescription>
            {mode === "import"
              ? "Upload an Excel or CSV file with client data"
              : "Enter the client's details below"}
          </DialogDescription>
        </DialogHeader>

        {mode === "import" ? (
          <div className="grid gap-4 py-4">
            {!showPreview ? (
              <>
                <Label htmlFor="file">Excel or CSV File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <Label>Preview Data ({previewData.length} clients)</Label>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-4">
                    {previewData.map((client, index) => (
                      <div key={index} className="space-y-2 border-b pb-2">
                        <div><strong>Name:</strong> {client.name}</div>
                        <div><strong>Phone:</strong> {client.phone_number}</div>
                        <div><strong>Amount:</strong> {client.amount_paid}</div>
                        <div><strong>Due Date:</strong> {client.due_date}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewData([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import {previewData.length} Clients
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={clientData.name}
                  onChange={(e) =>
                    setClientData({ ...clientData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    value={clientData.phone_number}
                    onChange={(e) =>
                      setClientData({ ...clientData, phone_number: e.target.value })
                    }
                    required
                  />
                  {'contacts' in navigator && 'ContactsManager' in window && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handlePhoneInput}
                    >
                      <FileUp className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount Paid (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="any"
                  value={clientData.amount_paid}
                  onChange={(e) =>
                    setClientData({
                      ...clientData,
                      amount_paid: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={clientData.due_date}
                  onChange={(e) =>
                    setClientData({ ...clientData, due_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || clientData.amount_paid <= 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "edit" ? "Update Client" : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
