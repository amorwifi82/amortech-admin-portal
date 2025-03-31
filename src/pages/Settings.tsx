import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
  company_logo: string | null;
  company_email: string | null;
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
    version: "1.0.2",
    date: "2024-03-22",
    changes: [
      "Fixed settings page initialization and persistence",
      "Improved error handling for settings management",
      "Enhanced database schema for settings table",
      "Added better type safety for settings data",
      "Fixed version column synchronization issues"
    ]
  },
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
  id: crypto.randomUUID(),
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

      // Check if we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast({
          title: 'Authentication Error',
          description: 'Please ensure you are logged in.',
          variant: 'destructive',
        });
        return;
      }

      // Try to fetch existing settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (fetchError) {
        console.error("Fetch error:", fetchError);
        if (fetchError.code === "PGRST116") {
          // No settings found, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert([{
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
              version: APP_VERSION
            }])
            .select()
            .single();

          if (insertError) {
            console.error("Insert error:", insertError);
            toast({
              title: 'Settings Creation Failed',
              description: insertError.message || 'Failed to create settings. Please try again.',
              variant: 'destructive',
            });
            return;
          }

          if (newSettings) {
            setSettings(newSettings as Settings);
            toast({
              title: 'Success',
              description: 'Default settings created successfully.',
            });
          }
        } else {
          toast({
            title: 'Error',
            description: fetchError.message || 'Failed to load settings. Please try again.',
            variant: 'destructive',
          });
        }
      } else if (existingSettings) {
        setSettings(existingSettings as Settings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load settings. Please check your connection and try again.',
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
            <Badge variant="outline" className="ml-2">v{APP_VERSION}</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">Configure your application settings</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your company details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how and when notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for payments and reminders
                  </p>
                </div>
                <Switch
                  checked={settings.notification_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notification_enabled: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_days">Payment Reminder Days</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="reminder_days"
                    type="number"
                    value={settings.payment_reminder_days}
                    onChange={(e) => setSettings(prev => ({ ...prev, payment_reminder_days: parseInt(e.target.value) || 0 }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">days before due date</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={isTestingNotification || !settings.notification_enabled}
              >
                <Bell className="mr-2 h-4 w-4" />
                {isTestingNotification ? "Sending..." : "Test Notifications"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your application experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
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
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.code} value={tz.code}>
                          {tz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>Manage your data backups and restoration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={handleBackupData}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Backup
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Download a complete backup of your data
                  </p>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Label htmlFor="restore">Restore from Backup</Label>
                  <Input
                    id="restore"
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    disabled={isRestoring}
                    ref={fileInputRef}
                  />
                  <p className="text-sm text-muted-foreground">
                    {isRestoring ? "Restoring..." : "Select a backup file to restore"}
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Database
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your data
                        including clients, payments, and settings.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDatabase}>
                        Yes, clear everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_retention">Data Retention</Label>
                  <Select
                    value={settings.data_retention_days.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, data_retention_days: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_RETENTION_OPTIONS.map(option => (
                        <SelectItem key={option.days} value={option.days.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How long to keep historical data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Changelog</CardTitle>
              <CardDescription>View recent updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {CHANGELOG.map((release, index) => (
                    <div key={release.version} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Version {release.version}</h3>
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          {index === 0 ? "Latest" : "Previous"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{release.date}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {release.changes.map((change, i) => (
                          <li key={i} className="text-sm">{change}</li>
                        ))}
                      </ul>
                      {index < CHANGELOG.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
