
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientStatusSection } from "@/components/reports/ClientStatusSection";
import { FinancialSummary } from "@/components/reports/FinancialSummary";
import { MonthlyPaymentReport } from "@/components/reports/MonthlyPaymentReport";
import { DateRange } from "react-day-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { GeneratedReportTable } from "@/components/reports/GeneratedReportTable";

const Reports = () => {
  const printRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7)
  });
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [generatedReport, setGeneratedReport] = useState<{
    title: string;
    isVisible: boolean;
  }>({ title: "", isVisible: false });

  // Set up realtime subscriptions
  useEffect(() => {
    // Subscribe to clients table changes
    const clientsSubscription = supabase
      .channel('clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['report-data'] });
          toast({
            title: "Report Updated",
            description: "Client data has been updated in real-time",
          });
        }
      )
      .subscribe();

    // Subscribe to expenses table changes
    const expensesSubscription = supabase
      .channel('expenses-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['report-data'] });
          toast({
            title: "Report Updated",
            description: "Expense data has been updated in real-time",
          });
        }
      )
      .subscribe();

    return () => {
      clientsSubscription.unsubscribe();
      expensesSubscription.unsubscribe();
    };
  }, [queryClient, toast]);

  // Fetch data for the report
  const { data: reportData } = useQuery({
    queryKey: ["report-data", date?.from, date?.to, category],
    queryFn: async () => {
      if (!date?.from || !date?.to) return null;

      let data = [];
      
      if (category === "all" || category === "clients") {
        const { data: clients } = await supabase
          .from("clients")
          .select("*")
          .gte("created_at", date.from.toISOString())
          .lte("created_at", date.to.toISOString());
        
        if (clients) {
          data.push(...clients.map(client => ({
            date: client.created_at,
            description: `Client: ${client.name}`,
            amount: client.amount_paid,
            status: client.status,
            category: "Clients"
          })));
        }
      }

      if (category === "all" || category === "expenses") {
        const { data: expenses } = await supabase
          .from("expenses")
          .select("*")
          .gte("created_at", date.from.toISOString())
          .lte("created_at", date.to.toISOString());
        
        if (expenses) {
          data.push(...expenses.map(expense => ({
            date: expense.created_at,
            description: expense.description,
            amount: expense.amount,
            status: "Paid",
            category: "Expenses"
          })));
        }
      }

      if (category === "all" || category === "payments") {
        const { data: payments } = await supabase
          .from("clients")
          .select("*")
          .eq("status", "Paid")
          .gte("updated_at", date.from.toISOString())
          .lte("updated_at", date.to.toISOString());
        
        if (payments) {
          data.push(...payments.map(payment => ({
            date: payment.updated_at,
            description: `Payment from ${payment.name}`,
            amount: payment.amount_paid,
            status: "Completed",
            category: "Payments"
          })));
        }
      }

      return data;
    }
  });

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        const element = printRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          logging: true,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save('financial-report.pdf');
        
        toast({
          title: "Success",
          description: "Report exported successfully",
        });
      } catch (error) {
        console.error('Export error:', error);
        toast({
          title: "Error",
          description: "Failed to export report. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateReport = () => {
    let reportTitle = "";
    
    if (status !== "all" && category !== "all") {
      reportTitle = `${status.charAt(0).toUpperCase() + status.slice(1)} ${category} Report`;
    } else if (status !== "all") {
      reportTitle = `${status.charAt(0).toUpperCase() + status.slice(1)} Status Report`;
    } else if (category !== "all") {
      reportTitle = `${category} Category Report`;
    } else {
      reportTitle = "General Financial Report";
    }

    setGeneratedReport({
      title: reportTitle,
      isVisible: true
    });

    toast({
      title: "Success",
      description: "Report generated successfully",
    });
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <ReportHeader onPrint={handlePrint} onExport={handleExportPDF} />
      
      <ReportFilters
        date={date}
        setDate={setDate}
        status={status}
        setStatus={setStatus}
        category={category}
        setCategory={setCategory}
        onGenerateReport={handleGenerateReport}
      />

      <div ref={printRef} className="space-y-8">
        {(!generatedReport.isVisible || category === "all") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ClientStatusSection selectedYear={selectedYear} />
            <FinancialSummary selectedYear={selectedYear} />
          </div>
        )}
        
        {(!generatedReport.isVisible || category === "all" || category === "payments") && (
          <MonthlyPaymentReport 
            selectedYear={selectedYear} 
            onYearChange={setSelectedYear}
          />
        )}
        
        {generatedReport.isVisible && reportData && (
          <GeneratedReportTable
            title={generatedReport.title}
            date={date}
            reportData={reportData}
            category={category}
            status={status}
          />
        )}
      </div>
    </div>
  );
};

export default Reports;
