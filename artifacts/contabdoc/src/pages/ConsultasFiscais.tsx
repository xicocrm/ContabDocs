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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import {
  Loader2, Plus, Edit, Trash2, Search, Receipt, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Calculator, Building2, Users, Package, MapPin, ExternalLink,
  FileText, ChevronRight, Info, BarChart3
} from "lucide-react";

interface ConsultaFiscal {
  id: number; escritorioId: number; clienteId?: number; tipo: string;
  descricao?: string; resultado?: string; status: string; dataConsulta?: string;
  dataRetorno?: string; responsavel?: string; observacoes?: string;
}

interface Cliente { id: number; razaoSocial: string; nomeFantasia?: string; cnpj?: string; regimeTributario?: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:      { label: "Pendente",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  em_analise:    { label: "Em Análise",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  concluida:     { label: "Concluída",     color: "bg-green-500/20 text-green-400 border-green-500/30" },
  com_pendencia: { label: "Com Pendência", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  arquivada:     { label: "Arquivada",     color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const TIPOS = [
  "Situação CNPJ","Situação CPF","Simples Nacional","Débitos Federais",
  "Débitos Estaduais","Débitos Municipais","Certidão Negativa",
  "Parcelamento PERT","REFIS","Declaração IRPF","Declaração IRPJ",
  "Declaração SPED","Outro",
];

const REGIMES_INFO: Record<string, { label: string; cor: string; aliquotas: string[]; contribuicoes: string[] }> = {
  "Simples Nacional": {
    label: "Simples Nacional",
    cor: "text-green-400",
    aliquotas: ["Anexo I: Comércio 4% a 19%","Anexo II: Indústria 4,5% a 30%","Anexo III: Serviços 6% a 33%","Anexo IV: Serviços 4,5% a 33%","Anexo V: Serviços 15,5% a 30,5%"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: Incluso no DAS","FGTS: 8% sobre salário","RAT/FAP: Incluso no DAS"],
  },
  "Lucro Presumido": {
    label: "Lucro Presumido",
    cor: "text-blue-400",
    aliquotas: ["IRPJ: 15% sobre lucro presumido","CSLL: 9% sobre lucro presumido","PIS: 0,65%","COFINS: 3%"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: 20% sobre folha","FGTS: 8% sobre salário","RAT/FAP: 1% a 3%"],
  },
  "Lucro Real": {
    label: "Lucro Real",
    cor: "text-purple-400",
    aliquotas: ["IRPJ: 15% sobre lucro real (+ 10% adicional acima de R$20k/mês)","CSLL: 9%","PIS: 1,65% (não-cumulativo)","COFINS: 7,6% (não-cumulativo)"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: 20% sobre folha","FGTS: 8% sobre salário","RAT/FAP: 1% a 3%"],
  },
  "MEI": {
    label: "MEI – Microempreendedor Individual",
    cor: "text-orange-400",
    aliquotas: ["DAS fixo: R$ 75,90/mês (comércio/indústria) + ICMS","DAS fixo: R$ 84,90/mês (serviços) + ISS","DAS fixo: R$ 85,90/mês (comércio + serviços)"],
    contribuicoes: ["INSS: 5% sobre salário mínimo","CPP: Incluso no DAS","Sem empregados ou 1 empregado"],
  },
};

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const ICMS_RATES: Record<string, number> = {
  AC:17, AL:17, AP:18, AM:20, BA:19, CE:18, DF:18, ES:17, GO:17, MA:20, MT:17, MS:17,
  MG:18, PA:19, PB:18, PR:19, PE:18, PI:21, RJ:20, RN:18, RS:17, RO:17.5, RR:17, SC:17, SP:18, SE:19, TO:17,
};

const TABS = [
  { id: "faturamento",     label: "Faturamento",          icon: TrendingUp,  cor: "bg-green-500",   corText: "text-green-400"  },
  { id: "memoria",         label: "Memória de Cálculos",  icon: Calculator,  cor: "bg-blue-500",    corText: "text-blue-400"   },
  { id: "cnae",            label: "Consulta CNAE",        icon: Building2,   cor: "bg-purple-500",  corText: "text-purple-400" },
  { id: "previdenciario",  label: "Regime Previdenciário",icon: Users,       cor: "bg-orange-500",  corText: "text-orange-400" },
  { id: "ncm",             label: "Tributação NCM/CFOP",  icon: Package,     cor: "bg-red-500",     corText: "text-red-400"    },
  { id: "difal",           label: "DIFAL / ICMS UF",      icon: MapPin,      cor: "bg-sky-500",     corText: "text-sky-400"    },
];

const empty: Partial<ConsultaFiscal> = { status: "pendente", tipo: "" };

export default function ConsultasFiscaisPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("cnae");

  // Memoria CRUD state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<ConsultaFiscal>>(empty);

  // CNAE state
  const [cnaeMode, setCnaeMode] = useState<"empresa"|"codigo"|"descricao">("empresa");
  const [cnaeEmpresa, setCnaeEmpresa] = useState("");
  const [cnaeCodigo, setCnaeCodigo] = useState("");
  const [cnaeDescricao, setCnaeDescricao] = useState("");
  const [cnaeResult, setCnaeResult] = useState<any>(null);
  const [cnaeLoading, setCnaeLoading] = useState(false);
  const [cnaeError, setCnaeError] = useState("");

  // Regime state
  const [regimeEmpresa, setRegimeEmpresa] = useState("");

  // NCM state
  const [ncmCodigo, setNcmCodigo] = useState("");
  const [ncmResult, setNcmResult] = useState<any>(null);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [ncmError, setNcmError] = useState("");

  // DIFAL state
  const [difalOrigem, setDifalOrigem] = useState("");
  const [difalDestino, setDifalDestino] = useState("");
  const [difalValor, setDifalValor] = useState("");
  const [difalResult, setDifalResult] = useState<any>(null);

  // Faturamento state
  const [fatEmpresa, setFatEmpresa] = useState("");
  const [fatPeriodo, setFatPeriodo] = useState(new Date().getFullYear().toString());

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: consultas = [], isLoading } = useQuery<ConsultaFiscal[]>({
    queryKey: ["consultas-fiscais", escritorioId],
    queryFn: () => API.get(`/consultas-fiscais?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<ConsultaFiscal>) =>
      editId ? API.put(`/consultas-fiscais/${editId}`, data) : API.post("/consultas-fiscais", { ...data, escritorioId }),
    onMutate: async (data) => {
      setOpen(false);
      await qc.cancelQueries({ queryKey: ["consultas-fiscais", escritorioId] });
      const previous = qc.getQueryData<ConsultaFiscal[]>(["consultas-fiscais", escritorioId]);
      qc.setQueryData<ConsultaFiscal[]>(["consultas-fiscais", escritorioId], (old = []) =>
        editId ? old.map(i => i.id === editId ? { ...i, ...data } : i)
               : [...old, { id: Date.now(), escritorioId: escritorioId!, ...data } as ConsultaFiscal]
      );
      return { previous };
    },
    onError: (e: Error, _d, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(["consultas-fiscais", escritorioId], ctx.previous);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "✓ Consulta salva!" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/consultas-fiscais/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    consultas.filter(c =>
      (statusFilter === "todos" || c.status === statusFilter) &&
      (c.tipo.toLowerCase().includes(search.toLowerCase()) || (c.descricao||"").toLowerCase().includes(search.toLowerCase()))
    ), [consultas, statusFilter, search]);

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (c: ConsultaFiscal) => { setForm(c); setEditId(c.id); setOpen(true); };

  const clienteById = (id: string) => clientes.find(c => String(c.id) === id);

  const buscarCnae = async () => {
    setCnaeResult(null); setCnaeError(""); setCnaeLoading(true);
    try {
      let url = "";
      if (cnaeMode === "empresa") {
        const cli = clienteById(cnaeEmpresa);
        if (!cli?.cnpj) { setCnaeError("Empresa sem CNPJ cadastrado."); return; }
        const cnpj = cli.cnpj.replace(/\D/g, "");
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!r.ok) throw new Error("CNPJ não encontrado");
        const d = await r.json();
        setCnaeResult({ tipo: "empresa", data: d });
        return;
      } else if (cnaeMode === "codigo") {
        if (!cnaeCodigo.trim()) { setCnaeError("Informe o código CNAE."); return; }
        url = `https://brasilapi.com.br/api/cnae/v1/${cnaeCodigo.replace(/\D/g,"").padStart(7,"0")}`;
      } else {
        if (!cnaeDescricao.trim()) { setCnaeError("Informe a descrição para busca."); return; }
        url = `https://brasilapi.com.br/api/cnae/v1?search=${encodeURIComponent(cnaeDescricao)}`;
      }
      const r = await fetch(url);
      if (!r.ok) throw new Error("CNAE não encontrado");
      const d = await r.json();
      setCnaeResult({ tipo: cnaeMode, data: d });
    } catch (e: any) {
      setCnaeError(e.message || "Erro ao consultar CNAE.");
    } finally {
      setCnaeLoading(false);
    }
  };

  const buscarNcm = async () => {
    setNcmResult(null); setNcmError(""); setNcmLoading(true);
    try {
      if (!ncmCodigo.trim()) { setNcmError("Informe o código NCM."); return; }
      const cod = ncmCodigo.replace(/\D/g,"");
      const r = await fetch(`https://brasilapi.com.br/api/ncm/v1/${cod}`);
      if (!r.ok) throw new Error("NCM não encontrado");
      const d = await r.json();
      setNcmResult(d);
    } catch (e: any) {
      setNcmError(e.message || "Erro ao consultar NCM.");
    } finally {
      setNcmLoading(false);
    }
  };

  const calcularDifal = () => {
    if (!difalOrigem || !difalDestino || !difalValor) return;
    const valor = parseFloat(difalValor.replace(",","."));
    if (isNaN(valor) || valor <= 0) return;
    const icmsOrigem = ICMS_RATES[difalOrigem] || 17;
    const icmsDestino = ICMS_RATES[difalDestino] || 17;
    const aliqInterna = icmsDestino / 100;
    const aliqInterestadual = icmsOrigem <= 17.5 ? 0.12 : 0.12;
    const difal = valor * (aliqInterna - aliqInterestadual);
    const fecp = valor * 0.02;
    setDifalResult({ valor, icmsOrigem, icmsDestino, aliqInterestadual: aliqInterestadual * 100, difal: Math.max(0, difal), fecp, total: Math.max(0, difal) + fecp });
  };

  const regimeCliente = clienteById(regimeEmpresa);
  const regimeInfo = regimeCliente?.regimeTributario ? REGIMES_INFO[regimeCliente.regimeTributario] : null;

  const fatCliente = clienteById(fatEmpresa);
  const fatConsultas = consultas.filter(c => fatEmpresa ? String(c.clienteId) === fatEmpresa : true)
    .filter(c => c.dataConsulta?.includes(fatPeriodo));

  if (!escritorioId) return <AppLayout title="Consultas Fiscais"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Consultas Fiscais">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Central de Consultas Fiscais</h1>
          <p className="text-sm text-muted-foreground">Ferramentas inteligentes para gestão tributária e fiscal</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? `${tab.cor} text-white shadow-lg`
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── FATURAMENTO ── */}
      {activeTab === "faturamento" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold text-foreground">Faturamento por Empresa</h2>
              </div>
              <p className="text-sm text-muted-foreground">Selecione a empresa e o período para visualizar</p>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={fatEmpresa} onValueChange={setFatEmpresa}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as empresas</SelectItem>
                    {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período (ano)</Label>
                <Input
                  value={fatPeriodo}
                  onChange={e => setFatPeriodo(e.target.value)}
                  className="bg-background"
                  placeholder="Ex: 2025"
                  maxLength={4}
                />
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {["Receita Federal","SPED","eSocial","DCTF"].map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                      <ExternalLink className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Resumo de Faturamento</h2>
              {!fatEmpresa ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione uma empresa para ver o resumo</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Os dados virão das consultas cadastradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fatCliente && (
                    <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                      <p className="font-medium text-foreground">{fatCliente.nomeFantasia || fatCliente.razaoSocial}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fatCliente.cnpj} · {fatCliente.regimeTributario || "Regime não informado"}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Consultas no período", value: String(fatConsultas.length), color: "text-blue-400" },
                      { label: "Concluídas", value: String(fatConsultas.filter(c=>c.status==="concluida").length), color: "text-green-400" },
                      { label: "Pendentes", value: String(fatConsultas.filter(c=>c.status==="pendente").length), color: "text-yellow-400" },
                      { label: "Com pendência", value: String(fatConsultas.filter(c=>c.status==="com_pendencia").length), color: "text-red-400" },
                    ].map(k => (
                      <div key={k.label} className="p-3 rounded-lg bg-secondary/30 text-center">
                        <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                      </div>
                    ))}
                  </div>
                  {fatConsultas.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhuma consulta registrada no período {fatPeriodo}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MEMÓRIA DE CÁLCULOS ── */}
      {activeTab === "memoria" && (
        <Card className="bg-card border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-foreground text-lg">Memória de Cálculos Fiscais</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Tipo / descrição..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Calculator className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Consulta" para registrar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Consulta</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="border-border/50 hover:bg-secondary/40">
                      <TableCell className="font-medium text-foreground">{c.tipo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.descricao || "—"}</TableCell>
                      <TableCell className="text-sm">{c.dataConsulta || "—"}</TableCell>
                      <TableCell className="text-sm">{c.dataRetorno || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.responsavel || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${STATUS_MAP[c.status]?.color || ""}`}>{STATUS_MAP[c.status]?.label || c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONSULTA CNAE ── */}
      {activeTab === "cnae" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-foreground">Consulta CNAE – Informações Tributárias</h2>
              </div>
              <p className="text-sm text-muted-foreground">Selecione uma empresa cadastrada ou pesquise manualmente</p>

              <div className="flex gap-2">
                {[{k:"empresa",l:"Por Empresa"},{k:"codigo",l:"Por Código"},{k:"descricao",l:"Por Descrição"}].map(m => (
                  <button
                    key={m.k}
                    onClick={() => { setCnaeMode(m.k as any); setCnaeResult(null); setCnaeError(""); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cnaeMode === m.k ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              {cnaeMode === "empresa" && (
                <div className="space-y-2">
                  <Label>Selecione a empresa</Label>
                  <Select value={cnaeEmpresa} onValueChange={setCnaeEmpresa}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione uma empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cliente cadastrado</SelectItem>}
                      {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cnaeMode === "codigo" && (
                <div className="space-y-2">
                  <Label>Código CNAE</Label>
                  <Input value={cnaeCodigo} onChange={e=>setCnaeCodigo(e.target.value)} className="bg-background font-mono" placeholder="Ex: 6201-5/00" maxLength={10} />
                </div>
              )}

              {cnaeMode === "descricao" && (
                <div className="space-y-2">
                  <Label>Descrição da atividade</Label>
                  <Input value={cnaeDescricao} onChange={e=>setCnaeDescricao(e.target.value)} className="bg-background" placeholder="Ex: desenvolvimento de software" />
                </div>
              )}

              <Button onClick={buscarCnae} disabled={cnaeLoading} className="w-full bg-purple-600 hover:bg-purple-700">
                {cnaeLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Consultando...</> : <><Search className="w-4 h-4 mr-2" />Consultar CNAE</>}
              </Button>

              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { l:"IBGE", url:"https://cnae.ibge.gov.br" },
                    { l:"Simples Nacional", url:"https://www8.receita.fazenda.gov.br/SimplesNacional" },
                    { l:"MEI", url:"https://mei.receita.economia.gov.br" },
                    { l:"LC 116/ISS", url:"https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm" },
                  ].map(f => (
                    <a key={f.l} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                      <ExternalLink className="w-3 h-3" />{f.l}
                    </a>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Informações Tributárias</h2>
              </div>
              {cnaeError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{cnaeError}</div>
              )}
              {!cnaeResult && !cnaeError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione um CNAE para ver as informações tributárias</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Use a busca por empresa ou digite o código manualmente</p>
                </div>
              )}
              {cnaeResult?.tipo === "empresa" && cnaeResult.data && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                    <p className="font-semibold text-foreground">{cnaeResult.data.razao_social}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {cnaeResult.data.cnpj}</p>
                    <Badge variant="outline" className={`mt-2 text-xs ${cnaeResult.data.situacao_cadastral === "ATIVA" ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}`}>{cnaeResult.data.situacao_cadastral}</Badge>
                  </div>
                  {cnaeResult.data.cnae_fiscal && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">CNAE Fiscal Principal</p>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm font-mono text-purple-300">{cnaeResult.data.cnae_fiscal}</p>
                        <p className="text-sm text-foreground mt-1">{cnaeResult.data.cnae_fiscal_descricao}</p>
                      </div>
                    </div>
                  )}
                  {cnaeResult.data.cnae_fiscais_secundarios?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">CNAEs Secundários ({cnaeResult.data.cnae_fiscais_secundarios.length})</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {cnaeResult.data.cnae_fiscais_secundarios.map((s: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-secondary/40 text-xs">
                            <span className="font-mono text-purple-300 mr-2">{s.codigo}</span>
                            <span className="text-muted-foreground">{s.descricao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cnaeResult.data.natureza_juridica && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-secondary/30">
                        <p className="text-muted-foreground">Natureza Jurídica</p>
                        <p className="text-foreground mt-0.5">{cnaeResult.data.natureza_juridica}</p>
                      </div>
                      <div className="p-2 rounded bg-secondary/30">
                        <p className="text-muted-foreground">Porte</p>
                        <p className="text-foreground mt-0.5">{cnaeResult.data.porte || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {cnaeResult?.tipo === "codigo" && cnaeResult.data && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">Código CNAE</p>
                    <p className="font-mono text-lg text-purple-300">{cnaeResult.data.id || cnaeResult.data.codigo}</p>
                    <p className="text-foreground font-medium mt-1">{cnaeResult.data.descricao}</p>
                  </div>
                  {cnaeResult.data.observacoes && <p className="text-xs text-muted-foreground p-2 bg-secondary/30 rounded">{cnaeResult.data.observacoes}</p>}
                </div>
              )}
              {cnaeResult?.tipo === "descricao" && Array.isArray(cnaeResult.data) && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cnaeResult.data.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">Nenhum CNAE encontrado para essa descrição</p>
                  ) : cnaeResult.data.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border/50 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-purple-300">{item.id || item.codigo}</p>
                        <p className="text-sm text-foreground mt-0.5">{item.descricao}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REGIME PREVIDENCIÁRIO ── */}
      {activeTab === "previdenciario" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-orange-400" />
                <h2 className="font-semibold text-foreground">Regime Previdenciário</h2>
              </div>
              <p className="text-sm text-muted-foreground">Selecione a empresa para ver o regime de contribuição previdenciária</p>
              <div className="space-y-2">
                <Label>Selecione a empresa</Label>
                <Select value={regimeEmpresa} onValueChange={setRegimeEmpresa}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cliente cadastrado</SelectItem>}
                    {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {regimeCliente && (
                <div className="p-3 rounded-lg bg-secondary/40 border border-border/50 text-sm">
                  <p className="font-medium text-foreground">{regimeCliente.razaoSocial}</p>
                  <p className="text-muted-foreground mt-0.5">{regimeCliente.cnpj}</p>
                  <p className={`mt-2 font-semibold ${regimeInfo?.cor || "text-muted-foreground"}`}>
                    {regimeCliente.regimeTributario || "Regime não informado"}
                  </p>
                </div>
              )}
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Referências Legais:</p>
                <div className="flex flex-wrap gap-3">
                  {["eSocial","SEFIP","GRPS","Previdência Social"].map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                      <ExternalLink className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Alíquotas e Contribuições</h2>
              </div>
              {!regimeEmpresa ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione uma empresa para ver as alíquotas</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">As informações são baseadas no regime tributário cadastrado</p>
                </div>
              ) : !regimeInfo ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-400/40 mb-4" />
                  <p className="text-sm text-muted-foreground">Regime tributário não informado para esta empresa</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Atualize o cadastro do cliente para ver as alíquotas</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tributação</p>
                    <div className="space-y-2">
                      {regimeInfo.aliquotas.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                          <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${regimeInfo.cor}`} />
                          <p className="text-sm text-foreground">{a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contribuições Previdenciárias</p>
                    <div className="space-y-2">
                      {regimeInfo.contribuicoes.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-orange-400" />
                          <p className="text-sm text-foreground">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TRIBUTAÇÃO NCM/CFOP ── */}
      {activeTab === "ncm" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-red-400" />
                <h2 className="font-semibold text-foreground">Tributação NCM / CFOP</h2>
              </div>
              <p className="text-sm text-muted-foreground">Consulte a tributação por código NCM ou CFOP</p>
              <div className="space-y-2">
                <Label>Código NCM</Label>
                <div className="flex gap-2">
                  <Input
                    value={ncmCodigo}
                    onChange={e => setNcmCodigo(e.target.value)}
                    className="bg-background font-mono"
                    placeholder="Ex: 8471.30.19"
                    maxLength={12}
                  />
                  <Button onClick={buscarNcm} disabled={ncmLoading} className="bg-red-600 hover:bg-red-700 shrink-0">
                    {ncmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">CFOP Comuns – Referência Rápida</p>
                <div className="space-y-1">
                  {[
                    ["1.101","Compra para industrialização"],
                    ["1.102","Compra para comercialização"],
                    ["5.101","Venda de produção do estabelecimento"],
                    ["5.102","Venda de mercadoria adquirida"],
                    ["5.405","Venda de mercadoria sujeita a ST"],
                    ["6.101","Venda interestadual de produção"],
                  ].map(([cod,desc]) => (
                    <div key={cod} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-red-300 w-12 shrink-0">{cod}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {["TIPI","Receita Federal","SEFAZ","CEST"].map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                      <ExternalLink className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Informações do NCM</h2>
              </div>
              {ncmError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{ncmError}</div>
              )}
              {!ncmResult && !ncmError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Informe o código NCM para consultar</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Você verá a descrição e tributação associada</p>
                </div>
              )}
              {ncmResult && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Código NCM</p>
                    <p className="font-mono text-lg text-red-300">{ncmResult.codigo}</p>
                    <p className="text-foreground font-medium mt-1">{ncmResult.descricao}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l:"II (Imp. Importação)", v: ncmResult.aliquota_ii ? `${ncmResult.aliquota_ii}%` : "—" },
                      { l:"IPI", v: ncmResult.aliquota_ipi ? `${ncmResult.aliquota_ipi}%` : "—" },
                      { l:"PIS/PASEP", v: "0,65% / 1,65%" },
                      { l:"COFINS", v: "3% / 7,6%" },
                    ].map(k => (
                      <div key={k.l} className="p-3 rounded-lg bg-secondary/30 text-center">
                        <p className="text-xs text-muted-foreground">{k.l}</p>
                        <p className="text-lg font-bold text-foreground mt-1">{k.v}</p>
                      </div>
                    ))}
                  </div>
                  {ncmResult.data_inicio && (
                    <p className="text-xs text-muted-foreground">Vigência desde: {ncmResult.data_inicio}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DIFAL / ICMS UF ── */}
      {activeTab === "difal" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <h2 className="font-semibold text-foreground">DIFAL – Diferencial de Alíquota ICMS</h2>
              </div>
              <p className="text-sm text-muted-foreground">Calcule o diferencial de alíquota entre estados (EC 87/2015)</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>UF Origem (remetente)</Label>
                  <Select value={difalOrigem} onValueChange={setDifalOrigem}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf} ({ICMS_RATES[uf]}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>UF Destino (destinatário)</Label>
                  <Select value={difalDestino} onValueChange={setDifalDestino}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf} ({ICMS_RATES[uf]}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da Operação (R$)</Label>
                <Input
                  value={difalValor}
                  onChange={e => setDifalValor(e.target.value)}
                  className="bg-background font-mono"
                  placeholder="Ex: 10000,00"
                />
              </div>

              <Button onClick={calcularDifal} disabled={!difalOrigem || !difalDestino || !difalValor} className="w-full bg-sky-600 hover:bg-sky-700">
                <Calculator className="w-4 h-4 mr-2" />Calcular DIFAL
              </Button>

              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground mb-2">Alíquotas Interestaduais (EC 87/2015)</p>
                <p className="text-muted-foreground">• 12% — Operações entre estados do Sul e Sudeste</p>
                <p className="text-muted-foreground">• 7% — Operações para estados do Norte, Nordeste, CO e ES</p>
                <p className="text-muted-foreground">• FECP: 2% (varia por estado)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Resultado do Cálculo</h2>
              </div>
              {!difalResult ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Preencha os campos e clique em calcular</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Base: EC 87/2015 e Convênio ICMS 93/2015</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">UF Origem</p>
                      <p className="text-xl font-bold text-foreground">{difalOrigem}</p>
                      <p className="text-xs text-sky-400">{difalResult.icmsOrigem}% ICMS</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">UF Destino</p>
                      <p className="text-xl font-bold text-foreground">{difalDestino}</p>
                      <p className="text-xs text-sky-400">{difalResult.icmsDestino}% ICMS</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { l:"Valor da Operação",       v: `R$ ${difalResult.valor.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, cor:"text-foreground" },
                      { l:"Alíq. Interestadual",     v: `${difalResult.aliqInterestadual}%`,                                          cor:"text-muted-foreground" },
                      { l:"DIFAL (ICMS Diferencial)",v: `R$ ${difalResult.difal.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, cor:"text-sky-400" },
                      { l:"FECP (2%)",               v: `R$ ${difalResult.fecp.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,  cor:"text-yellow-400" },
                    ].map(k => (
                      <div key={k.l} className="flex items-center justify-between p-2.5 rounded bg-secondary/30">
                        <p className="text-sm text-muted-foreground">{k.l}</p>
                        <p className={`text-sm font-semibold ${k.cor}`}>{k.v}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      <p className="text-sm font-semibold text-foreground">Total a Recolher</p>
                      <p className="text-lg font-bold text-sky-400">R$ {difalResult.total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    * Cálculo estimado. Confirme com a legislação estadual vigente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DIALOG NOVA/EDITAR CONSULTA ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Consulta" : "Nova Consulta Fiscal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v=>setForm(p=>({...p,tipo:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Consulta</Label><Input value={form.dataConsulta||""} onChange={e=>setForm(p=>({...p,dataConsulta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Data Retorno</Label><Input value={form.dataRetorno||""} onChange={e=>setForm(p=>({...p,dataRetorno:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" /></div>
            <div className="space-y-2"><Label>Resultado</Label><Textarea value={form.resultado||""} onChange={e=>setForm(p=>({...p,resultado:e.target.value}))} className="bg-background resize-none" rows={3} placeholder="Registre o resultado da consulta..." /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={!form.tipo} className="w-full bg-primary">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
