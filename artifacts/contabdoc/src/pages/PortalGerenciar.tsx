import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen, Upload, Download, Trash2, RefreshCw, FileText, User,
  Link2, ExternalLink, Loader2, CheckCircle, Plus, Eye, Printer,
  Pencil, Building2, LayoutGrid, List, Receipt, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: number;
  razaoSocial: string | null;
  nomeResponsavel: string | null;
  emailPortal: string | null;
  ativoPortal: boolean | null;
  codigoCliente: string | null;
}

interface Arquivo {
  id: number;
  clienteId: number | null;
  nome: string;
  tipoArquivo: string | null;
  tamanho: string | null;
  descricao: string | null;
  enviadoPor: string;
  createdAt: string;
}

interface Imposto {
  id: number;
  clienteId: number | null;
  tipo: string;
  competencia: string;
  vencimento: string | null;
  valor: string | null;
  status: string;
  arquivoNome: string | null;
  observacoes: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_IMPOSTO = [
  "DAS", "DARF", "GPS/INSS", "INSS", "IRPF", "IRPJ", "CSLL", "PIS", "COFINS",
  "ISS", "ICMS", "IPI", "FGTS", "SIMPLES NACIONAL", "DCBE", "DCTF",
  "ECF", "SPED", "DIRF", "RAIS", "CAGED", "OUTRO"
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pendente:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  label: "Pendente"  },
  pago:      { bg: "bg-green-500/15",   text: "text-green-400",   label: "Pago"      },
  vencido:   { bg: "bg-red-500/15",     text: "text-red-400",     label: "Vencido"   },
  cancelado: { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Cancelado" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIconForType(tipo: string | null) {
  if (!tipo) return <FileText className="w-4 h-4 text-gray-400" />;
  if (tipo.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  if (tipo.includes("image")) return <FileText className="w-4 h-4 text-green-400" />;
  if (tipo.includes("excel") || tipo.includes("spreadsheet")) return <FileText className="w-4 h-4 text-emerald-400" />;
  if (tipo.includes("word") || tipo.includes("document")) return <FileText className="w-4 h-4 text-blue-400" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function formatCurrency(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v.replace(",", "."));
  if (isNaN(n)) return v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pendente;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PortalGerenciar() {
  const { escritorioId } = useEscritorio();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const impostoFileRef = useRef<HTMLInputElement>(null);

  const [clienteSelecionado, setClienteSelecionado] = useState<string>("all");
  const [docView, setDocView] = useState<"list" | "cards">("list");

  // Documentos
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ nome: "", descricao: "" });
  const [fileSelecionado, setFileSelecionado] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Impostos
  const [showImpostoForm, setShowImpostoForm] = useState(false);
  const [editImposto, setEditImposto] = useState<Imposto | null>(null);
  const [impostoFile, setImpostoFile] = useState<File | null>(null);
  const [savingImposto, setSavingImposto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [impostoForm, setImpostoForm] = useState({
    clienteId: "all", tipo: "", competencia: "", vencimento: "", valor: "", status: "pendente", observacoes: ""
  });

  const { setEscritorio } = useEscritorio();

  const { data: todosEscritorios = [] } = useQuery<{ id: number; slug?: string | null; nomeFantasia?: string | null; razaoSocial?: string | null }[]>({
    queryKey: ["escritorios-lista"],
    queryFn: () => API.get("/escritorios"),
    enabled: !escritorioId,
  });

  useEffect(() => {
    if (!escritorioId && todosEscritorios.length === 1) {
      const e = todosEscritorios[0];
      setEscritorio(e.id, e.nomeFantasia || e.razaoSocial || String(e.id));
    }
  }, [escritorioId, todosEscritorios, setEscritorio]);

  const { data: escritorioData } = useQuery<{ id: number; slug?: string | null; nomeFantasia?: string | null }>({
    queryKey: ["escritorio-ativo", escritorioId],
    queryFn: () => API.get(`/escritorios/${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes-portal", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: arquivos = [], isLoading: carregandoDocs, refetch: refetchDocs } = useQuery<Arquivo[]>({
    queryKey: ["portal-arquivos", escritorioId, clienteSelecionado],
    queryFn: () => {
      const params = new URLSearchParams({ escritorioId: String(escritorioId) });
      if (clienteSelecionado && clienteSelecionado !== "all") params.set("clienteId", clienteSelecionado);
      return API.get(`/portal/escritorio/arquivos?${params}`);
    },
    enabled: !!escritorioId,
  });

  const { data: impostos = [], isLoading: carregandoImpostos, refetch: refetchImpostos } = useQuery<Imposto[]>({
    queryKey: ["portal-impostos", escritorioId, clienteSelecionado, filtroStatus, filtroTipo],
    queryFn: () => {
      const params = new URLSearchParams({ escritorioId: String(escritorioId) });
      if (clienteSelecionado && clienteSelecionado !== "all") params.set("clienteId", clienteSelecionado);
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
      return API.get(`/portal/impostos?${params}`);
    },
    enabled: !!escritorioId,
  });

  const deleteArquivo = useMutation({
    mutationFn: (id: number) => API.del(`/portal/arquivos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-arquivos"] }); toast({ title: "Arquivo excluído" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteImposto = useMutation({
    mutationFn: (id: number) => API.del(`/portal/impostos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-impostos"] }); toast({ title: "Imposto excluído" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateImpostoStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => {
      const fd = new FormData();
      fd.append("status", status);
      return API.putForm(`/portal/impostos/${id}`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-impostos"] }),
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const getClienteNome = (id: number | null) => {
    if (!id) return "—";
    const c = clientes.find(x => x.id === id);
    return c?.razaoSocial || c?.nomeResponsavel || `#${id}`;
  };

  const slug = escritorioData?.slug;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const portalUrl = slug ? `${window.location.origin}${base}/portal/${slug}` : null;

  // ── Upload Documentos ──────────────────────────────────────────────────────

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileSelecionado) { toast({ title: "Selecione um arquivo", variant: "destructive" }); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("arquivo", fileSelecionado);
    fd.append("escritorioId", String(escritorioId));
    if (clienteSelecionado && clienteSelecionado !== "all") fd.append("clienteId", clienteSelecionado);
    fd.append("nome", uploadForm.nome || fileSelecionado.name);
    fd.append("descricao", uploadForm.descricao);
    try {
      await API.upload("/portal/escritorio/upload", fd);
      toast({ title: "Documento enviado ao portal!" });
      setShowUpload(false);
      setFileSelecionado(null);
      setUploadForm({ nome: "", descricao: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetchDocs();
    } catch (err: any) {
      toast({ title: err.message || "Erro ao enviar", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleDownload = async (arq: Arquivo) => {
    setDownloadingId(arq.id);
    try {
      const token = localStorage.getItem("contabdoc_token") || "";
      const res = await fetch(`${base}/api/portal/download/${arq.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Arquivo não disponível", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = arq.nome; a.click();
      URL.revokeObjectURL(url);
    } catch { toast({ title: "Erro ao baixar", variant: "destructive" }); }
    finally { setDownloadingId(null); }
  };

  // ── Impostos ───────────────────────────────────────────────────────────────

  const openNovoImposto = () => {
    setEditImposto(null);
    setImpostoFile(null);
    setImpostoForm({ clienteId: clienteSelecionado !== "all" ? clienteSelecionado : "all", tipo: "", competencia: "", vencimento: "", valor: "", status: "pendente", observacoes: "" });
    if (impostoFileRef.current) impostoFileRef.current.value = "";
    setShowImpostoForm(true);
  };

  const openEditImposto = (imp: Imposto) => {
    setEditImposto(imp);
    setImpostoFile(null);
    setImpostoForm({
      clienteId: imp.clienteId ? String(imp.clienteId) : "all",
      tipo: imp.tipo,
      competencia: imp.competencia,
      vencimento: imp.vencimento || "",
      valor: imp.valor || "",
      status: imp.status,
      observacoes: imp.observacoes || "",
    });
    if (impostoFileRef.current) impostoFileRef.current.value = "";
    setShowImpostoForm(true);
  };

  const handleSaveImposto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impostoForm.tipo) { toast({ title: "Tipo de imposto obrigatório", variant: "destructive" }); return; }
    if (!impostoForm.competencia) { toast({ title: "Competência obrigatória", variant: "destructive" }); return; }
    setSavingImposto(true);
    const fd = new FormData();
    fd.append("escritorioId", String(escritorioId));
    if (impostoForm.clienteId && impostoForm.clienteId !== "all") fd.append("clienteId", impostoForm.clienteId);
    fd.append("tipo", impostoForm.tipo);
    fd.append("competencia", impostoForm.competencia);
    fd.append("vencimento", impostoForm.vencimento);
    fd.append("valor", impostoForm.valor);
    fd.append("status", impostoForm.status);
    fd.append("observacoes", impostoForm.observacoes);
    if (impostoFile) fd.append("arquivo", impostoFile);
    try {
      if (editImposto) {
        await API.putForm(`/portal/impostos/${editImposto.id}`, fd);
        toast({ title: "Imposto atualizado!" });
      } else {
        await API.upload("/portal/impostos", fd);
        toast({ title: "Imposto criado!" });
      }
      setShowImpostoForm(false);
      refetchImpostos();
    } catch (err: any) {
      toast({ title: err.message || "Erro ao salvar", variant: "destructive" });
    } finally { setSavingImposto(false); }
  };

  const handleDownloadImposto = async (imp: Imposto) => {
    if (!imp.arquivoNome) { toast({ title: "Sem arquivo anexo", variant: "destructive" }); return; }
    try {
      const token = localStorage.getItem("contabdoc_token") || "";
      const res = await fetch(`${base}/api/portal/impostos/download/${imp.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Arquivo não disponível", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = imp.arquivoNome || "documento"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast({ title: "Erro ao baixar", variant: "destructive" }); }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Portal do Cliente" icon={<FolderOpen className="w-5 h-5" />}>
      <div className="space-y-5">

        {/* Link do portal */}
        {portalUrl && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Link do portal dos clientes</p>
                <p className="text-sm text-blue-300 font-mono">{portalUrl}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.open(portalUrl, "_blank")} className="text-blue-400 hover:text-blue-300 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Avisos */}
        {!escritorioId && todosEscritorios.length > 1 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-orange-400 text-sm">⚠️ Selecione o escritório ativo na página de Escritórios antes de usar o Portal.</p>
          </div>
        )}
        {escritorioId && !slug && escritorioData && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">⚠️ Configure o slug do escritório na página de Escritórios para ativar o portal.</p>
          </div>
        )}

        {/* Tabs principais */}
        <Tabs defaultValue="documentos" className="space-y-0">
          <TabsList className="bg-[#1a1d27] border border-white/10 w-full sm:w-auto">
            <TabsTrigger value="documentos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="impostos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Impostos
            </TabsTrigger>
          </TabsList>

          {/* ══════════════ DOCUMENTOS ══════════════ */}
          <TabsContent value="documentos" className="mt-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-5 h-5 text-white" />
                  <h2 className="text-xl font-bold text-white">Arquivos e Documentos</h2>
                </div>
                <p className="text-blue-100 text-sm">Sistema profissional de gestão documental com estrutura hierárquica</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={docView === "list" ? "secondary" : "ghost"}
                  onClick={() => setDocView("list")}
                  className={`${docView === "list" ? "bg-white/20 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"}`}
                >
                  <List className="w-4 h-4 mr-1.5" /> Árvore
                </Button>
                <Button
                  size="sm"
                  variant={docView === "cards" ? "secondary" : "ghost"}
                  onClick={() => setDocView("cards")}
                  className={`${docView === "cards" ? "bg-white/20 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"}`}
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Cards
                </Button>
              </div>
            </div>

            <div className="bg-[#1a1d27] border border-white/10 border-t-0 rounded-b-xl p-5 space-y-5">
              {/* Seletor de empresa */}
              <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-semibold text-white">Selecione a Empresa</p>
                </div>
                <p className="text-xs text-gray-500">Escolha para visualizar e gerenciar documentos</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                    <SelectTrigger className="w-72 bg-[#1a1d27] border border-blue-400/40 text-white focus:ring-blue-500">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <SelectValue placeholder="Escolha uma empresa para começar..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d27] border-white/10">
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.razaoSocial || c.nomeResponsavel}{c.ativoPortal ? " ✓" : " (portal inativo)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => refetchDocs()} className="text-gray-400 hover:text-white hover:bg-white/10">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <div className="ml-auto">
                    <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Upload className="w-4 h-4 mr-2" /> Enviar Documento
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <Tabs defaultValue="escritorio">
                <TabsList className="bg-[#0f1117] border border-white/10">
                  <TabsTrigger value="escritorio" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 text-xs">
                    Enviados pelo escritório
                  </TabsTrigger>
                  <TabsTrigger value="clientes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 text-xs">
                    Enviados pelos clientes
                  </TabsTrigger>
                  <TabsTrigger value="todos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 text-xs">
                    Todos
                  </TabsTrigger>
                </TabsList>

                {(["escritorio", "clientes", "todos"] as const).map(tab => {
                  const lista = tab === "todos" ? arquivos :
                    tab === "escritorio" ? arquivos.filter(a => a.enviadoPor === "escritorio") :
                    arquivos.filter(a => a.enviadoPor === "cliente");

                  return (
                    <TabsContent key={tab} value={tab} className="mt-4">
                      {carregandoDocs ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                      ) : lista.length === 0 ? (
                        <div className="bg-[#0f1117] rounded-xl border border-white/10 p-10 text-center">
                          <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Nenhum arquivo encontrado</p>
                          {clientes.filter(c => c.ativoPortal).length === 0 && (
                            <p className="text-gray-600 text-xs mt-2 flex items-center justify-center gap-1">
                              <User className="w-3 h-3" /> Ative o portal na aba "Dados" de cada cliente
                            </p>
                          )}
                        </div>
                      ) : docView === "list" ? (
                        <div className="space-y-2">
                          {lista.map(arq => (
                            <div key={arq.id} className="bg-[#0f1117] rounded-lg border border-white/10 p-3.5 flex items-center gap-3 hover:border-white/20 transition-colors">
                              {getIconForType(arq.tipoArquivo)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{arq.nome}</p>
                                <p className="text-xs text-gray-500">
                                  {getClienteNome(arq.clienteId)} · {arq.tamanho} · {format(new Date(arq.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                                {arq.descricao && <p className="text-xs text-gray-400 mt-0.5">{arq.descricao}</p>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${arq.enviadoPor === "escritorio" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                                {arq.enviadoPor === "escritorio" ? "Escritório" : "Cliente"}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" onClick={() => handleDownload(arq)} disabled={downloadingId === arq.id} className="text-gray-400 hover:text-blue-300 hover:bg-blue-500/10">
                                  {downloadingId === arq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteArquivo.mutate(arq.id)} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {lista.map(arq => (
                            <div key={arq.id} className="bg-[#0f1117] rounded-xl border border-white/10 p-4 flex flex-col gap-2 hover:border-white/20 transition-colors group">
                              <div className="flex items-start justify-between">
                                {getIconForType(arq.tipoArquivo)}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${arq.enviadoPor === "escritorio" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                                  {arq.enviadoPor === "escritorio" ? "ESC" : "CLI"}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-white line-clamp-2 leading-tight">{arq.nome}</p>
                              <p className="text-xs text-gray-500 mt-auto">{arq.tamanho}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="ghost" onClick={() => handleDownload(arq)} disabled={downloadingId === arq.id} className="flex-1 h-7 text-gray-400 hover:text-blue-300 hover:bg-blue-500/10">
                                  {downloadingId === arq.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteArquivo.mutate(arq.id)} className="flex-1 h-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </TabsContent>

          {/* ══════════════ IMPOSTOS ══════════════ */}
          <TabsContent value="impostos" className="mt-0">
            <div className="bg-[#1a1d27] border border-white/10 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-5 flex flex-wrap items-start justify-between gap-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white">Gestão de Impostos</h2>
                  </div>
                  <p className="text-gray-400 text-sm">Controle de impostos e tributos</p>
                </div>
                <Button onClick={openNovoImposto} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Novo Imposto
                </Button>
              </div>

              {/* Filtros */}
              <div className="p-5 border-b border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4h18M7 8h10M11 12h2M15 16H9"/></svg>
                  Filtros
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Empresa</Label>
                    <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                      <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d27] border-white/10">
                        <SelectItem value="all">Todas</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.razaoSocial || c.nomeResponsavel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d27] border-white/10">
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Tipo de Imposto</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d27] border-white/10">
                        <SelectItem value="todos">Todos</SelectItem>
                        {TIPOS_IMPOSTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              {carregandoImpostos ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : impostos.length === 0 ? (
                <div className="py-16 text-center">
                  <Receipt className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum imposto encontrado</p>
                  <p className="text-gray-600 text-xs mt-1">Clique em "Novo Imposto" para cadastrar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Empresa</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Competência</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vencimento</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impostos.map((imp, i) => (
                        <tr key={imp.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                          <td className="px-5 py-3.5">
                            <p className="text-sm text-white font-medium">{getClienteNome(imp.clienteId)}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-bold text-gray-200">{imp.tipo}</span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-300">{imp.competencia}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-300">
                            {imp.vencimento ? format(new Date(imp.vencimento + "T00:00:00"), "dd/MM/yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-semibold text-white">{formatCurrency(imp.valor)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusChip status={imp.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="ghost" title="Visualizar" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-300 hover:bg-blue-500/10">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Imprimir" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-200 hover:bg-white/10">
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Baixar arquivo" onClick={() => handleDownloadImposto(imp)} disabled={!imp.arquivoNome} className={`h-7 w-7 p-0 ${imp.arquivoNome ? "text-gray-400 hover:text-green-300 hover:bg-green-500/10" : "text-gray-700 cursor-not-allowed"}`}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Editar" onClick={() => openEditImposto(imp)} className="h-7 w-7 p-0 text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Excluir" onClick={() => deleteImposto.mutate(imp.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                              <Select value={imp.status} onValueChange={v => updateImpostoStatus.mutate({ id: imp.id, status: v })}>
                                <SelectTrigger className="h-7 text-xs bg-[#0f1117] border-white/10 text-gray-300 w-28 ml-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1d27] border-white/10">
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="pago">Pago</SelectItem>
                                  <SelectItem value="vencido">Vencido</SelectItem>
                                  <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog: Enviar Documento ─────────────────────────────────────────── */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#1a1d27] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-4 h-4 text-blue-400" /> Enviar Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Cliente (opcional)</Label>
              <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.razaoSocial || c.nomeResponsavel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Arquivo *</Label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-4">
                <input ref={fileInputRef} type="file" onChange={e => setFileSelecionado(e.target.files?.[0] || null)} required
                  className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-sm cursor-pointer" />
                {fileSelecionado && (
                  <p className="mt-1 text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{fileSelecionado.name}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Nome do documento</Label>
              <Input value={uploadForm.nome} onChange={e => setUploadForm(f => ({ ...f, nome: e.target.value }))}
                placeholder={fileSelecionado?.name || "Nome do documento"} className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Descrição</Label>
              <Input value={uploadForm.descricao} onChange={e => setUploadForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex.: DCTF Janeiro 2025" className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />Enviar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Imposto ───────────────────────────────────────────────────── */}
      <Dialog open={showImpostoForm} onOpenChange={setShowImpostoForm}>
        <DialogContent className="bg-[#1a1d27] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              {editImposto ? "Editar Imposto" : "Novo Imposto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveImposto} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Tipo de Imposto *</Label>
                <Select value={impostoForm.tipo} onValueChange={v => setImpostoForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-white/10 max-h-56">
                    {TIPOS_IMPOSTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Competência *</Label>
                <Input value={impostoForm.competencia} onChange={e => setImpostoForm(f => ({ ...f, competencia: e.target.value }))}
                  placeholder="MM/YYYY" className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Cliente</Label>
              <Select value={impostoForm.clienteId} onValueChange={v => setImpostoForm(f => ({ ...f, clienteId: v }))}>
                <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  <SelectItem value="all">Nenhum / Geral</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.razaoSocial || c.nomeResponsavel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Vencimento</Label>
                <Input type="date" value={impostoForm.vencimento} onChange={e => setImpostoForm(f => ({ ...f, vencimento: e.target.value }))}
                  className="bg-[#0f1117] border-white/10 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Valor (R$)</Label>
                <Input value={impostoForm.valor} onChange={e => setImpostoForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00" className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Status</Label>
              <Select value={impostoForm.status} onValueChange={v => setImpostoForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-[#0f1117] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Arquivo (guia/DARF/comprovante)</Label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-3">
                <input ref={impostoFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                  onChange={e => setImpostoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-500 file:text-white file:text-sm cursor-pointer" />
                {editImposto?.arquivoNome && !impostoFile && (
                  <p className="mt-1 text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Atual: {editImposto.arquivoNome}</p>
                )}
                {impostoFile && (
                  <p className="mt-1 text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{impostoFile.name}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Observações</Label>
              <Input value={impostoForm.observacoes} onChange={e => setImpostoForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Opcional..." className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowImpostoForm(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
              <Button type="submit" disabled={savingImposto} className="bg-orange-500 hover:bg-orange-600 text-white">
                {savingImposto ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Salvar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
