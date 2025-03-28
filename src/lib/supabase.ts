import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Re-export the supabase client from the integrations file
export { supabase } from '@/integrations/supabase/client';

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
        Row: {
          id: string
          name: string
          phone_number: string
          amount_paid: number
          debt: number
          due_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone_number: string
          amount_paid?: number
          debt?: number
          due_date: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string
          amount_paid?: number
          debt?: number
          due_date?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          client_id: string
          amount: number
          due_date: string
          status: 'pending' | 'partially_paid' | 'paid'
          collected_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          amount: number
          due_date: string
          status?: 'pending' | 'partially_paid' | 'paid'
          collected_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          amount?: number
          due_date?: string
          status?: 'pending' | 'partially_paid' | 'paid'
          collected_amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          id: string
          company_name: string
          company_logo: string
          company_email: string
          currency: string
          notification_enabled: boolean
          payment_reminder_days: number
          theme: "light" | "dark" | "system"
          language: string
          timezone: string
          data_retention_days: number
          created_at: string
          updated_at: string
          version: string
        }
        Insert: {
          id?: string
          company_name: string
          company_logo: string
          company_email: string
          currency: string
          notification_enabled?: boolean
          payment_reminder_days?: number
          theme?: "light" | "dark" | "system"
          language?: string
          timezone?: string
          data_retention_days?: number
          created_at?: string
          updated_at?: string
          version?: string
        }
        Update: {
          id?: string
          company_name?: string
          company_logo?: string
          company_email?: string
          currency?: string
          notification_enabled?: boolean
          payment_reminder_days?: number
          theme?: "light" | "dark" | "system"
          language?: string
          timezone?: string
          data_retention_days?: number
          created_at?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          amount: number
          category: string
          description: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          amount: number
          category: string
          description: string
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          amount?: number
          category?: string
          description?: string
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          client_id: string
          message: string
          sent_at: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          message: string
          sent_at?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          message?: string
          sent_at?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type ClientStatus = "Pending" | "Paid" | "Overdue";

export interface Client {
  id: string;
  name: string;
  phone_number: string;
  amount_paid: number;
  due_date: string;
  status: ClientStatus;
  debt: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  message: string;
  sent_at: string;
  status: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  status: "pending" | "partially_paid" | "paid";
  collected_amount: number;
  created_at: string;
  updated_at: string;
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
  id: string;
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
  created_at: string;
  updated_at: string;
}

// Type guard to check if response is a Client
export function isClient(obj: any): obj is Client {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.phone_number === 'string' &&
    typeof obj.amount_paid === 'number' &&
    typeof obj.due_date === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.debt === 'number';
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