import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EscritorioProvider } from "@/contexts/EscritorioContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import EscritorioPage from "@/pages/Escritorio";
import ClientesPage from "@/pages/Clientes";
import ContratosPage from "@/pages/Contratos";
import ConfiguracoesPage from "@/pages/Configuracoes";
import ContasPage from "@/pages/Contas";
import NegociacoesPage from "@/pages/Negociacoes";
import PropostasPage from "@/pages/Propostas";
import ProcessosPage from "@/pages/Processos";
import ProtocolosPage from "@/pages/Protocolos";
import CampanhasPage from "@/pages/Campanhas";
import ConsultasFiscaisPage from "@/pages/ConsultasFiscais";
import PortalGerenciarPage from "@/pages/PortalGerenciar";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import PortalLogin from "@/pages/PortalLogin";
import PortalDashboard from "@/pages/PortalDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  }
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRouter() {
  return (
    <AuthGuard>
      <EscritorioProvider>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/escritorio" component={EscritorioPage} />
          <Route path="/clientes" component={ClientesPage} />
          <Route path="/contratos" component={ContratosPage} />
          <Route path="/configuracoes" component={ConfiguracoesPage} />
          <Route path="/contas" component={ContasPage} />
          <Route path="/negociacoes" component={NegociacoesPage} />
          <Route path="/propostas" component={PropostasPage} />
          <Route path="/processos" component={ProcessosPage} />
          <Route path="/protocolos" component={ProtocolosPage} />
          <Route path="/campanhas" component={CampanhasPage} />
          <Route path="/consultas-fiscais" component={ConsultasFiscaisPage} />
          <Route path="/portal-gerenciar" component={PortalGerenciarPage} />
          <Route component={NotFound} />
        </Switch>
      </EscritorioProvider>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/portal/:slug/dashboard" component={PortalDashboard} />
      <Route path="/portal/:slug" component={PortalLogin} />
      <Route component={ProtectedRouter} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
