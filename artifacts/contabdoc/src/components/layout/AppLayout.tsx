import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2, Users, Settings, LayoutDashboard, Menu, LogOut, Bell,
  DollarSign, Handshake, FileText, FileCheck, Scale, ClipboardList,
  Megaphone, Receipt, X, FolderOpen, ChevronRight
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
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
    label: "Portal",
    items: [
      { href: "/portal-gerenciar", label: "Portal do Cliente", icon: FolderOpen },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações",    icon: Settings },
    ],
  },
];

export function AppLayout({ children, title, icon }: AppLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { escritorioId, escritorioNome, clearEscritorio } = useEscritorio();
  const { user, logout } = useAuth();

  const userInitials = user?.nome
    ? user.nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "AD";

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col gap-0.5">
      {navSections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-4" : ""}>
          {section.label && (
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20 select-none">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div className={`
                  relative flex items-center gap-3 px-3 py-2 rounded-lg mx-1 transition-all duration-150 cursor-pointer text-sm group
                  ${isActive
                    ? "bg-white/8 text-white font-medium"
                    : "text-white/45 hover:bg-white/5 hover:text-white/80"
                  }
                `}>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-white/35 group-hover:text-white/60"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  const EscritorioIndicator = () => (
    <div className="mx-3 mb-3 rounded-lg border border-white/8 bg-white/4 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 mb-1.5">Escritório</p>
      {escritorioId ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-primary/25 flex items-center justify-center shrink-0">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-medium text-white/80 truncate">{escritorioNome || `ID ${escritorioId}`}</span>
          </div>
          <button onClick={clearEscritorio} className="text-white/25 hover:text-white/60 shrink-0 transition-colors" title="Remover seleção">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Link href="/escritorio">
          <div className="flex items-center gap-2 text-xs text-white/35 hover:text-primary transition-colors cursor-pointer">
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
      <aside className="hidden md:flex w-[220px] flex-col shrink-0" style={{ background: "hsl(var(--card))", borderRight: "1px solid hsl(var(--border) / 0.4)" }}>

        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
            <span className="text-white text-xs font-black">C</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-white">Contab<span className="text-primary">DOC</span></span>
            <span className="text-[9px] font-semibold text-amber-400 tracking-widest uppercase mt-0.5">v 1.0</span>
          </div>
        </div>

        <EscritorioIndicator />

        <div className="flex-1 px-0 pb-3 overflow-y-auto scrollbar-none">
          <NavLinks />
        </div>

        {/* User Footer */}
        <div className="border-t border-white/6 p-3 space-y-1">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{userInitials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/80 truncate leading-tight">{user.nome}</p>
                <p className="text-[10px] text-white/30 truncate leading-tight">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </button>
          <p className="text-center text-[9px] text-white/15 pt-0.5">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-13 px-5 py-3 flex items-center justify-between border-b border-border/40 bg-background/90 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white/60 hover:text-white">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[220px] p-0 flex flex-col border-r border-white/8" style={{ background: "hsl(var(--card))" }}>
                <div className="px-4 py-5 flex items-center gap-2.5 border-b border-white/6">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                    <span className="text-white text-xs font-black">C</span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-base font-bold tracking-tight text-white">Contab<span className="text-primary">DOC</span></span>
                    <span className="text-[9px] font-semibold text-amber-400 tracking-widest uppercase mt-0.5">v 1.0</span>
                  </div>
                </div>
                <div className="px-0 pt-3">
                  <EscritorioIndicator />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <NavLinks onClose={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              {icon && <span className="text-primary/70">{icon}</span>}
              <h1 className="text-base font-semibold text-white">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {escritorioId && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                <Building2 className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{escritorioNome || `Escritório ${escritorioId}`}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="relative rounded-full text-white/40 hover:text-white/80 hover:bg-white/5 w-8 h-8">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </Button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors">
              <span className="text-[10px] font-bold text-primary">{userInitials}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
