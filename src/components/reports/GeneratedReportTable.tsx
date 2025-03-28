
import React from "react";
import { format } from "date-fns";
import { FileText, Calendar, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { getStatusIcon, getCategoryIcon } from "@/lib/reportUtils";

interface GeneratedReportTableProps {
  title: string;
  date: DateRange | undefined;
  reportData: any[];
  category: string;
  status: string;
}

export const GeneratedReportTable = ({
  title,
  date,
  reportData,
  category,
  status,
}: GeneratedReportTableProps) => {
  return (
    <div className="mt-8 animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          {title}
        </h2>
        <div className="space-y-4">
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Report period: {date?.from?.toLocaleDateString()} - {date?.to?.toLocaleDateString()}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData
                  .filter(item => 
                    (category === "all" || item.category.toLowerCase() === category.toLowerCase()) &&
                    (status === "all" || item.status.toLowerCase() === status.toLowerCase())
                  )
                  .map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{format(new Date(item.date), 'PP')}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {getCategoryIcon(item.category)} {item.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center">
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        {item.amount.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};
