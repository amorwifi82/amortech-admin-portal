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
import { Upload, Download, Bell, Shield, Trash2 } from "lucide-react";

interface Settings {
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

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    company_name: "",
    company_logo: "",
    company_email: "",
    currency: "KES",
    notification_enabled: true,
    payment_reminder_days: 7,
    theme: "system",
    language: "en",
    timezone: "Africa/Nairobi",
    data_retention_days: 365,
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No settings found, create default settings
            const { error: insertError } = await supabase
              .from("settings")
              .insert([settings]);

            if (insertError) throw insertError;
          } else {
            throw error;
          }
        } else if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleChange = (
    name: keyof Settings,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("settings")
        .upsert(settings, { onConflict: "id" });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

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
    setIsTestingNotification(true);
    try {
      await checkAndNotifyClients();
      toast({
        title: "Success",
        description: "Test notification sent successfully",
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*");
      if (clientsError) throw clientsError;

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*");
      if (paymentsError) throw paymentsError;

      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("*");
      if (expensesError) throw expensesError;

      const backup = {
        clients,
        payments,
        expenses,
        settings,
        timestamp: new Date().toISOString(),
      };

      const wb = XLSX.utils.book_new();
      Object.entries(backup).forEach(([name, data]) => {
        const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });

      XLSX.writeFile(wb, `amortech_backup_${new Date().toISOString()}.xlsx`);

      toast({
        title: "Success",
        description: "Data backed up successfully",
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your application preferences and configurations
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Company Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Company Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => handleChange("company_email", e.target.value)}
                  placeholder="Enter your company email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_logo">Company Logo URL</Label>
                <Input
                  id="company_logo"
                  value={settings.company_logo}
                  onChange={(e) => handleChange("company_logo", e.target.value)}
                  placeholder="Enter your company logo URL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => handleChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important events
                  </p>
                </div>
                <Switch
                  checked={settings.notification_enabled}
                  onCheckedChange={(checked) =>
                    handleChange("notification_enabled", checked)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_reminder_days">
                  Payment Reminder Days
                </Label>
                <Input
                  id="payment_reminder_days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.payment_reminder_days}
                  onChange={(e) =>
                    handleChange("payment_reminder_days", parseInt(e.target.value))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of days before payment due date to send reminders
                </p>
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
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value: "light" | "dark" | "system") =>
                    handleChange("theme", value)
                  }
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
                  onValueChange={(value) => handleChange("language", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => handleChange("timezone", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.code} value={timezone.code}>
                        {timezone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Current Password</Label>
                <Input
                  id="old_password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={!oldPassword || !newPassword || !confirmPassword}
              >
                <Shield className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Management</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data_retention">Data Retention Period</Label>
                <Select
                  value={settings.data_retention_days.toString()}
                  onValueChange={(value) =>
                    handleChange("data_retention_days", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_RETENTION_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.days}
                        value={option.days.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How long to keep historical data
                </p>
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" onClick={handleBackupData}>
                  <Download className="mr-2 h-4 w-4" />
                  Backup Data
                </Button>

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
                        This action cannot be undone. This will permanently delete
                        all client data from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDatabase}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};

export default Settings;
