
import { CheckCircle2, AlertCircle, User, Wallet, CreditCard, FileText } from "lucide-react";
import React from "react";

export const getStatusIcon = (status: string): React.ReactElement => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'paid':
      return <CheckCircle2 className="inline-block w-4 h-4 text-green-500 mr-1" />;
    default:
      return <AlertCircle className="inline-block w-4 h-4 text-yellow-500 mr-1" />;
  }
};

export const getCategoryIcon = (category: string): React.ReactElement => {
  switch (category.toLowerCase()) {
    case 'clients':
      return <User className="w-4 h-4 text-blue-500" />;
    case 'expenses':
      return <Wallet className="w-4 h-4 text-red-500" />;
    case 'payments':
      return <CreditCard className="w-4 h-4 text-green-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};
