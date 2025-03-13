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

type Settings = Database["public"]["Tables"]["settings"]["Row"];
type SettingsInsert = Database["public"]["Tables"]["settings"]["Insert"];

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
const APP_VERSION = "1.0.0";
const CHANGELOG = [
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

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    id: "",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<"google" | "dropbox" | "none">("none");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // First check if we have an authenticated session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        // Fetch settings with explicit columns
        const { data: existingSettings, error } = await supabase
          .from("settings")
          .select(`
            id,
            company_name,
            company_logo,
            company_email,
            currency,
            notification_enabled,
            payment_reminder_days,
            theme,
            language,
            timezone,
            data_retention_days,
            created_at,
            updated_at
          `)
          .single();

        if (error) {
          console.error("Fetch error:", error);
          if (error.code === "PGRST116") {
            // No settings found, create default settings
            const initialSettings: SettingsInsert = {
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
            };

            const { data: newSettings, error: insertError } = await supabase
              .from("settings")
              .insert([initialSettings])
              .select()
              .single();

            if (insertError) {
              console.error("Insert error:", insertError);
              throw insertError;
            }
            
            if (newSettings) {
              setSettings(newSettings);
              localStorage.setItem("companyName", newSettings.company_name);
            }
          } else {
            throw error;
          }
        } else if (existingSettings) {
          setSettings(existingSettings);
          localStorage.setItem("companyName", existingSettings.company_name);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please check your connection and try again.",
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
      const { data: existingSettings, error: fetchError } = await supabase
        .from("settings")
        .select("id")
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      const updatedSettings: SettingsInsert = {
        company_name: settings.company_name,
        company_logo: settings.company_logo,
        company_email: settings.company_email,
        currency: settings.currency,
        notification_enabled: settings.notification_enabled,
        payment_reminder_days: settings.payment_reminder_days,
        theme: settings.theme,
        language: settings.language,
        timezone: settings.timezone,
        data_retention_days: settings.data_retention_days,
      };

      let result;
      if (existingSettings?.id) {
        result = await supabase
          .from("settings")
          .update(updatedSettings)
          .eq("id", existingSettings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("settings")
          .insert([updatedSettings])
          .select()
          .single();
      }

      if (result.error) throw result.error;
      if (result.data) {
        setSettings(result.data);
        localStorage.setItem("companyName", result.data.company_name);
      }

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <p className="text-sm text-muted-foreground">Version {APP_VERSION}</p>
          </div>
        </Card>
        </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="about">About & Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
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

        <TabsContent value="backup" className="space-y-4">
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

              <div className="space-y-2">
                <Label>Backup and Restore</Label>
                <div className="flex flex-col space-y-4">
                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={handleBackupData}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Backup
                    </Button>

                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreBackup}
                        className="hidden"
                        ref={fileInputRef}
                        disabled={isRestoring}
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isRestoring}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isRestoring ? "Restoring..." : "Restore Backup"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cloud Backup</Label>
                    <div className="flex space-x-4">
                      <Button
                        variant="outline"
                        onClick={() => handleCloudBackup("google")}
                      >
                        <Cloud className="mr-2 h-4 w-4" />
                        Backup to Google Drive
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleCloudBackup("dropbox")}
                      >
                        <Cloud className="mr-2 h-4 w-4" />
                        Backup to Dropbox
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Securely store your backups in the cloud
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label>Danger Zone</Label>
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

        <TabsContent value="about" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">About Amortech Admin Portal</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Current Version</h3>
                <p className="text-muted-foreground">v{APP_VERSION}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Changelog</h3>
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {CHANGELOG.map((release) => (
                      <AccordionItem key={release.version} value={release.version}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">Version {release.version}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(release.date).toLocaleDateString()}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside space-y-2">
                            {release.changes.map((change, index) => (
                              <li key={index} className="text-muted-foreground">
                                {change}
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>

              <div>
                <h3 className="text-lg font-medium">System Information</h3>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Database Status</span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(settings.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment</span>
                    <Badge variant="outline">
                      {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
                    </Badge>
                  </div>
                </div>
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
