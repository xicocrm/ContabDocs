import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { API } from "@/lib/api";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Loader2, Plus, Edit, Trash2, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Search, DollarSign, Filter,
  Calendar, FileText, CreditCard, Receipt, Download,
  Bell, LayoutGrid, List, ArrowUpDown, Clock, XCircle,
  Building2, Eye, Send, X, ChevronDown, Sparkles, User, Hash
} from "lucide-react";

interface Conta {
  id: number;
  escritorioId: number;
  clienteId?: number;
  tipo: string;
  descricao: string;
  valor?: string;
  categoria?: string;
  competencia?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  dataEmissao?: string;
  status: string;
  formaPagamento?: string;
  numeroDocumento?: string;
  parcela?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Cliente {
  id: number;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cpf?: string;
}

interface ServicoItem {
  id: string;
  descricao: string;
  valor: string;
}

interface HonorariosForm {
  clienteId: string;
  mes: string;
  ano: string;
  dataEmissao: string;
  dataVencimento: string;
  numeroRecibo: string;
  servicos: ServicoItem[];
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const emptyHonorarios = (): HonorariosForm => {
  const now = new Date();
  return {
    clienteId: "",
    mes: MESES[now.getMonth()],
    ano: String(now.getFullYear()),
    dataEmissao: now.toLocaleDateString("pt-BR"),
    dataVencimento: "",
    numeroRecibo: "",
    servicos: [{ id: crypto.randomUUID(), descricao: "", valor: "" }],
  };
};

const empty: Partial<Conta> = {
  tipo: "receber", status: "pendente", descricao: "", valor: "",
  categoria: "", competencia: "", dataVencimento: "", dataPagamento: "",
  dataEmissao: "", formaPagamento: "", numeroDocumento: "", parcela: "",
  observacoes: "",
};

const STATUS_MAP: Record<string, { label: string; color: string; dotColor: string; icon: any }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dotColor: "bg-yellow-400", icon: Clock },
  pago:      { label: "Pago",      color: "bg-green-500/20 text-green-400 border-green-500/30",   dotColor: "bg-green-400",  icon: CheckCircle2 },
  vencido:   { label: "Vencido",   color: "bg-red-500/20 text-red-400 border-red-500/30",         dotColor: "bg-red-400",    icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30",      dotColor: "bg-gray-400",   icon: XCircle },
  parcial:   { label: "Parcial",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30",      dotColor: "bg-blue-400",   icon: CreditCard },
};

const CATEGORIAS = [
  "Honorários", "Mensalidade", "Consultoria", "Certidão", "Alvará",
  "Imposto", "Taxa", "Folha de Pagamento", "Aluguel", "Energia",
  "Internet", "Telefone", "Material", "Software", "Marketing", "Outros",
];

const FORMAS_PAGAMENTO = [
  "Pix", "Boleto", "Transferência", "Cartão de Crédito", "Cartão de Débito",
  "Dinheiro", "Cheque", "Depósito", "Débito Automático",
];

const PERIODOS = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
];

function parseCurrency(v?: string): number {
  if (!v) return 0;
  const n = v.replace(/[^\d]/g, "");
  return parseFloat(n) / 100 || 0;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isVencido(c: Conta): boolean {
  if (c.status === "pago" || c.status === "cancelado") return false;
  if (!c.dataVencimento) return false;
  const digits = c.dataVencimento.replace(/\D/g, "");
  let dt: Date;
  if (digits.length === 8) {
    dt = new Date(parseInt(digits.slice(4, 8)), parseInt(digits.slice(2, 4)) - 1, parseInt(digits.slice(0, 2)));
  } else {
    dt = new Date(c.dataVencimento);
  }
  return dt < new Date(new Date().toDateString());
}

type ViewMode = "tabela" | "cards";

export default function ContasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"receber" | "pagar">("receber");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [periodoFilter, setPeriodoFilter] = useState("mes");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Conta>>(empty);
  const [formTab, setFormTab] = useState<"dados" | "pagamento" | "obs">("dados");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [honorariosOpen, setHonorariosOpen] = useState(false);
  const [honorariosForm, setHonorariosForm] = useState<HonorariosForm>(emptyHonorarios());

  const { data: contas = [], isLoading } = useQuery<Conta[]>({
    queryKey: ["contas", escritorioId],
    queryFn: () => API.get(`/contas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Conta>) =>
      editId ? API.put(`/contas/${editId}`, data) : API.post("/contas", { ...data, escritorioId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas", escritorioId] });
      toast({ title: editId ? "Fatura atualizada!" : "Fatura criada!" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/contas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas", escritorioId] });
      toast({ title: "Fatura excluída" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    contas.filter(c => {
      if (c.tipo !== tab) return false;
      const effectiveStatus = (c.status === "pendente" && isVencido(c)) ? "vencido" : c.status;
      if (statusFilter !== "todos" && statusFilter === "vencido" && effectiveStatus !== "vencido") return false;
      if (statusFilter !== "todos" && statusFilter !== "vencido" && c.status !== statusFilter) return false;
      if (categoriaFilter !== "todas" && c.categoria !== categoriaFilter) return false;
      if (clienteFilter !== "todos" && String(c.clienteId || "") !== clienteFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cn = clientes.find(x => x.id === c.clienteId);
        const nome = (cn?.razaoSocial || cn?.nomeFantasia || "").toLowerCase();
        if (!c.descricao.toLowerCase().includes(q) && !nome.includes(q) && !(c.numeroDocumento || "").toLowerCase().includes(q) && !(c.categoria || "").toLowerCase().includes(q)) return false;
      }
      return true;
    }), [contas, tab, statusFilter, categoriaFilter, clienteFilter, search, clientes]);

  const soma = (tipo: string, status?: string | string[]) =>
    contas.filter(c => c.tipo === tipo && (!status || (Array.isArray(status) ? status.includes(c.status) : c.status === status)))
      .reduce((acc, c) => acc + parseCurrency(c.valor), 0);

  const somaVencidos = (tipo: string) =>
    contas.filter(c => c.tipo === tipo && isVencido(c)).reduce((acc, c) => acc + parseCurrency(c.valor), 0);

  const nomeCliente = (id?: number) => {
    if (!id) return "—";
    const c = clientes.find(x => x.id === id);
    return c ? (c.razaoSocial || c.nomeFantasia || `#${id}`) : `#${id}`;
  };

  const openNew = () => { setForm({ ...empty, tipo: tab }); setEditId(null); setFormTab("dados"); setOpen(true); };
  const openEdit = (c: Conta) => { setForm(c); setEditId(c.id); setFormTab("dados"); setOpen(true); };

  const handleSave = () => {
    if (!form.descricao?.trim()) {
      toast({ title: "Informe a descrição da fatura", variant: "destructive" });
      return;
    }
    save.mutate(form);
  };

  const openHonorarios = () => {
    setHonorariosForm(emptyHonorarios());
    setHonorariosOpen(true);
  };

  const selectedClienteHon = clientes.find(c => String(c.id) === honorariosForm.clienteId);
  const clienteCnpjCpf = selectedClienteHon?.cnpj || selectedClienteHon?.cpf || "";

  const updateServico = (id: string, field: keyof ServicoItem, value: string) => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: prev.servicos.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  };

  const addServico = () => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: [...prev.servicos, { id: crypto.randomUUID(), descricao: "", valor: "" }],
    }));
  };

  const removeServico = (id: string) => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: prev.servicos.length > 1 ? prev.servicos.filter(s => s.id !== id) : prev.servicos,
    }));
  };

  const totalHonorarios = honorariosForm.servicos.reduce((acc, s) => acc + parseCurrency(s.valor), 0);

  const handleGerarCobranca = () => {
    if (!honorariosForm.clienteId) {
      toast({ title: "Selecione o cliente", variant: "destructive" });
      return;
    }
    if (!honorariosForm.dataVencimento) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }
    const servicosValidos = honorariosForm.servicos.filter(s => s.descricao.trim() && s.valor);
    if (servicosValidos.length === 0) {
      toast({ title: "Adicione pelo menos um serviço", variant: "destructive" });
      return;
    }

    const mesIdx = MESES.indexOf(honorariosForm.mes) + 1;
    const competencia = `${String(mesIdx).padStart(2, "0")}/${honorariosForm.ano}`;
    const descricaoServicos = servicosValidos.map(s => s.descricao).join(", ");

    save.mutate({
      tipo: "receber",
      status: "pendente",
      descricao: `Honorários - ${descricaoServicos}`,
      valor: fmtCurrency(totalHonorarios),
      categoria: "Honorários",
      clienteId: parseInt(honorariosForm.clienteId),
      competencia,
      dataEmissao: honorariosForm.dataEmissao,
      dataVencimento: honorariosForm.dataVencimento,
      numeroDocumento: honorariosForm.numeroRecibo || undefined,
      observacoes: servicosValidos.map(s => `${s.descricao}: ${s.valor}`).join("\n"),
    }, {
      onSuccess: () => {
        setHonorariosOpen(false);
        toast({ title: "Cobrança de honorários gerada!" });
      },
    });
  };

  if (!escritorioId) return <AppLayout title="Contas a Receber/Pagar"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Contas a Receber / Pagar">
      <div className="space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total a Receber",
              value: fmtCurrency(soma("receber", "pendente")),
              sub: `${contas.filter(c => c.tipo === "receber" && c.status === "pendente").length} faturas`,
              icon: TrendingUp, color: "text-green-400", bg: "from-green-500/15 to-green-600/5", border: "border-green-500/20"
            },
            {
              label: "Total a Pagar",
              value: fmtCurrency(soma("pagar", "pendente")),
              sub: `${contas.filter(c => c.tipo === "pagar" && c.status === "pendente").length} faturas`,
              icon: TrendingDown, color: "text-red-400", bg: "from-red-500/15 to-red-600/5", border: "border-red-500/20"
            },
            {
              label: "Vencidos",
              value: fmtCurrency(somaVencidos("receber") + somaVencidos("pagar")),
              sub: `${contas.filter(c => isVencido(c)).length} faturas vencidas`,
              icon: AlertCircle, color: "text-yellow-400", bg: "from-yellow-500/15 to-yellow-600/5", border: "border-yellow-500/20"
            },
            {
              label: "Recebido (Mês)",
              value: fmtCurrency(soma("receber", "pago")),
              sub: `${contas.filter(c => c.tipo === "receber" && c.status === "pago").length} pagas`,
              icon: CheckCircle2, color: "text-primary", bg: "from-primary/15 to-primary/5", border: "border-primary/20"
            },
          ].map(k => (
            <Card key={k.label} className={`bg-gradient-to-br ${k.bg} border ${k.border} shadow-lg`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{k.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center`}>
                    <k.icon className={`w-5 h-5 ${k.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border/40 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-border/30">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, fatura ou contrato..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-background h-10"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`gap-1.5 ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : ""}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {statusFilter === "todos" ? "Todos" : statusFilter === "vencido" ? "Pendentes e Vencidos" : STATUS_MAP[statusFilter]?.label || statusFilter}
                  <ChevronDown className="w-3 h-3" />
                </Button>

                <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                  <SelectTrigger className="w-32 h-9 bg-background text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex bg-secondary/50 rounded-lg border border-border/40 p-0.5">
                  <button
                    onClick={() => setViewMode("tabela")}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "tabela" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-6 w-px bg-border/40 hidden lg:block" />

                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="bg-secondary/50 border border-border/40 h-9">
                    <TabsTrigger value="receber" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-xs h-7">
                      <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Receber
                    </TabsTrigger>
                    <TabsTrigger value="pagar" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs h-7">
                      <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Pagar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button onClick={openHonorarios} variant="outline" className="gap-1.5 shrink-0 h-9 text-sm border-primary/30 text-primary hover:bg-primary/10">
                  <Sparkles className="w-4 h-4" /> Gerar Honorários
                </Button>

                <Button onClick={openNew} className="bg-gradient-to-r from-primary to-indigo-600 gap-1.5 shrink-0 h-9 text-sm">
                  <Plus className="w-4 h-4" /> Nova Fatura
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/20">
                <Badge
                  variant="outline"
                  className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === "todos" ? "bg-primary/15 text-primary border-primary/30" : "hover:bg-white/5"}`}
                  onClick={() => setStatusFilter("todos")}
                >
                  Todos
                </Badge>
                <Badge
                  variant="outline"
                  className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === "vencido" ? "bg-red-500/15 text-red-400 border-red-500/30" : "hover:bg-white/5"}`}
                  onClick={() => setStatusFilter(statusFilter === "vencido" ? "todos" : "vencido")}
                >
                  Pendentes e Vencidos
                </Badge>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <Badge
                    key={k}
                    variant="outline"
                    className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === k ? v.color : "hover:bg-white/5"}`}
                    onClick={() => setStatusFilter(statusFilter === k ? "todos" : k)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${v.dotColor} mr-1.5`} />
                    {v.label}
                  </Badge>
                ))}
                <div className="h-5 w-px bg-border/40" />
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-36 h-7 bg-background text-xs border-dashed">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas categorias</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="w-44 h-7 bg-background text-xs border-dashed">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <DollarSign className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhuma fatura encontrada</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {contas.filter(c => c.tipo === tab).length === 0 ? "Crie a primeira fatura" : "Ajuste os filtros de busca"}
                </p>
              </div>
            ) : viewMode === "tabela" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 bg-muted/20">
                      <TableHead className="w-[28%]">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">Descrição</span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <span className="text-[11px] uppercase tracking-wider">Cliente</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Categoria</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">Valor</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Vencimento</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Competência</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Status</span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="text-[11px] uppercase tracking-wider">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const vencido = isVencido(c);
                      const effectiveStatus = vencido && c.status === "pendente" ? "vencido" : c.status;
                      const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pendente;
                      return (
                        <TableRow key={c.id} className="border-border/20 hover:bg-white/3 group">
                          <TableCell className="py-3.5">
                            <div>
                              <p className="font-medium text-foreground text-sm">{c.descricao}</p>
                              {c.numeroDocumento && (
                                <span className="text-[10px] text-muted-foreground font-mono">Doc: {c.numeroDocumento}</span>
                              )}
                              {c.parcela && (
                                <span className="text-[10px] text-muted-foreground ml-2">Parcela: {c.parcela}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">{nomeCliente(c.clienteId)}</span>
                          </TableCell>
                          <TableCell>
                            {c.categoria && (
                              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">{c.categoria}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-mono font-semibold text-sm ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                              {c.valor || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-mono ${vencido ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                              {vencido && <AlertCircle className="w-3 h-3 inline mr-1" />}
                              {c.dataVencimento || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-mono">{c.competencia || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor} mr-1`} />
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {c.status === "pendente" && (
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => save.mutate({ ...c, status: "pago", dataPagamento: new Date().toLocaleDateString("pt-BR") })}
                                  className="h-7 w-7 text-green-400 hover:bg-green-500/10"
                                  title="Marcar como pago"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-7 w-7 text-muted-foreground hover:text-white">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setDeleteTarget({ id: c.id, name: c.descricao })}
                                className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {filtered.map(c => {
                  const vencido = isVencido(c);
                  const effectiveStatus = vencido && c.status === "pendente" ? "vencido" : c.status;
                  const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pendente;
                  return (
                    <Card key={c.id} className={`bg-card border-border/30 hover:border-border/50 transition-all group ${vencido ? "border-red-500/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-sm text-foreground">{c.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{nomeCliente(c.clienteId)}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${st.color} shrink-0`}>
                            {st.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-bold text-lg ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                            {c.valor || "R$ 0,00"}
                          </span>
                          <span className={`text-xs font-mono ${vencido ? "text-red-400" : "text-muted-foreground"}`}>
                            {c.dataVencimento || "—"}
                          </span>
                        </div>
                        {(c.categoria || c.competencia) && (
                          <div className="flex items-center gap-2 mt-2">
                            {c.categoria && <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">{c.categoria}</span>}
                            {c.competencia && <span className="text-[10px] text-primary/70 font-mono">{c.competencia}</span>}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status === "pendente" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:bg-green-500/10 gap-1"
                              onClick={() => save.mutate({ ...c, status: "pago", dataPagamento: new Date().toLocaleDateString("pt-BR") })}>
                              <CheckCircle2 className="w-3 h-3" /> Pagar
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(c)}>
                            <Edit className="w-3 h-3" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:bg-red-500/10 gap-1 ml-auto"
                            onClick={() => setDeleteTarget({ id: c.id, name: c.descricao })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/20 bg-muted/10">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} de {contas.filter(c => c.tipo === tab).length} faturas
                </span>
                <span className={`text-sm font-semibold font-mono ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                  Total: {fmtCurrency(filtered.reduce((acc, c) => acc + parseCurrency(c.valor), 0))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { del.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        itemName={deleteTarget?.name}
      />

      <Dialog open={honorariosOpen} onOpenChange={setHonorariosOpen}>
        <DialogContent className="max-w-3xl p-0 bg-card border-border/50 max-h-[92vh] overflow-hidden rounded-xl">
          <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                Cobrança de Honorários
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                Gere cobranças profissionais para seus clientes
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-200px)] space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Dados do Cliente</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Razão Social do Cliente <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={honorariosForm.clienteId || "__none__"}
                    onValueChange={v => setHonorariosForm(prev => ({ ...prev, clienteId: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione um cliente</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ/CPF</Label>
                  <Input
                    value={clienteCnpjCpf ? (clienteCnpjCpf.length > 11 ? formatters.cnpj(clienteCnpjCpf) : formatters.cpf(clienteCnpjCpf)) : ""}
                    readOnly
                    className="bg-muted/50 h-10 font-mono text-muted-foreground"
                    placeholder="Preenchido automaticamente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Mês <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={honorariosForm.mes}
                    onValueChange={v => setHonorariosForm(prev => ({ ...prev, mes: v }))}
                  >
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Ano <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={honorariosForm.ano}
                    onValueChange={v => setHonorariosForm(prev => ({ ...prev, ano: v }))}
                  >
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i)).map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Emissão</Label>
                  <Input
                    value={honorariosForm.dataEmissao}
                    onChange={e => setHonorariosForm(prev => ({ ...prev, dataEmissao: formatters.date(e.target.value) }))}
                    className="bg-background h-10 font-mono"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Vencimento <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={honorariosForm.dataVencimento}
                    onChange={e => setHonorariosForm(prev => ({ ...prev, dataVencimento: formatters.date(e.target.value) }))}
                    className="bg-background h-10 font-mono"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nº Recibo</Label>
                  <Input
                    value={honorariosForm.numeroRecibo}
                    onChange={e => setHonorariosForm(prev => ({ ...prev, numeroRecibo: e.target.value }))}
                    className="bg-background h-10"
                    placeholder="Automático"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Serviços</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addServico} className="gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>

              <div className="space-y-3">
                {honorariosForm.servicos.map((servico, idx) => (
                  <div key={servico.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                    <span className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary mt-1 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição do Serviço</Label>
                        <Input
                          value={servico.descricao}
                          onChange={e => updateServico(servico.id, "descricao", e.target.value)}
                          className="bg-background h-10"
                          placeholder="Ex: Honorários contábeis, Folha de pagamento..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor</Label>
                        <Input
                          value={servico.valor}
                          onChange={e => updateServico(servico.id, "valor", formatters.currency(e.target.value))}
                          className="bg-background h-10 font-mono"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>
                    {honorariosForm.servicos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeServico(servico.id)}
                        className="h-8 w-8 text-red-400 hover:bg-red-500/10 mt-6 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {totalHonorarios > 0 && (
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/30">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                    <p className="text-2xl font-bold text-green-400 font-mono">{fmtCurrency(totalHonorarios)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <Button variant="ghost" onClick={() => setHonorariosOpen(false)} className="text-muted-foreground gap-2">
              Cancelar
            </Button>
            <Button
              onClick={handleGerarCobranca}
              disabled={save.isPending || !honorariosForm.clienteId || !honorariosForm.dataVencimento}
              className="gap-2 px-6 shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Sparkles className="w-4 h-4" />
              Gerar Cobrança
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 bg-card border-border/50 max-h-[92vh] overflow-hidden rounded-xl">
          <div className={`relative px-6 pt-5 pb-4 ${tab === "receber" ? "bg-gradient-to-r from-green-600/80 via-emerald-600/70 to-teal-600/60" : "bg-gradient-to-r from-red-600/80 via-rose-600/70 to-pink-600/60"}`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                {editId ? "Editar Fatura" : "Nova Fatura"}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                {tab === "receber" ? "Conta a receber" : "Conta a pagar"} — {editId ? "edite os dados abaixo" : "preencha os dados da nova fatura"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex border-b border-border/40 bg-muted/30">
            {([
              { key: "dados", label: "Dados da Fatura", icon: FileText },
              { key: "pagamento", label: "Pagamento", icon: CreditCard },
              { key: "obs", label: "Observações", icon: Receipt },
            ] as { key: typeof formTab; label: string; icon: any }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setFormTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                  formTab === t.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-250px)] space-y-5">
            {formTab === "dados" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({...p, tipo: v}))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receber">A Receber</SelectItem>
                        <SelectItem value="pagar">A Pagar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${v.dotColor}`} />
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição <span className="text-red-400">*</span></Label>
                  <Input value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background h-10" placeholder="Ex: Honorários contábeis - Janeiro/2026" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor</Label>
                    <Input value={form.valor||""} onChange={e=>setForm(p=>({...p,valor:formatters.currency(e.target.value)}))} className="bg-background h-10 font-mono" placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Categoria</Label>
                    <Select value={form.categoria || "__none__"} onValueChange={v => setForm(p => ({...p, categoria: v === "__none__" ? "" : v}))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Selecione —</SelectItem>
                        {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</Label>
                    <Select
                      value={form.clienteId ? String(form.clienteId) : "__none__"}
                      onValueChange={v => setForm(p => ({...p, clienteId: v === "__none__" ? undefined : parseInt(v)}))}
                    >
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Competência</Label>
                    <Input
                      value={form.competencia||""}
                      onChange={e=>setForm(p=>({...p,competencia:formatters.competencia(e.target.value)}))}
                      className="bg-background h-10 font-mono"
                      placeholder="MM/AAAA"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nº Documento</Label>
                    <Input value={form.numeroDocumento||""} onChange={e=>setForm(p=>({...p,numeroDocumento:e.target.value}))} className="bg-background h-10" placeholder="NF, Boleto, etc." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Parcela</Label>
                    <Input value={form.parcela||""} onChange={e=>setForm(p=>({...p,parcela:e.target.value}))} className="bg-background h-10" placeholder="1/3, 2/3..." />
                  </div>
                </div>
              </>
            )}

            {formTab === "pagamento" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data Emissão</Label>
                    <Input value={form.dataEmissao||""} onChange={e=>setForm(p=>({...p,dataEmissao:formatters.date(e.target.value)}))} className="bg-background h-10 font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Vencimento</Label>
                    <Input value={form.dataVencimento||""} onChange={e=>setForm(p=>({...p,dataVencimento:formatters.date(e.target.value)}))} className="bg-background h-10 font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Data Pagamento</Label>
                    <Input value={form.dataPagamento||""} onChange={e=>setForm(p=>({...p,dataPagamento:formatters.date(e.target.value)}))} className="bg-background h-10 font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Forma de Pagamento</Label>
                    <Select value={form.formaPagamento || "__none__"} onValueChange={v => setForm(p => ({...p, formaPagamento: v === "__none__" ? "" : v}))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Selecione —</SelectItem>
                        {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {formTab === "obs" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Observações</Label>
                <Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none min-h-[160px]" rows={6} placeholder="Anotações, informações complementares..." />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground gap-2">
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={save.isPending || !form.descricao?.trim()}
              className={`gap-2 px-6 shadow-lg text-white ${tab === "receber" ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20" : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/20"}`}
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              {editId ? "Salvar Alterações" : "Criar Fatura"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
