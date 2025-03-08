export type ClientStatus = "Paid" | "Pending" | "Suspended";

export interface Client {
  id: string;
  name: string;
  phone_number: string;
  amount_paid: number;
  debt: number;
  status: ClientStatus;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

// Type guard to check if response is a Client
export function isClient(obj: any): obj is Client {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.phone_number === 'string' &&
    typeof obj.amount_paid === 'number' &&
    typeof obj.debt === 'number' &&
    typeof obj.status === 'string' &&
    typeof obj.due_date === 'string';
}

// Type guard for arrays
export function isClientArray(obj: any): obj is Client[] {
  return Array.isArray(obj) && obj.every(isClient);
}

// Helper function to safely cast Supabase response to Client type
export function castToClient(data: any): Client | null {
  if (isClient(data)) {
    return data;
  }
  return null;
}

// Helper function to safely cast Supabase response to Client array
export function castToClientArray(data: any): Client[] {
  if (isClientArray(data)) {
    return data;
  }
  return [];
}