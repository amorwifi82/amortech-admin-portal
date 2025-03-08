
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

interface ReportFiltersProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  status: string;
  setStatus: (status: string) => void;
  category: string;
  setCategory: (category: string) => void;
  onGenerateReport: () => void;
}

export const ReportFilters = ({
  date,
  setDate,
  status,
  setStatus,
  category,
  setCategory,
  onGenerateReport,
}: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      <DatePickerWithRange date={date} setDate={setDate} />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="clients">Clients</SelectItem>
          <SelectItem value="expenses">Expenses</SelectItem>
          <SelectItem value="payments">Payments</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onGenerateReport}>
        <FileText className="mr-2 h-4 w-4" />
        Generate Report
      </Button>
    </div>
  );
};
