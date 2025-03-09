export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client
        Insert: Omit<Client, "id" | "created_at">
        Update: Partial<Omit<Client, "id" | "created_at">>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, "id" | "created_at">
        Update: Partial<Omit<Expense, "id" | "created_at">>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, "id" | "created_at">
        Update: Partial<Omit<Payment, "id" | "created_at">>
      }
      settings: {
        Row: Settings
        Insert: Settings
        Update: Partial<Settings>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type ClientStatus = "Pending" | "Paid" | "Overdue" | "Suspended";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: ClientStatus;
  amount_paid: number;
  due_date: string;
  debt: number;
  created_at: string;
  updated_at: string;
  phone_number: string;
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
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  created_at: string;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes?: string;
}

export interface Settings {
  id?: string;
  company_name: string;
  company_logo: string;
  company_email: string;
  currency: string;
  notification_enabled: boolean;
  payment_reminder_days: number;
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  data_retention_days: number;
}

// Type guard to check if response is a Client
export function isClient(obj: any): obj is Client {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.phone === 'string' &&
    typeof obj.address === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.amount_paid === 'number' &&
    typeof obj.debt === 'number' &&
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