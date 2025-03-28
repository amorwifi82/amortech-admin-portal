import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

const ImportContactsButton = ({ onImport }: { onImport: (contacts: any[]) => void }) => {
  const [isSupported] = useState('contacts' in navigator && 'ContactsManager' in window);
  const { toast } = useToast();

  const handleImportContacts = async () => {
    try {
      if (!isSupported) {
        toast({
          title: "Not Supported",
          description: "Contact import is not supported in your browser",
          variant: "destructive",
        });
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: true };
      
      // @ts-ignore - Contacts API types not yet in TypeScript
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        onImport(contacts);
        toast({
          title: "Success",
          description: `Imported ${contacts.length} contacts`,
        });
      }
    } catch (error: any) {
      console.error("Error importing contacts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import contacts",
        variant: "destructive",
      });
    }
  };

  if (!isSupported) return null;

  return (
    <Button onClick={handleImportContacts} variant="outline">
      <Users className="mr-2 h-4 w-4" />
      Import Contacts
    </Button>
  );
};

export default ImportContactsButton;