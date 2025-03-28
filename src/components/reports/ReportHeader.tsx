import React from "react";
import { Button } from "@/components/ui/button";

export const ReportHeader = ({ 
  onExportPDF, 
  onPrint, 
  onGenerateReport 
}: { 
  onExportPDF: () => void;
  onPrint: () => void;
  onGenerateReport: () => void;
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Reports 📊</h2>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={onGenerateReport}
          className="flex items-center gap-2"
        >
          <span className="text-lg">📝</span>
          Generate Report
        </Button>
        <Button 
          variant="outline" 
          onClick={onExportPDF}
          className="flex items-center gap-2"
        >
          <span className="text-lg">📄</span>
          Export PDF
        </Button>
        <Button 
          variant="outline" 
          onClick={onPrint}
          className="flex items-center gap-2"
        >
          <span className="text-lg">🖨️</span>
          Print
        </Button>
      </div>
    </div>
  );
};
