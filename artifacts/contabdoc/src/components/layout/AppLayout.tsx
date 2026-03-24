import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Building2, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Menu,
  LogOut,
  Bell,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escritorio", label: "Escritórios", icon: Building2 },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppLayout({ children, title }: AppLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLinks = () => (
    <div className="flex flex-col space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
            <div className={`
              flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
              ${isActive 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }
            `}>
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border/50 shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Contab<span className="text-primary">DOC</span></span>
        </div>
        
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-white">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sair</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card p-0">
                <div className="p-6 flex items-center space-x-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold">C</span>
                  </div>
                  <span className="text-lg font-bold text-white">Contab<span className="text-primary">DOC</span></span>
                </div>
                <div className="p-4">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Busca rápida..." 
                className="bg-secondary text-sm rounded-full pl-9 pr-4 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>

            <Avatar className="cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all w-8 h-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs">AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
