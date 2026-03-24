import { useState, useRef } from "react";
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
  FolderOpen, Upload, Download, Trash2, RefreshCw,
  FileText, User, Link2, ExternalLink, Loader2, CheckCircle, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function getIconForType(tipo: string | null) {
  if (!tipo) return <FileText className="w-4 h-4 text-gray-400" />;
  if (tipo.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  if (tipo.includes("image")) return <FileText className="w-4 h-4 text-green-400" />;
  if (tipo.includes("excel") || tipo.includes("spreadsheet")) return <FileText className="w-4 h-4 text-emerald-400" />;
  if (tipo.includes("word") || tipo.includes("document")) return <FileText className="w-4 h-4 text-blue-400" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

export default function PortalGerenciar() {
  const { escritorio } = useEscritorio();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clienteSelecionado, setClienteSelecionado] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ nome: "", descricao: "" });
  const [fileSelecionado, setFileSelecionado] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const escritorioId = escritorio?.id;

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes-portal", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: arquivos = [], isLoading: carregando, refetch } = useQuery<Arquivo[]>({
    queryKey: ["portal-arquivos", escritorioId, clienteSelecionado],
    queryFn: () => {
      const params = new URLSearchParams({ escritorioId: String(escritorioId) });
      if (clienteSelecionado && clienteSelecionado !== "all") params.set("clienteId", clienteSelecionado);
      return API.get(`/portal/escritorio/arquivos?${params}`);
    },
    enabled: !!escritorioId,
  });

  const deleteArquivo = useMutation({
    mutationFn: (id: number) => API.del(`/portal/arquivos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-arquivos"] }); toast({ title: "Arquivo excluído" }); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const clientesComPortal = clientes.filter(c => c.ativoPortal);

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
      toast({ title: "Arquivo enviado ao portal!" });
      setShowUpload(false);
      setFileSelecionado(null);
      setUploadForm({ nome: "", descricao: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err: any) {
      toast({ title: err.message || "Erro ao enviar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (arq: Arquivo) => {
    setDownloadingId(arq.id);
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const token = localStorage.getItem("contabdoc_token") || "";
      const res = await fetch(`${base}/api/portal/download/${arq.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast({ title: "Arquivo não disponível", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = arq.nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const getClienteNome = (id: number | null) => {
    if (!id) return "Todos os clientes";
    const c = clientes.find(x => x.id === id);
    return c?.razaoSocial || c?.nomeResponsavel || `Cliente #${id}`;
  };

  const slug = (escritorio as any)?.slug;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const portalUrl = slug ? `${window.location.origin}${base}/portal/${slug}` : null;

  return (
    <AppLayout title="Portal do Cliente" icon={<FolderOpen className="w-5 h-5" />}>
      <div className="space-y-6">
        {portalUrl && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
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

        {!slug && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">⚠️ Configure o slug do escritório na página de Configurações do Escritório para ativar o portal.</p>
          </div>
        )}

        {clientesComPortal.length === 0 && (
          <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-4">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Nenhum cliente com acesso ao portal ativo. Ative o portal na aba "Dados" de cada cliente.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
            <SelectTrigger className="w-64 bg-[#1a1d27] border-white/10 text-white">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-white/10">
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.razaoSocial || c.nomeResponsavel}
                  {c.ativoPortal ? " ✓" : " (portal inativo)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-gray-400 hover:text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <div className="ml-auto">
            <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Enviar para cliente
            </Button>
          </div>
        </div>

        <Tabs defaultValue="escritorio">
          <TabsList className="bg-[#1a1d27] border border-white/10">
            <TabsTrigger value="escritorio" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
              Enviados pelo escritório
            </TabsTrigger>
            <TabsTrigger value="clientes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
              Enviados pelos clientes
            </TabsTrigger>
            <TabsTrigger value="todos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
              Todos
            </TabsTrigger>
          </TabsList>

          {(["escritorio", "clientes", "todos"] as const).map(tab => {
            const lista = tab === "todos" ? arquivos :
              tab === "escritorio" ? arquivos.filter(a => a.enviadoPor === "escritorio") :
              arquivos.filter(a => a.enviadoPor === "cliente");

            return (
              <TabsContent key={tab} value={tab} className="mt-4">
                {carregando ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : lista.length === 0 ? (
                  <div className="bg-[#1a1d27] rounded-xl border border-white/10 p-10 text-center">
                    <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhum arquivo encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lista.map(arq => (
                      <div key={arq.id} className="bg-[#1a1d27] rounded-lg border border-white/10 p-4 flex items-center gap-3">
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
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#1a1d27] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar documento para cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Arquivo *</Label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => setFileSelecionado(e.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-sm cursor-pointer"
                />
                {fileSelecionado && (
                  <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />{fileSelecionado.name}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Nome do documento</Label>
              <Input
                value={uploadForm.nome}
                onChange={e => setUploadForm(f => ({ ...f, nome: e.target.value }))}
                placeholder={fileSelecionado?.name || "Nome do documento"}
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Descrição</Label>
              <Input
                value={uploadForm.descricao}
                onChange={e => setUploadForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex.: DCTF Janeiro 2025"
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />Enviar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
