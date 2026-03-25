import { useState, useMemo, useRef, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import {
  Loader2, Plus, Edit, Trash2, ClipboardCheck, Search, Clock,
  CheckCircle2, AlertCircle, FileSearch, X, ChevronDown, ChevronUp,
  Sparkles, Hash, Building2, User, Flag, Mail, MessageSquare, Filter,
  ArrowRight, RotateCcw, Calendar, Maximize2, Minimize2
} from "lucide-react";

const BASE_URL = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
  return r.json();
}

interface Processo {
  id: number; escritorioId: number; clienteId?: number | null; numero: string;
  tipo?: string; orgao?: string; protocoloOrgao?: string; prioridade?: string;
  tribunal?: string; vara?: string; comarca?: string;
  descricao?: string; descricaoIa?: string; valorCausa?: string;
  status: string; ccEmail?: string; ccWhatsapp?: string;
  dataAbertura?: string; dataUltimoAndamento?: string; dataEncerramento?: string;
  observacoes?: string;
}

interface Cliente { id: number; razaoSocial?: string; nomeFantasia?: string; cnpj?: string; }

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  em_andamento:      { label: "Em Andamento",       color: "bg-blue-500/15 text-blue-400 border-blue-500/25",   dot: "bg-blue-400" },
  aguardando_docs:   { label: "Aguard. Documentos", color: "bg-orange-500/15 text-orange-400 border-orange-500/25", dot: "bg-orange-400" },
  em_processamento:  { label: "Em Processamento",   color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25", dot: "bg-indigo-400" },
  revisao:           { label: "Em Revisão",          color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", dot: "bg-yellow-400" },
  concluido:         { label: "Concluído",           color: "bg-green-500/15 text-green-400 border-green-500/25",  dot: "bg-green-400" },
  entregue:          { label: "Entregue",            color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  cancelado:         { label: "Cancelado",           color: "bg-gray-500/15 text-gray-400 border-gray-500/25",    dot: "bg-gray-400" },
};

const PRIORIDADE_MAP: Record<string, { label: string; dot: string; color: string }> = {
  baixa:   { label: "Baixa",   dot: "bg-gray-400",   color: "text-gray-400" },
  normal:  { label: "Normal",  dot: "bg-blue-400",   color: "text-blue-400" },
  alta:    { label: "Alta",    dot: "bg-amber-400",  color: "text-amber-400" },
  urgente: { label: "Urgente", dot: "bg-red-400",    color: "text-red-400" },
};

const ORGAOS = [
  "Receita Federal (RFB)", "SEFAZ Estadual", "Secretaria Municipal de Finanças",
  "INSS / Previdência Social", "Caixa Econômica Federal (CEF)", "Banco do Brasil",
  "Ministério do Trabalho e Emprego (MTE)", "JUCEB / Junta Comercial",
  "Cartório de Registro de Imóveis", "Cartório de Títulos e Documentos",
  "Tribunal de Contas da União (TCU)", "Tribunal de Contas do Estado",
  "Ministério Público", "Poder Judiciário", "IBAMA", "ANVISA",
  "CREA", "CRC", "CRM", "OAB", "SUSEP", "ANS", "ANATEL",
  "Prefeitura Municipal", "Câmara Municipal", "Outro",
];

const TIPOS_CONTABEIS = [
  "IRPF — Imposto de Renda PF", "IRPJ — Imposto de Renda PJ",
  "Simples Nacional / PGDAS", "eSocial", "SPED Contábil (ECD)",
  "SPED Fiscal (EFD)", "REINF", "DCTF",
  "ECF — Escrituração Contábil Fiscal", "DEFIS", "DAS / Guia Simples",
  "GFIP / SEFIP", "Folha de Pagamento", "DIRF", "BPO Contábil",
  "Abertura de Empresa", "Encerramento de Empresa", "Alteração Contratual",
  "Regularização Fiscal", "Parcelamento de Débitos", "Certidão Negativa de Débitos",
  "Outro",
];

function gerarNumeroProtocolo() {
  const d = new Date();
  const data = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${data}-${rand}`;
}

function TagInput({
  value, onChange, placeholder, icon: Icon, type = "text"
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; icon: any; type?: string;
}) {
  const [input, setInput] = useState("");
  const tags = value ? value.split(";").filter(Boolean) : [];

  const add = (val: string) => {
    const v = val.trim();
    if (!v || tags.includes(v)) { setInput(""); return; }
    const newTags = [...tags, v];
    onChange(newTags.join(";"));
    setInput("");
  };

  const remove = (t: string) => {
    onChange(tags.filter(x => x !== t).join(";"));
  };

  return (
    <div className="min-h-[42px] flex flex-wrap gap-1.5 items-center p-2 rounded-lg border border-border/50 bg-background/60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-0.5" />
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/20 text-xs text-primary font-medium">
          {t}
          <button type="button" onClick={() => remove(t)} className="hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type={type}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); } }}
        onBlur={() => { if (input) add(input); }}
        placeholder={tags.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/50 text-foreground"
      />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.em_andamento;
  return <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />;
}

function PriorDot({ prio }: { prio?: string }) {
  const p = PRIORIDADE_MAP[prio || 'normal'] || PRIORIDADE_MAP.normal;
  return <span className={`w-2 h-2 rounded-full ${p.dot} shrink-0`} />;
}

const emptyProcesso: Partial<Processo> = {
  status: "em_andamento", prioridade: "normal", numero: "",
  ccEmail: "", ccWhatsapp: ""
};

export default function ProcessosPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editId, setEditId]           = useState<number | null>(null);
  const [form, setForm]               = useState<Partial<Processo>>(emptyProcesso);
  const [iaOpen, setIaOpen]           = useState(false);
  const [iaText, setIaText]           = useState("");
  const [iaSending, setIaSending]     = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: processos = [], isLoading } = useQuery<Processo[]>({
    queryKey: ["processos", escritorioId],
    queryFn: () => API.get(`/processos?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes-select", escritorioId],
    queryFn: () => apiFetch(`/api/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Processo>) =>
      editId
        ? API.put(`/processos/${editId}`, data)
        : API.post("/processos", { ...data, escritorioId }),
    onMutate: async (data) => {
      setPanelOpen(false);
      await qc.cancelQueries({ queryKey: ["processos", escritorioId] });
      const previous = qc.getQueryData<Processo[]>(["processos", escritorioId]);
      qc.setQueryData<Processo[]>(["processos", escritorioId], (old = []) =>
        editId ? old.map(i => i.id === editId ? { ...i, ...data } : i)
               : [...old, { id: Date.now(), escritorioId: escritorioId!, ...data } as Processo]
      );
      return { previous };
    },
    onError: (e: Error, _d, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(["processos", escritorioId], ctx.previous);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "✓ Processo salvo!" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["processos", escritorioId] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/processos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos", escritorioId] });
      toast({ title: "Processo excluído" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    processos.filter(p =>
      (statusFilter === "todos" || p.status === statusFilter) &&
      (
        p.numero.toLowerCase().includes(search.toLowerCase()) ||
        (p.tipo || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.orgao || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.vara || "").toLowerCase().includes(search.toLowerCase())
      )
    ), [processos, statusFilter, search]);

  const count = (s: string) => processos.filter(p => p.status === s).length;

  const openNew = () => {
    setForm({ ...emptyProcesso, numero: gerarNumeroProtocolo() });
    setEditId(null); setIaOpen(false); setIaText(""); setPanelOpen(true);
  };

  const openEdit = (p: Processo) => {
    setForm({ ...p });
    setEditId(p.id); setIaOpen(false); setIaText(p.descricaoIa || "");
    setPanelOpen(true);
  };

  const regenerarProtocolo = () => {
    setForm(p => ({ ...p, numero: gerarNumeroProtocolo() }));
  };

  const gerarComIa = async () => {
    if (!form.tipo && !form.orgao) {
      toast({ title: "Preencha o tipo ou órgão primeiro", variant: "destructive" }); return;
    }
    setIaSending(true);
    try {
      const cliente = clientes.find(c => c.id === form.clienteId);
      const nomeCliente = cliente?.nomeFantasia || cliente?.razaoSocial || "";
      const prompt = `Gere uma descrição profissional e objetiva para um processo contábil com os seguintes dados:
- Tipo: ${form.tipo || ""}
- Órgão: ${form.orgao || ""}
- Cliente: ${nomeCliente}
- Status: ${STATUS_MAP[form.status || "em_andamento"]?.label || ""}
Máximo 3 parágrafos curtos. Linguagem formal brasileira.`;

      const r = await fetch(`${BASE_URL}/api/extrair-documento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: "data:text/plain;base64," + btoa(prompt),
          mimeType: "image/jpeg",
          tipoDocumento: "descricao_processo"
        }),
      });
      const { textoCompleto } = await r.json();
      setIaText(textoCompleto || "");
      setForm(p => ({ ...p, descricaoIa: textoCompleto }));
      toast({ title: "✓ Descrição gerada pela IA" });
    } catch {
      toast({ title: "Erro ao gerar descrição", variant: "destructive" });
    } finally { setIaSending(false); }
  };

  const salvarProcesso = () => {
    if (!form.orgao) { toast({ title: "Selecione o Órgão", variant: "destructive" }); return; }
    save.mutate({ ...form, descricaoIa: iaText || form.descricaoIa });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape" && panelOpen) setPanelOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panelOpen]);

  if (!escritorioId) return <AppLayout title="Processos"><SemEscritorio /></AppLayout>;

  const clienteNome = (id?: number | null) => {
    if (!id) return null;
    const c = clientes.find(x => x.id === id);
    return c?.nomeFantasia || c?.razaoSocial || null;
  };

  return (
    <AppLayout title="Processos">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",        value: processos.length, icon: ClipboardCheck, color: "text-primary",     bg: "bg-primary/10" },
          { label: "Aguard. Docs", value: count("aguardando_docs"), icon: FileSearch, color: "text-orange-400", bg: "bg-orange-500/10" },
          { label: "Em Andamento", value: count("em_andamento") + count("em_processamento") + count("revisao"), icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Concluídos",   value: count("concluido") + count("entregue"), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50 hover:border-primary/20 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-border/50">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar processo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-background/60 w-52 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/60 w-44 h-9">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                        {v.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNew} className="bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20 shrink-0 h-9">
              <Plus className="w-4 h-4 mr-2" /> Novo Processo
            </Button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <ClipboardCheck className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">{search || statusFilter !== 'todos' ? 'Nenhum resultado' : 'Nenhum processo cadastrado'}</p>
              {!search && statusFilter === 'todos' && (
                <Button onClick={openNew} variant="link" className="text-primary mt-2">+ Cadastrar primeiro processo</Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map(p => {
                const cn = clienteNome(p.clienteId);
                const s  = STATUS_MAP[p.status] || STATUS_MAP.em_andamento;
                const pr = PRIORIDADE_MAP[p.prioridade || 'normal'] || PRIORIDADE_MAP.normal;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/25 group cursor-pointer transition-colors"
                    onClick={() => openEdit(p)}
                  >
                    <div className="flex flex-col gap-1.5 w-36 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-primary" />
                        <span className="font-mono text-xs text-primary font-semibold truncate">{p.numero}</span>
                      </div>
                      {cn && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{cn}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.tipo || p.orgao || '—'}</p>
                      {p.orgao && p.tipo && <p className="text-xs text-muted-foreground truncate">{p.orgao}</p>}
                      {p.descricao && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{p.descricao}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {p.dataAbertura && (
                        <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />{p.dataAbertura}
                        </span>
                      )}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${pr.color}`}>
                        <PriorDot prio={p.prioridade} />
                        {pr.label}
                      </div>
                      <Badge variant="outline" className={`text-xs border ${s.color}`}>
                        <StatusDot status={p.status} />
                        <span className="ml-1.5">{s.label}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => openEdit(p)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => confirm("Excluir este processo?") && del.mutate(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SLIDE PANEL ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div
            ref={panelRef}
            className="w-full max-w-xl bg-[#0f1929] border-l border-border/60 flex flex-col h-full overflow-hidden shadow-2xl"
            style={{ animation: "slideInRight 0.2s ease-out" }}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">{editId ? "Editar Processo" : "Novo Processo"}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editId ? "Altere os dados e salve" : "Cadastre um novo processo para acompanhamento"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-muted-foreground hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-0">

                {/* Nº Protocolo + Órgão */}
                <div className="grid grid-cols-2 gap-0 border-b border-border/40">
                  <div className="py-4 pr-4 border-r border-border/40">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <Hash className="w-3 h-3" /> Nº PROTOCOLO:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.numero || ""}
                        onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                        className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-white font-mono text-sm focus-visible:ring-0 focus-visible:border-primary"
                        placeholder="20268324-8647"
                      />
                      <button
                        type="button"
                        onClick={regenerarProtocolo}
                        className="text-xs text-muted-foreground hover:text-primary border border-border/50 rounded px-2 py-1 transition-colors shrink-0 hover:border-primary/40"
                        title="Gerar novo protocolo"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      <span
                        className="text-primary/70 cursor-pointer hover:text-primary"
                        onClick={regenerarProtocolo}
                      >
                        Automático
                      </span>
                    </p>
                  </div>

                  <div className="py-4 pl-4">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <Building2 className="w-3 h-3" /> ÓRGÃO <span className="text-red-400">*</span>
                    </Label>
                    <Select value={form.orgao || ""} onValueChange={v => setForm(p => ({ ...p, orgao: v }))}>
                      <SelectTrigger className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus:ring-0 [&>svg]:hidden">
                        <SelectValue placeholder="Selecione o órgão" />
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {ORGAOS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nº Protocolo do Órgão */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                    <Hash className="w-3 h-3" /> Nº PROTOCOLO DO ÓRGÃO:
                  </Label>
                  <Input
                    value={form.protocoloOrgao || ""}
                    onChange={e => setForm(p => ({ ...p, protocoloOrgao: e.target.value }))}
                    placeholder="Número de protocolo emitido pelo órgão"
                    className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus-visible:ring-0 focus-visible:border-primary"
                  />
                </div>

                {/* Tipo de Serviço */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                    <ClipboardCheck className="w-3 h-3" /> TIPO / SERVIÇO
                  </Label>
                  <Select value={form.tipo || ""} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus:ring-0 [&>svg]:hidden">
                      <SelectValue placeholder="Selecione o serviço contábil" />
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TIPOS_CONTABEIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cliente + Prioridade */}
                <div className="grid grid-cols-2 gap-0 border-b border-border/40">
                  <div className="py-4 pr-4 border-r border-border/40">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <User className="w-3 h-3" /> CLIENTE
                    </Label>
                    <Select
                      value={form.clienteId ? String(form.clienteId) : "none"}
                      onValueChange={v => setForm(p => ({ ...p, clienteId: v === "none" ? null : parseInt(v) }))}
                    >
                      <SelectTrigger className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus:ring-0 [&>svg]:hidden">
                        <SelectValue placeholder="Nenhum" />
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </SelectTrigger>
                      <SelectContent className="max-h-52">
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nomeFantasia || c.razaoSocial || `#${c.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="py-4 pl-4">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <Flag className="w-3 h-3" /> PRIORIDADE
                    </Label>
                    <Select value={form.prioridade || "normal"} onValueChange={v => setForm(p => ({ ...p, prioridade: v }))}>
                      <SelectTrigger className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus:ring-0 [&>svg]:hidden">
                        <div className="flex items-center gap-2">
                          <PriorDot prio={form.prioridade} />
                          <SelectValue />
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORIDADE_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                              {v.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2 block">STATUS</Label>
                  <Select value={form.status || "em_andamento"} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm focus:ring-0 [&>svg]:hidden">
                      <div className="flex items-center gap-2">
                        <StatusDot status={form.status || "em_andamento"} />
                        <SelectValue />
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-0 border-b border-border/40">
                  <div className="py-4 pr-4 border-r border-border/40">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <Calendar className="w-3 h-3" /> COMPETÊNCIA / PRAZO
                    </Label>
                    <Input
                      value={form.dataAbertura || ""}
                      onChange={e => setForm(p => ({ ...p, dataAbertura: formatters.date(e.target.value) }))}
                      placeholder="DD/MM/AAAA"
                      className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm font-mono focus-visible:ring-0 focus-visible:border-primary"
                      maxLength={10}
                    />
                  </div>
                  <div className="py-4 pl-4">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-2">
                      <Calendar className="w-3 h-3" /> ÚLT. ANDAMENTO
                    </Label>
                    <Input
                      value={form.dataUltimoAndamento || ""}
                      onChange={e => setForm(p => ({ ...p, dataUltimoAndamento: formatters.date(e.target.value) }))}
                      placeholder="DD/MM/AAAA"
                      className="bg-transparent border-0 border-b border-border/50 rounded-none px-0 h-8 text-sm font-mono focus-visible:ring-0 focus-visible:border-primary"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* CC Email */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-1">
                    <Mail className="w-3 h-3" /> CÓPIA DE E-MAIL (CC)
                  </Label>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">Adicione e-mails para receber cópia das notificações</p>
                  <TagInput
                    value={form.ccEmail || ""}
                    onChange={v => setForm(p => ({ ...p, ccEmail: v }))}
                    placeholder="Digite um e-mail e pressione Enter"
                    icon={Mail}
                    type="email"
                  />
                </div>

                {/* CC WhatsApp */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1 mb-1">
                    <MessageSquare className="w-3 h-3" /> CÓPIA DE WHATSAPP (CC)
                  </Label>
                  <p className="text-[10px] text-muted-foreground/50 mb-2">Adicione números para receber cópia das notificações</p>
                  <TagInput
                    value={form.ccWhatsapp || ""}
                    onChange={v => setForm(p => ({ ...p, ccWhatsapp: v }))}
                    placeholder="(99) 99999-9999 e pressione Enter"
                    icon={MessageSquare}
                    type="tel"
                  />
                </div>

                {/* Descrição */}
                <div className="py-4 border-b border-border/40">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2 block">DESCRIÇÃO / ANDAMENTO</Label>
                  <Textarea
                    value={form.descricao || ""}
                    onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Descreva o andamento do processo..."
                    className="bg-transparent border-0 resize-none min-h-[80px] px-0 focus-visible:ring-0 text-sm"
                    rows={3}
                  />
                </div>

                {/* Assistente de IA */}
                <div className="py-4">
                  <button
                    type="button"
                    onClick={() => setIaOpen(v => !v)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">Assistente de IA</p>
                        <p className="text-xs text-muted-foreground">Gere, corrija ou aprimore o texto da descrição</p>
                      </div>
                    </div>
                    {iaOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {iaOpen && (
                    <div className="mt-3 space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/40">
                      <Textarea
                        value={iaText}
                        onChange={e => { setIaText(e.target.value); setForm(p => ({ ...p, descricaoIa: e.target.value })); }}
                        placeholder="A descrição gerada pela IA aparecerá aqui..."
                        className="bg-background/60 resize-none min-h-[120px] text-sm"
                        rows={5}
                      />
                      <Button
                        type="button"
                        onClick={gerarComIa}
                        disabled={iaSending}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 w-full"
                      >
                        {iaSending ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Gerar descrição com IA</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between shrink-0 bg-[#0f1929]">
              <Button variant="ghost" onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-white">
                Cancelar
              </Button>
              <Button
                onClick={salvarProcesso}
                disabled={save.isPending}
                className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 px-6"
              >
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editId ? "Salvar Alterações" : "Cadastrar Processo"}
                {!save.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </AppLayout>
  );
}
