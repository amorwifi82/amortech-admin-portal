
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/supabase";

interface ExportButtonProps {
  clients: Client[];
}

const ExportButton = ({ clients }: ExportButtonProps) => {
  const { toast } = useToast();

  // Format phone number for Excel compatibility to prevent scientific notation
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters
    let digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Remove the 254 prefix if present
    if (digitsOnly.startsWith('254')) {
      digitsOnly = digitsOnly.substring(3);
    }
    
    // Format as text with leading equals sign and quotes
    // This is the Excel formula format that forces text treatment
    return `="${digitsOnly}"`;
  };

  const exportToCsv = () => {
    try {
      // Format the data for CSV
      const headers = ["Name", "Phone Number", "Amount Paid", "Due Date"];
      const csvData = clients.map(client => [
        client.name,
        formatPhoneNumber(client.phone_number),
        client.amount_paid.toString(),
        new Date(client.due_date).toLocaleDateString()
      ]);
      
      // Add headers as the first row
      csvData.unshift(headers);
      
      // Convert data to CSV format
      const csvContent = csvData.map(row => row.map(cell => 
        // Handle commas and quotes in cells properly
        typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')).join('\n');
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set up download properties
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_export_${date}.csv`);
      link.style.visibility = 'hidden';
      
      // Trigger download and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `${clients.length} clients exported to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was a problem exporting the data",
        variant: "destructive",
      });
    }
  };

  return (
    <Button variant="outline" onClick={exportToCsv}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
};

export default ExportButton;
