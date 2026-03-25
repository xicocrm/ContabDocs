import { AppLayout } from "@/components/layout/AppLayout";
import { useListarClientes, useListarContratos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { formatters } from "@/lib/formatters";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const data = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Abr', value: 4500 },
  { name: 'Mai', value: 6000 },
  { name: 'Jun', value: 7200 },
  { name: 'Jul', value: 8500 },
];

export default function Dashboard() {
  const { data: clientes = [], isLoading: isLoadingClientes } = useListarClientes();
  const { data: contratos = [], isLoading: isLoadingContratos } = useListarContratos();

  const activeContracts = contratos.filter(c => c.status === 'ativo');
  const nearExpiryContracts = activeContracts.filter(c => {
    if (!c.dataVencimento) return false;
    const expiry = new Date(c.dataVencimento.split('/').reverse().join('-'));
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 30 && days >= 0;
  });

  const totalRevenue = activeContracts.reduce((acc, curr) => {
    return acc + parseFloat(formatters.unmaskCurrency(curr.valorContrato || "0") || "0");
  }, 0);

  const StatCard = ({ title, value, icon: Icon, description, trend, trendUp }: any) => (
    <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg shadow-black/5 overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trendUp ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-display font-bold text-white">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <span className={`mr-1 font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
            {trend}
          </span>
          {description}
        </p>
      </CardContent>
      {/* Decorative background glow */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
    </Card>
  );

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
        
        {/* Top metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total de Clientes" 
            value={isLoadingClientes ? "-" : clientes.length} 
            icon={Users} 
            description="vs mês passado" 
            trend="+12%" 
            trendUp={true} 
          />
          <StatCard 
            title="Contratos Ativos" 
            value={isLoadingContratos ? "-" : activeContracts.length} 
            icon={FileText} 
            description="vs mês passado" 
            trend="+5%" 
            trendUp={true} 
          />
          <StatCard 
            title="A Vencer (30 dias)" 
            value={isLoadingContratos ? "-" : nearExpiryContracts.length} 
            icon={AlertCircle} 
            description="Atenção requerida" 
            trend="-2" 
            trendUp={false} 
          />
          <StatCard 
            title="Receita Recorrente" 
            value={isLoadingContratos ? "-" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)} 
            icon={TrendingUp} 
            description="vs mês passado" 
            trend="+18%" 
            trendUp={true} 
          />
        </div>

        {/* Charts & Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/50 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Evolução de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dx={-10} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(val: number) => [`R$ ${val}`, 'Receita']}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 shadow-lg flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Contratos a Vencer</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {nearExpiryContracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p>Nenhum contrato próximo do vencimento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nearExpiryContracts.map(c => {
                    const client = clientes.find(cl => cl.id === c.clienteId);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors">
                        <div>
                          <p className="font-medium text-sm text-foreground">{client?.nomeFantasia || client?.razaoSocial || `Cliente #${c.clienteId}`}</p>
                          <p className="text-xs text-muted-foreground">Vence em: {formatters.displayDate(c.dataVencimento)}</p>
                        </div>
                        <div className="px-2 py-1 rounded-md bg-warning/20 text-warning text-xs font-semibold">
                          Atenção
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
