import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Client, ClientStatus } from "@/lib/supabase";

type Message = Database['public']['Tables']['messages']['Row'];

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: existingMessages, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(existingMessages || []);
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchClients = async () => {
      try {
        const { data: clientsData, error } = await supabase
          .from("clients")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        // Properly type the client data including the status field
        const typedClients = (clientsData || []).map(client => ({
          ...client,
          status: (client.status || 'Pending') as ClientStatus
        }));

        setClients(typedClients);
      } catch (error: any) {
        console.error("Error fetching clients:", error);
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      }
    };

    fetchMessages();
    fetchClients();

    const subscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const generateMessage = (client: Client) => {
    const dueDate = new Date(client.due_date);
    const today = new Date();
    const isPast = dueDate < today;
    const isFuture = dueDate > today;
    const isToday = dueDate.toDateString() === today.toDateString();
    
    let template = '';
    if (isPast) {
      template = `Dear ${client.name},\nYour WiFi payment of KSH ${client.amount_paid} was due on ${dueDate.toLocaleDateString()}. Please make your payment to resume service. Pay via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`;
    } else if (isFuture) {
      template = `Dear ${client.name},\nYour upcoming WiFi payment of KSH ${client.amount_paid} will be due on ${dueDate.toLocaleDateString()}. Please ensure timely payment to avoid service interruption. Pay via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`;
    } else if (isToday) {
      template = `Dear ${client.name},\nYour WiFi payment of KSH ${client.amount_paid} is due today. Please make your payment to maintain uninterrupted service. Pay via Mpesa Paybill 522533 Account 7831501.\nThank you for your business.`;
    }
    
    setNewMessage(template);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      generateMessage(client);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    try {
      const newMessageData = {
        content: newMessage,
        sender_id: "system",
        receiver_id: selectedClient,
      };

      const { error } = await supabase
        .from("messages")
        .insert([newMessageData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message sent successfully",
      });

      setNewMessage("");
      setSelectedClient("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
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
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <Card className="flex-1 p-4 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Send Client Notification</h2>
          <Select value={selectedClient} onValueChange={handleClientSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} ({client.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === "system" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender_id === "system"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-4">
          <textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full min-h-[100px] p-2 border rounded-md resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSendMessage} 
              disabled={!selectedClient || !newMessage.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Messages;
