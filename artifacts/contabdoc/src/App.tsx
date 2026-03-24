import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EscritorioProvider } from "@/contexts/EscritorioContext";

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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  }
});

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EscritorioProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </EscritorioProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
