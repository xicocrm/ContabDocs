import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2, Users, Settings, LayoutDashboard, Menu, LogOut, Bell,
  DollarSign, Handshake, FileText, FileCheck, Scale, ClipboardList,
  Megaphone, Receipt, ChevronDown, X
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

type NavSection = {
  label?: string;
  items: { href: string; label: string; icon: any }[];
};

const navSections: NavSection[] = [
  {
    items: [
      { href: "/",             label: "Dashboard",         icon: LayoutDashboard },
      { href: "/escritorio",   label: "Escritórios",       icon: Building2 },
      { href: "/clientes",     label: "Clientes",          icon: Users },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/contas",       label: "Contas Rec./Pagar", icon: DollarSign },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/negociacoes",  label: "Negociações",       icon: Handshake },
      { href: "/propostas",    label: "Propostas",         icon: FileText },
      { href: "/contratos",    label: "Contratos",         icon: FileCheck },
    ],
  },
  {
    label: "Jurídico",
    items: [
      { href: "/processos",    label: "Processos",         icon: Scale },
    ],
  },
  {
    label: "Operacional",
    items: [
      { href: "/protocolos",   label: "Protocolos",        icon: ClipboardList },
      { href: "/campanhas",    label: "Campanhas",         icon: Megaphone },
      { href: "/consultas-fiscais", label: "Consultas Fiscais", icon: Receipt },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações",    icon: Settings },
    ],
  },
];

export function AppLayout({ children, title }: AppLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { escritorioId, escritorioNome, clearEscritorio } = useEscritorio();

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col gap-1">
      {navSections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-3" : ""}>
          {section.label && (
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div className={`
                  flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm
                  ${isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}>
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  const EscritorioIndicator = () => (
    <div className="mx-4 mb-4 rounded-xl border border-border/50 bg-secondary/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
        Escritório Ativo
      </p>
      {escritorioId ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground truncate">{escritorioNome || `ID ${escritorioId}`}</span>
          </div>
          <button
            onClick={clearEscritorio}
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Remover seleção"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Link href="/escritorio">
          <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <Building2 className="w-3.5 h-3.5" />
            <span>Selecionar escritório →</span>
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border/50 shrink-0">
        <div className="p-5 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Contab<span className="text-primary">DOC</span></span>
        </div>

        <EscritorioIndicator />

        <div className="flex-1 px-2 pb-4 overflow-y-auto">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-border/50 space-y-1">
          <div className="flex items-center space-x-3 px-4 py-2.5 rounded-xl hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-white">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40 pt-1">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 bg-card p-0 flex flex-col">
                <div className="p-5 flex items-center space-x-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white font-bold">C</span>
                  </div>
                  <span className="text-lg font-bold text-white">Contab<span className="text-primary">DOC</span></span>
                </div>
                <div className="p-3">
                  <EscritorioIndicator />
                </div>
                <div className="flex-1 px-2 overflow-y-auto">
                  <NavLinks onClose={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center space-x-2">
            {escritorioId && (
              <Badge variant="outline" className="hidden sm:flex text-xs bg-primary/10 text-primary border-primary/30">
                <Building2 className="w-3 h-3 mr-1" />
                {escritorioNome || `Escritório ${escritorioId}`}
              </Badge>
            )}
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
