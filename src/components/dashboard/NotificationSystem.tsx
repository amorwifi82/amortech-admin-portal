import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";
import { checkAndNotifyClients } from "@/services/notificationService";

const NotificationSystem = () => {
  const { toast } = useToast();
  const [isNotifying, setIsNotifying] = useState(false);

  const handleSendNotifications = async () => {
    setIsNotifying(true);
    try {
      await checkAndNotifyClients();
      toast({
        title: "Success",
        description: "Payment reminders have been sent to all relevant clients.",
      });
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast({
        title: "Error",
        description: "Failed to send payment reminders",
        variant: "destructive",
      });
    } finally {
      setIsNotifying(false);
    }
  };

  // Check for pending payments every day
  useEffect(() => {
    const checkPayments = () => {
      const now = new Date();
      if (now.getHours() === 9) { // Check at 9 AM
        handleSendNotifications();
      }
    };

    const interval = setInterval(checkPayments, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      variant="outline"
      onClick={handleSendNotifications}
      disabled={isNotifying}
      className="w-full"
    >
      <Bell className="mr-2 h-4 w-4" />
      {isNotifying ? "Sending Notifications..." : "Send Payment Reminders"}
    </Button>
  );
};

export default NotificationSystem;