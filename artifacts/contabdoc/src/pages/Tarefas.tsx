import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import {
  Loader2, Plus, Edit, Trash2, Search, CheckSquare, Square,
  Clock, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  CalendarDays, User, Flag, Tag, Repeat, ChevronDown, Filter,
  AlertTriangle, CheckCheck
} from "lucide-react";

interface Tarefa {
  id: number;
  escritorioId: number;
  clienteId?: number;
  titulo: string;
  descricao?: string;
  tipo?: string;
  prioridade: string;
  status: string;
  dataVencimento?: string;
  dataConclusao?: string;
  responsavel?: string;
  recorrencia?: string;
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

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pendente:     { label: "Pendente",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",  icon: Clock },
  em_andamento: { label: "Em Andamento", color: "bg-blue-500/20 text-blue-400 border-blue-500/30",        icon: RefreshCw },
  aguardando:   { label: "Aguardando",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30",  icon: AlertCircle },
  concluida:    { label: "Concluída",    color: "bg-green-500/20 text-green-400 border-green-500/30",     icon: CheckCircle2 },
  cancelada:    { label: "Cancelada",    color: "bg-red-500/20 text-red-400 border-red-500/30",           icon: XCircle },
};

const PRIORIDADE_MAP: Record<string, { label: string; color: string }> = {
  urgente: { label: "Urgente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  alta:    { label: "Alta",    color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  media:   { label: "Média",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  baixa:   { label: "Baixa",   color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const TIPOS = [
  "Contabilidade", "Fiscal", "Pessoal", "Trabalhista",
  "Departamento Pessoal", "Societário", "Financeiro", "Jurídico",
  "eSocial", "SPED", "DCTF", "GFIP / SEFIP", "REINF",
  "Certidão Negativa", "Outro",
];

const RECORRENCIAS = [
  { value: "unica",      label: "Única (sem repetição)" },
  { value: "mensal",     label: "Mensal" },
  { value: "bimestral",  label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral",  label: "Semestral" },
  { value: "anual",      label: "Anual" },
];

const EMPTY: Partial<Tarefa> = {
  titulo: "", descricao: "", tipo: "", prioridade: "media",
  status: "pendente", dataVencimento: "", responsavel: "",
  recorrencia: "unica", observacoes: "",
};

function isAtrasada(t: Tarefa): boolean {
  if (!t.dataVencimento) return false;
  if (t.status === "concluida" || t.status === "cancelada") return false;
  return new Date(t.dataVencimento) < new Date(new Date().toDateString());
}

function formatDate(d?: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export default function TarefasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Tarefa>>(EMPTY);

  const { data: tarefas = [], isLoading } = useQuery<Tarefa[]>({
    queryKey: ["tarefas", escritorioId],
    queryFn: () => API.get(`/tarefas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<Tarefa>) =>
      editId
        ? API.put(`/tarefas/${editId}`, data)
        : API.post("/tarefas", { ...data, escritorioId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas", escritorioId] });
      toast({ title: editId ? "Tarefa atualizada!" : "Tarefa criada!" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => API.del(`/tarefas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas", escritorioId] });
      toast({ title: "Tarefa excluída" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      API.put(`/tarefas/${id}`, {
        status,
        dataConclusao: status === "concluida" ? new Date().toISOString().split("T")[0] : "",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas", escritorioId] }),
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditId(t.id);
    setForm({
      titulo: t.titulo, descricao: t.descricao || "", tipo: t.tipo || "",
      prioridade: t.prioridade, status: t.status,
      dataVencimento: t.dataVencimento || "", dataConclusao: t.dataConclusao || "",
      responsavel: t.responsavel || "", recorrencia: t.recorrencia || "unica",
      observacoes: t.observacoes || "", clienteId: t.clienteId,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.titulo?.trim()) {
      toast({ title: "Informe o título da tarefa", variant: "destructive" }); return;
    }
    saveMut.mutate(form);
  };

  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (statusFilter !== "todos" && statusFilter !== "atrasadas" && t.status !== statusFilter) return false;
      if (statusFilter === "atrasadas" && !isAtrasada(t)) return false;
      if (prioridadeFilter !== "todas" && t.prioridade !== prioridadeFilter) return false;
      if (tipoFilter !== "todos" && t.tipo !== tipoFilter) return false;
      if (clienteFilter !== "todos" && String(t.clienteId || "") !== clienteFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const clienteNome = clientes.find(c => c.id === t.clienteId);
        const cn = (clienteNome?.razaoSocial || clienteNome?.nomeFantasia || "").toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !cn.includes(q) && !(t.tipo || "").toLowerCase().includes(q) && !(t.responsavel || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tarefas, statusFilter, prioridadeFilter, tipoFilter, clienteFilter, search, clientes]);

  const stats = useMemo(() => ({
    total:       tarefas.length,
    pendentes:   tarefas.filter(t => t.status === "pendente").length,
    andamento:   tarefas.filter(t => t.status === "em_andamento").length,
    atrasadas:   tarefas.filter(t => isAtrasada(t)).length,
    concluidas:  tarefas.filter(t => t.status === "concluida").length,
  }), [tarefas]);

  const nomeCliente = (id?: number) => {
    if (!id) return "—";
    const c = clientes.find(x => x.id === id);
    return c ? (c.razaoSocial || c.nomeFantasia || `#${id}`) : `#${id}`;
  };

  if (!escritorioId) return <SemEscritorio />;

  return (
    <AppLayout title="Tarefas" icon={<CheckSquare className="w-5 h-5" />}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",       value: stats.total,     color: "text-white",         icon: CheckSquare,  filter: "todos" },
            { label: "Pendentes",   value: stats.pendentes,  color: "text-yellow-400",   icon: Clock,        filter: "pendente" },
            { label: "Em Andamento",value: stats.andamento,  color: "text-blue-400",     icon: RefreshCw,    filter: "em_andamento" },
            { label: "Atrasadas",   value: stats.atrasadas,  color: "text-red-400",      icon: AlertTriangle,filter: "atrasadas" },
            { label: "Concluídas",  value: stats.concluidas, color: "text-green-400",    icon: CheckCheck,   filter: "concluida" },
          ].map(s => (
            <button
              key={s.filter}
              onClick={() => setStatusFilter(statusFilter === s.filter ? "todos" : s.filter)}
              className={`text-left p-3 rounded-xl border transition-all ${
                statusFilter === s.filter
                  ? "bg-white/8 border-white/20"
                  : "bg-card border-border/40 hover:border-white/15 hover:bg-white/5"
              }`}
            >
              <s.icon className={`w-4 h-4 mb-1.5 ${s.color}`} />
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tarefa..." className="pl-8 bg-background w-52 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 bg-background text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="w-36 h-9 bg-background text-sm">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-40 h-9 bg-background text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clienteFilter} onValueChange={setClienteFilter}>
              <SelectTrigger className="w-44 h-9 bg-background text-sm">
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
          <Button onClick={openNew} className="bg-gradient-to-r from-primary to-indigo-600 gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Nova Tarefa
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-card border-border/40">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {tarefas.length === 0 ? "Crie a primeira tarefa do seu escritório" : "Ajuste os filtros"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="w-10 pl-4 py-3 text-center">✓</th>
                      <th className="px-4 py-3 text-left">Tarefa</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Cliente</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Tipo</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">Prioridade</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Vencimento</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Responsável</th>
                      <th className="px-4 py-3 text-left hidden lg:table-cell">Recorrência</th>
                      <th className="px-4 py-3 text-right pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, idx) => {
                      const atrasada = isAtrasada(t);
                      const concluida = t.status === "concluida";
                      const st = STATUS_MAP[t.status] || STATUS_MAP.pendente;
                      const pr = PRIORIDADE_MAP[t.prioridade] || PRIORIDADE_MAP.media;
                      return (
                        <tr
                          key={t.id}
                          className={`border-b border-border/20 transition-colors hover:bg-white/3 ${idx % 2 === 0 ? "" : "bg-white/[0.01]"} ${concluida ? "opacity-60" : ""}`}
                        >
                          <td className="pl-4 py-3 text-center">
                            <button
                              onClick={() => toggleStatus.mutate({
                                id: t.id,
                                status: concluida ? "pendente" : "concluida",
                              })}
                              className={`w-5 h-5 rounded border transition-colors flex items-center justify-center mx-auto ${
                                concluida
                                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                                  : "border-border/50 text-muted-foreground hover:border-green-500/40 hover:text-green-400"
                              }`}
                            >
                              {concluida ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className={`font-medium truncate ${concluida ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {t.titulo}
                            </p>
                            {t.descricao && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.descricao}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-muted-foreground text-xs truncate block max-w-[140px]">{nomeCliente(t.clienteId)}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {t.tipo && (
                              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">{t.tipo}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variant="outline" className={`text-[10px] ${pr.color}`}>{pr.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`text-xs font-mono ${atrasada ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                              {atrasada && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {formatDate(t.dataVencimento)}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-muted-foreground">{t.responsavel || "—"}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {t.recorrencia && t.recorrencia !== "unica" && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Repeat className="w-3 h-3" />
                                {RECORRENCIAS.find(r => r.value === t.recorrencia)?.label?.split(" ")[0] || t.recorrencia}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => openEdit(t)}
                                className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-white/10"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => { if (confirm(`Excluir "${t.titulo}"?`)) deleteMut.mutate(t.id); }}
                                className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} de {tarefas.length} tarefas
        </p>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              {editId ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editId ? "Editar dados da tarefa" : "Preencha os dados para criar uma nova tarefa"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Título */}
            <div className="space-y-1.5">
              <Label>Título <span className="text-red-400">*</span></Label>
              <Input
                value={form.titulo || ""}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Entregar DAS de Janeiro"
                className="bg-background"
              />
            </div>

            {/* Tipo + Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tipo</Label>
                <Select value={form.tipo || "__none__"} onValueChange={v => setForm(f => ({ ...f, tipo: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem tipo —</SelectItem>
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> Prioridade</Label>
                <Select value={form.prioridade || "media"} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status + Recorrência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status || "pendente"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Recorrência</Label>
                <Select value={form.recorrencia || "unica"} onValueChange={v => setForm(f => ({ ...f, recorrencia: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECORRENCIAS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cliente + Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={form.clienteId ? String(form.clienteId) : "__none__"}
                  onValueChange={v => setForm(f => ({ ...f, clienteId: v === "__none__" ? undefined : parseInt(v) }))}
                >
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Nenhum" /></SelectTrigger>
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
                <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Responsável</Label>
                <Input
                  value={form.responsavel || ""}
                  onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                  placeholder="Nome do responsável"
                  className="bg-background"
                />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Data de Vencimento</Label>
                <Input
                  type="date"
                  value={form.dataVencimento || ""}
                  onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Data de Conclusão</Label>
                <Input
                  type="date"
                  value={form.dataConclusao || ""}
                  onChange={e => setForm(f => ({ ...f, dataConclusao: e.target.value }))}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao || ""}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes da tarefa..."
                className="bg-background resize-none"
                rows={2}
              />
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes || ""}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Informações adicionais..."
                className="bg-background resize-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMut.isPending} className="bg-gradient-to-r from-primary to-indigo-600 gap-2">
                {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? "Salvar Alterações" : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
