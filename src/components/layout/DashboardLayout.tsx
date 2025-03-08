import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  LogOut,
  DollarSign,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const LOGOUT_TIMER = 30 * 60 * 1000; // 30 minutes in milliseconds

const DashboardLayout = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [companyName, setCompanyName] = useState("Company");

  useEffect(() => {
    // Set initial menu state based on mobile view
    setIsMenuOpen(!isMobile);

    // Listen for company name changes
    const storedName = localStorage.getItem("companyName");
    if (storedName) {
      setCompanyName(storedName);
    }

    const handleStorageChange = () => {
      const newName = localStorage.getItem("companyName");
      if (newName) {
        setCompanyName(newName);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isMobile]);

  // Auto logout functionality
  useEffect(() => {
    const resetTimer = () => setLastActivity(Date.now());

    // Add event listeners for user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    // Check for inactivity every minute
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity >= LOGOUT_TIMER) {
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearInterval(interval);
    };
  }, [lastActivity]);

  const handleLogout = () => {
    toast({
      title: "Session expired",
      description: "You have been logged out due to inactivity",
    });
    navigate("/");
  };

  const getMenuItemStyles = (label: string) => {
    const isActive = activePage === label.toLowerCase();
    let bgColor = isActive ? "bg-indigo-50" : "";
    
    switch (label.toLowerCase()) {
      case "dashboard":
        bgColor = isActive ? "bg-indigo-50" : "";
        break;
      case "clients":
        bgColor = isActive ? "bg-cyan-50" : "";
        break;
      case "payments":
        bgColor = isActive ? "bg-emerald-50" : "";
        break;
      case "reports":
        bgColor = isActive ? "bg-purple-50" : "";
        break;
      case "expenses":
        bgColor = isActive ? "bg-red-50" : "";
        break;
      case "settings":
        bgColor = isActive ? "bg-slate-50" : "";
        break;
      default:
        bgColor = isActive ? "bg-gray-100" : "";
    }
    
    return bgColor;
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/dashboard",
      color: "#4f46e5",
    },
    {
      icon: Users,
      label: "Clients",
      path: "/dashboard/clients",
      color: "#0891b2",
    },
    {
      icon: CreditCard,
      label: "Payments",
      path: "/dashboard/payments",
      color: "#059669",
    },
    {
      icon: FileText,
      label: "Reports",
      path: "/dashboard/reports",
      color: "#9333ea",
    },
    {
      icon: DollarSign,
      label: "Expenses",
      path: "/dashboard/expenses",
      color: "#e11d48",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/dashboard/settings",
      color: "#475569",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex h-screen">
        {/* Hamburger Menu Button for Mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Sidebar */}
        <aside
          className={`${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:static w-64 bg-white border-r border-gray-200 p-6 h-full transition-transform duration-300 ease-in-out z-40`}
        >
          <div className="flex flex-col h-full">
            <div className="space-y-1">
              <h2 className="text-xl font-bold mb-6 truncate">{companyName}</h2>
              {menuItems.map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className={`w-full justify-start ${getMenuItemStyles(item.label)}`}
                  onClick={() => {
                    setActivePage(item.label.toLowerCase());
                    navigate(item.path);
                    if (isMobile) setIsMenuOpen(false);
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" color={item.color} />
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="mt-auto">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;