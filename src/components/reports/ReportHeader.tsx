
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface ReportHeaderProps {
  onPrint: () => void;
  onExport: () => void;
}

export const ReportHeader = ({ onPrint, onExport }: ReportHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and analyze detailed business reports
        </p>
      </div>
      <div className="flex gap-4">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="default" size="sm" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  );
};
