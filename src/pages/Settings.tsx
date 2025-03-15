import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAndNotifyClients } from "@/services/notificationService";
import { Upload, Download, Bell, Shield, Trash2, Cloud, Info } from "lucide-react";
import type { Database } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon } from 'lucide-react';
import { APP_VERSION } from '@/config/settings';

interface Settings {
  id: string;
  company_name: string;
  company_logo: string;
  company_email: string;
  currency: string;
  notification_enabled: boolean;
  payment_reminder_days: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  data_retention_days: number;
  version: string;
  created_at: string;
  updated_at: string;
}

const CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "sw", name: "Swahili" },
];

const TIMEZONES = [
  { code: "Africa/Nairobi", name: "Nairobi (EAT)" },
  { code: "UTC", name: "UTC" },
];

const DATA_RETENTION_OPTIONS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
];

// Version information
const CHANGELOG = [
  {
    version: "1.0.1",
    date: "2024-03-21",
    changes: [
      "Enhanced debt management system with custom payment amounts",
      "Added ability to move remaining debt to next subscription date",
      "Improved upcoming payments view with ±5 days range",
      "Added payment reminder functionality for overdue debts",
      "Added test notification feature in settings",
      "Updated client status tracking and management",
      "Fixed issues with debt calculations and status updates"
    ]
  },
  {
    version: "1.0.0",
    date: "2024-03-19",
    changes: [
      "Initial release",
      "Client management with real-time updates",
      "Debt management system",
      "Payment tracking and reminders",
      "Automated notifications via WhatsApp and SMS",
      "Data backup and restore functionality",
      "Multi-currency support",
      "Dark/Light theme support"
    ]
  }
];

const defaultSettings: Settings = {
  id: '',
  company_name: 'Amortech',
  company_logo: '',
  company_email: 'info@amortech.co.ke',
  currency: 'KES',
  notification_enabled: true,
  payment_reminder_days: 5,
  theme: 'light',
  language: 'en',
  timezone: 'Africa/Nairobi',
  data_retention_days: 365,
  version: APP_VERSION,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<"google" | "dropbox" | "none">("none");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);

      // First check if we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw sessionError;
      }

      if (!session) {
        // Redirect to login if no session
        window.location.href = '/auth/login';
        return;
      }

      // Try to fetch existing settings
      const { data: existingSettings, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error) {
        console.error("Fetch error:", error);
        if (error.code === "PGRST116") {
          // No settings found, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert([{
              ...defaultSettings,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
          }

          if (newSettings) {
            setSettings(newSettings);
          }
        } else {
          throw error;
        }
      } else if (existingSettings) {
        setSettings(existingSettings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      // Clear password fields
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsTestingNotification(true);
      
      // Get a test client for notifications
      const { data: testClient, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .limit(1)
        .single();

      if (clientError) throw clientError;

      if (!testClient) {
        toast({
          title: "No clients found",
          description: "Please add at least one client to test notifications",
          variant: "destructive",
        });
        return;
      }

      // Create a test message
      const testMessage = `This is a test notification from ${settings.company_name}. Your payment reminder system is working correctly.`;
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          client_id: testClient.id,
          message: testMessage,
          sent_at: new Date().toISOString(),
          status: 'sent',
          type: 'test'
        }]);

      if (messageError) throw messageError;

      // Call notification service without arguments
      await checkAndNotifyClients();

      toast({
        title: "Test Notification Sent",
        description: `A test message was sent to ${testClient.name}`,
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const [
        { data: clients },
        { data: expenses },
        { data: messages },
        { data: settings }
      ] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("messages").select("*"),
        supabase.from("settings").select("*")
      ]);

      const backupData = {
        clients,
        expenses,
        messages,
        settings,
        backup_date: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `amortech_backup_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data backup created successfully",
      });
    } catch (error) {
      console.error("Error backing up data:", error);
      toast({
        title: "Error",
        description: "Failed to backup data",
        variant: "destructive",
      });
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsRestoring(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup data structure
      if (!backupData.clients || !backupData.expenses || !backupData.messages || !backupData.settings) {
        throw new Error("Invalid backup file format");
      }

      // Start a transaction for all operations
      const { error: deleteError } = await supabase.from("clients").delete().not("id", "is", null);
      if (deleteError) throw deleteError;

      // Restore data in parallel
      const promises = [
        // Restore clients
        supabase.from("clients").insert(backupData.clients),
        // Restore expenses
        supabase.from("expenses").insert(backupData.expenses),
        // Restore messages
        supabase.from("messages").insert(backupData.messages),
        // Update settings
        supabase
          .from("settings")
          .update(backupData.settings[0])
          .eq("id", settings.id)
      ];

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        throw new Error("Failed to restore some data");
      }

    toast({
      title: "Success",
        description: "Database restored successfully",
      });

      // Refresh the page to show restored data
      window.location.reload();
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast({
        title: "Error",
        description: "Failed to restore backup. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCloudBackup = async (provider: "google" | "dropbox") => {
    try {
      // First create the backup data
      const [
        { data: clients },
        { data: expenses },
        { data: messages },
        { data: settings }
      ] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("messages").select("*"),
        supabase.from("settings").select("*")
      ]);

      const backupData = {
        clients,
        expenses,
        messages,
        settings,
        backup_date: new Date().toISOString(),
      };

      // TODO: Implement cloud storage integration
      toast({
        title: "Coming Soon",
        description: `${provider} backup integration will be available soon!`,
      });
    } catch (error) {
      console.error("Error creating cloud backup:", error);
      toast({
        title: "Error",
        description: "Failed to create cloud backup",
        variant: "destructive",
      });
    }
  };

  const handleClearDatabase = async () => {
    try {
      const { error: clientsError } = await supabase
        .from("clients")
        .delete()
        .not("id", "is", null);
      
      if (clientsError) throw clientsError;

      toast({
        title: "Success",
        description: "Database cleared successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear database",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Settings
            <span className="text-xs text-muted-foreground ml-2">v{APP_VERSION}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Configure your application settings</p>
        </div>
      </div>

      <div className="grid gap-6 p-6 bg-card rounded-lg border">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Company Information</h2>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_email">Company Email</Label>
              <Input
                id="company_email"
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_logo">Company Logo URL</Label>
            <Input
                id="company_logo"
                value={settings.company_logo}
                onChange={(e) => setSettings(prev => ({ ...prev, company_logo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Notifications</h2>
          
          <div className="grid gap-4">
          <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
            <Switch
              id="notifications"
                checked={settings.notification_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notification_enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_days">Payment Reminder Days</Label>
              <Input
                id="reminder_days"
                type="number"
                value={settings.payment_reminder_days}
                onChange={(e) => setSettings(prev => ({ ...prev, payment_reminder_days: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={isTestingNotification || !settings.notification_enabled}
            >
              <Bell className="mr-2 h-4 w-4" />
              {isTestingNotification ? "Sending..." : "Test Notifications"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Preferences</h2>
          
          <div className="grid gap-4">
            <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value as Settings['theme'] }))}
              >
                <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
        </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Nairobi">Nairobi</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">System</h2>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_retention">Data Retention (days)</Label>
              <Input
                id="data_retention"
                type="number"
                value={settings.data_retention_days}
                onChange={(e) => setSettings(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) || 365 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Version Information</Label>
              <div className="text-sm text-muted-foreground">
                <p>Version: {settings.version}</p>
                <p>Last Updated: {new Date(settings.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
