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
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Loader2, Plus, Edit, Trash2, Search, CheckSquare, Square,
  Clock, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  CalendarDays, User, Flag, Tag, Repeat, Building2,
  AlertTriangle, CheckCheck, FileText, Hash, Briefcase,
  Calendar, LayoutList, X, MessageSquarePlus, MessageCircle
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
  competencia?: string;
  departamento?: string;
  dataInicio?: string;
  dataVencimento?: string;
  dataConclusao?: string;
  responsavel?: string;
  recorrencia?: string;
  qtdRecorrencias?: number;
  tags?: string;
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

interface ObsEntry {
  id: string;
  texto: string;
  data: string;
  autor: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any; dotColor: string }> = {
  pendente:     { label: "Pendente",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",  icon: Clock,         dotColor: "bg-yellow-400" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-500/20 text-blue-400 border-blue-500/30",        icon: RefreshCw,     dotColor: "bg-blue-400" },
  aguardando:   { label: "Aguardando",   color: "bg-purple-500/20 text-purple-400 border-purple-500/30",  icon: AlertCircle,   dotColor: "bg-purple-400" },
  concluida:    { label: "Concluída",    color: "bg-green-500/20 text-green-400 border-green-500/30",     icon: CheckCircle2,  dotColor: "bg-green-400" },
  cancelada:    { label: "Cancelada",    color: "bg-red-500/20 text-red-400 border-red-500/30",           icon: XCircle,       dotColor: "bg-red-400" },
};

const PRIORIDADE_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
  urgente: { label: "Urgente", color: "bg-red-500/20 text-red-400 border-red-500/30",         dotColor: "bg-red-400" },
  alta:    { label: "Alta",    color: "bg-orange-500/20 text-orange-400 border-orange-500/30", dotColor: "bg-orange-400" },
  media:   { label: "Média",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dotColor: "bg-yellow-400" },
  baixa:   { label: "Baixa",   color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-400" },
};

const TIPOS = [
  "Contabilidade", "Fiscal", "Pessoal", "Trabalhista",
  "Departamento Pessoal", "Societário", "Financeiro", "Jurídico",
  "eSocial", "SPED", "DCTF", "GFIP / SEFIP", "REINF", "ECD", "ECF",
  "DIRF", "RAIS", "CAGED", "DEFIS", "DASN-SIMEI",
  "Certidão Negativa", "Alvará", "Licença", "Outro",
];

const DEPARTAMENTOS = [
  "Contábil", "Fiscal / Tributário", "Pessoal / RH", "Societário / Legalização",
  "Financeiro", "Administrativo", "Consultoria", "BPO",
];

const RECORRENCIAS = [
  { value: "unica",      label: "Única (sem repetição)" },
  { value: "semanal",    label: "Semanal" },
  { value: "quinzenal",  label: "Quinzenal" },
  { value: "mensal",     label: "Mensal" },
  { value: "bimestral",  label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral",  label: "Semestral" },
  { value: "anual",      label: "Anual" },
];

const EMPTY: Partial<Tarefa> = {
  titulo: "", descricao: "", tipo: "", prioridade: "media",
  status: "pendente", competencia: "", departamento: "",
  dataInicio: "", dataVencimento: "", responsavel: "",
  recorrencia: "unica", qtdRecorrencias: 1, tags: "", observacoes: "",
};

function isAtrasada(t: Tarefa): boolean {
  if (!t.dataVencimento) return false;
  if (t.status === "concluida" || t.status === "cancelada") return false;
  return new Date(t.dataVencimento) < new Date(new Date().toDateString());
}


function parseObservacoes(raw?: string): ObsEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (raw.trim()) {
    return [{ id: "legacy", texto: raw, data: new Date().toISOString(), autor: "Sistema" }];
  }
  return [];
}

function serializeObservacoes(entries: ObsEntry[]): string {
  if (entries.length === 0) return "";
  return JSON.stringify(entries);
}

type FormTab = "dados" | "descricao" | "recorrencia";

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
  const [formTab, setFormTab] = useState<FormTab>("dados");
  const [obsEntries, setObsEntries] = useState<ObsEntry[]>([]);
  const [newObsText, setNewObsText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

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
    setObsEntries([]);
    setNewObsText("");
    setFormTab("dados");
    setOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditId(t.id);
    setForm({
      titulo: t.titulo, descricao: t.descricao || "", tipo: t.tipo || "",
      prioridade: t.prioridade, status: t.status,
      competencia: t.competencia || "", departamento: t.departamento || "",
      dataInicio: t.dataInicio || "",
      dataVencimento: t.dataVencimento || "", dataConclusao: t.dataConclusao || "",
      responsavel: t.responsavel || "", recorrencia: t.recorrencia || "unica",
      qtdRecorrencias: t.qtdRecorrencias || 1,
      tags: t.tags || "", observacoes: t.observacoes || "", clienteId: t.clienteId,
    });
    setObsEntries(parseObservacoes(t.observacoes));
    setNewObsText("");
    setFormTab("dados");
    setOpen(true);
  };

  const addObservacao = () => {
    if (!newObsText.trim()) return;
    const entry: ObsEntry = {
      id: Date.now().toString(36),
      texto: newObsText.trim(),
      data: new Date().toISOString(),
      autor: "Usuário",
    };
    const updated = [entry, ...obsEntries];
    setObsEntries(updated);
    setForm(f => ({ ...f, observacoes: serializeObservacoes(updated) }));
    setNewObsText("");
  };

  const removeObservacao = (id: string) => {
    const updated = obsEntries.filter(e => e.id !== id);
    setObsEntries(updated);
    setForm(f => ({ ...f, observacoes: serializeObservacoes(updated) }));
  };

  const handleSave = () => {
    if (!form.titulo?.trim()) {
      toast({ title: "Informe o título da tarefa", variant: "destructive" });
      setFormTab("dados");
      return;
    }
    const payload = { ...form };
    if (payload.tipo === "__none__" || payload.tipo === "") delete payload.tipo;
    if (payload.departamento === "__none__" || payload.departamento === "") delete payload.departamento;
    if (payload.competencia === "__none__" || payload.competencia === "") delete payload.competencia;
    saveMut.mutate(payload);
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
        if (!t.titulo.toLowerCase().includes(q) && !cn.includes(q) && !(t.tipo || "").toLowerCase().includes(q) && !(t.responsavel || "").toLowerCase().includes(q) && !(t.tags || "").toLowerCase().includes(q)) return false;
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

  const recorrenciaResumo = useMemo(() => {
    const rec = form.recorrencia || "unica";
    if (rec === "unica") return null;
    const q = form.qtdRecorrencias || 1;
    const label = RECORRENCIAS.find(r => r.value === rec)?.label?.split(" ")[0] || rec;
    return `Será criada ${q} tarefa(s) com recorrência ${label.toLowerCase()}`;
  }, [form.recorrencia, form.qtdRecorrencias]);

  if (!escritorioId) return <SemEscritorio />;

  return (
    <AppLayout title="Tarefas" icon={<CheckSquare className="w-5 h-5" />}>
      <div className="space-y-6">

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
                      <th className="w-10 pl-4 py-3 text-center">&#10003;</th>
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
                            {t.competencia && (
                              <span className="text-[10px] text-primary/70 font-mono mr-2">Comp. {t.competencia}</span>
                            )}
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
                              {formatters.displayDate(t.dataVencimento)}
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
                                onClick={() => setDeleteTarget({ id: t.id, name: t.titulo })}
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        itemName={deleteTarget?.name}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 bg-card border-border/50 max-h-[92vh] overflow-hidden rounded-xl">
          <div className="relative bg-gradient-to-r from-primary/90 via-indigo-600/80 to-violet-600/70 px-6 pt-5 pb-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtd3ptMC04aDJ2Mmgtdnptbi0xNmgydjJoLTJ6bTggOGgydjJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                {editId ? "Editar Tarefa" : "Criar Nova Tarefa"}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                {editId ? "Atualize as informações da tarefa abaixo" : "Preencha os dados para criar uma nova obrigação ou tarefa contábil"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex border-b border-border/40 bg-muted/30">
            {([
              { key: "dados", label: "Dados Principais", icon: LayoutList },
              { key: "descricao", label: "Descrição / Observações", icon: FileText },
              { key: "recorrencia", label: "Repetir", icon: Repeat },
            ] as { key: FormTab; label: string; icon: any }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFormTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                  formTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/3"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-240px)]">
            {formTab === "dados" && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    Nome da Tarefa <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={form.titulo || ""}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Entregar DCTF referência 01/2026"
                    className="bg-background h-11 text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Tipo / Obrigação
                    </Label>
                    <Select value={form.tipo || "__none__"} onValueChange={v => setForm(f => ({ ...f, tipo: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Selecione o tipo —</SelectItem>
                        {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> Departamento
                    </Label>
                    <Select value={form.departamento || "__none__"} onValueChange={v => setForm(f => ({ ...f, departamento: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Selecione —</SelectItem>
                        {DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Flag className="w-3 h-3" /> Prioridade
                    </Label>
                    <Select value={form.prioridade || "media"} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                      <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORIDADE_MAP).map(([k, v]) => (
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
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                    <Select value={form.status || "pendente"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
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

                <div className="h-px bg-border/30" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> Cliente
                    </Label>
                    <Select
                      value={form.clienteId ? String(form.clienteId) : "__none__"}
                      onValueChange={v => setForm(f => ({ ...f, clienteId: v === "__none__" ? undefined : parseInt(v) }))}
                    >
                      <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum cliente —</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Responsável
                    </Label>
                    <Input
                      value={form.responsavel || ""}
                      onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                      placeholder="Nome do responsável"
                      className="bg-background h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Competência
                    </Label>
                    <Input
                      value={form.competencia || ""}
                      onChange={e => setForm(f => ({ ...f, competencia: formatters.competencia(e.target.value) }))}
                      placeholder="MM/AAAA"
                      maxLength={7}
                      className="bg-background h-10 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Ex: 01/2026</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3 h-3" /> Tags / Etiquetas
                    </Label>
                    <Input
                      value={form.tags || ""}
                      onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="Ex: urgente, IRPF, folha"
                      className="bg-background h-10"
                    />
                  </div>
                </div>

                <div className="h-px bg-border/30" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" /> Data Início
                    </Label>
                    <Input
                      type="date"
                      value={form.dataInicio || ""}
                      onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                      className="bg-background h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" /> Data de Entrega
                    </Label>
                    <Input
                      type="date"
                      value={form.dataVencimento || ""}
                      onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
                      className="bg-background h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Data Conclusão
                    </Label>
                    <Input
                      type="date"
                      value={form.dataConclusao || ""}
                      onChange={e => setForm(f => ({ ...f, dataConclusao: e.target.value }))}
                      className="bg-background h-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {formTab === "descricao" && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" /> Descrição da Tarefa
                  </Label>
                  <p className="text-xs text-muted-foreground">Detalhe a obrigação, procedimentos e referências necessárias</p>
                  <Textarea
                    value={form.descricao || ""}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Digite uma breve descrição para a tarefa aqui..."
                    className="bg-background resize-none min-h-[140px] text-sm leading-relaxed"
                    rows={6}
                  />
                </div>

                <div className="h-px bg-border/30" />

                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-yellow-400" /> Observações Internas
                  </Label>
                  <p className="text-xs text-muted-foreground">Adicione anotações internas, alertas ou informações complementares</p>

                  <div className="flex gap-2">
                    <Textarea
                      value={newObsText}
                      onChange={e => setNewObsText(e.target.value)}
                      placeholder="Digite uma nova observação..."
                      className="bg-background resize-none text-sm flex-1"
                      rows={2}
                      onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); addObservacao(); } }}
                    />
                    <Button
                      type="button"
                      onClick={addObservacao}
                      disabled={!newObsText.trim()}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white self-end gap-1.5 shrink-0"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </div>

                  {obsEntries.length > 0 && (
                    <div className="space-y-2 mt-3 max-h-[240px] overflow-y-auto pr-1">
                      {obsEntries.map((obs, idx) => (
                        <div key={obs.id} className="group relative rounded-lg border border-border/40 bg-muted/30 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm text-foreground whitespace-pre-wrap">{obs.texto}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(obs.data).toLocaleDateString("pt-BR")} às {new Date(obs.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[10px] text-primary/60">• {obs.autor}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeObservacao(obs.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {obsEntries.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border border-dashed border-border/30 rounded-lg">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Nenhuma observação registrada</p>
                      <p className="text-[10px] opacity-60 mt-0.5">Ctrl+Enter para adicionar rapidamente</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formTab === "recorrencia" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Repeat className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Repetição da Tarefa</h3>
                      <p className="text-xs text-muted-foreground">Configure se esta tarefa deve se repetir automaticamente</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Frequência</Label>
                      <Select value={form.recorrencia || "unica"} onValueChange={v => setForm(f => ({ ...f, recorrencia: v }))}>
                        <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RECORRENCIAS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quantidade de Repetições</Label>
                      <Input
                        type="number" min={1} max={99}
                        value={form.qtdRecorrencias || 1}
                        onChange={e => setForm(f => ({ ...f, qtdRecorrencias: parseInt(e.target.value) || 1 }))}
                        className="bg-background h-10"
                        disabled={!form.recorrencia || form.recorrencia === "unica"}
                      />
                    </div>
                  </div>

                  {recorrenciaResumo && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-primary">{recorrenciaResumo}</span>
                    </div>
                  )}
                </div>

                {(!form.recorrencia || form.recorrencia === "unica") && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Repeat className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma repetição configurada</p>
                    <p className="text-xs mt-1 opacity-70">Selecione uma frequência acima para repetir esta tarefa</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground gap-2">
              <X className="w-4 h-4" /> Descartar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white gap-2 px-6 shadow-lg shadow-green-900/20"
            >
              {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              {editId ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
