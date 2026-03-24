import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, LogOut, Upload, Download, FileText, FolderOpen,
  User, RefreshCw, X, CheckCircle, Clock, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getBase = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

interface Arquivo {
  id: number;
  nome: string;
  tipoArquivo: string | null;
  tamanho: string | null;
  descricao: string | null;
  enviadoPor: string;
  status: string;
  createdAt: string;
}

function getIconForType(tipo: string | null) {
  if (!tipo) return <FileText className="w-5 h-5 text-gray-400" />;
  if (tipo.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  if (tipo.includes("image")) return <FileText className="w-5 h-5 text-green-400" />;
  if (tipo.includes("excel") || tipo.includes("spreadsheet")) return <FileText className="w-5 h-5 text-emerald-400" />;
  if (tipo.includes("word") || tipo.includes("document")) return <FileText className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-gray-400" />;
}

export default function PortalDashboard() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [fileSelecionado, setFileSelecionado] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const token = localStorage.getItem(`portal_token_${slug}`);
  const clienteRaw = localStorage.getItem(`portal_cliente_${slug}`);
  const escritorioRaw = localStorage.getItem(`portal_escritorio_${slug}`);
  const cliente = clienteRaw ? JSON.parse(clienteRaw) : null;
  const escritorio = escritorioRaw ? JSON.parse(escritorioRaw) : null;

  useEffect(() => {
    if (!token) { setLocation(`${getBase()}/portal/${slug}`); return; }
    carregarArquivos();
  }, [slug]);

  const carregarArquivos = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${getBase()}/api/portal/arquivos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handleLogout(); return; }
      const d = await res.json();
      setArquivos(Array.isArray(d) ? d : []);
    } catch {
      toast({ title: "Erro ao carregar arquivos", variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileSelecionado) { toast({ title: "Selecione um arquivo", variant: "destructive" }); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("arquivo", fileSelecionado);
    fd.append("descricao", descricao);
    try {
      const res = await fetch(`${getBase()}/api/portal/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.status === 401) { handleLogout(); return; }
      if (!res.ok) { const d = await res.json(); toast({ title: d.message, variant: "destructive" }); return; }
      toast({ title: "Arquivo enviado com sucesso!", description: fileSelecionado.name });
      setFileSelecionado(null);
      setDescricao("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      carregarArquivos();
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (arq: Arquivo) => {
    setDownloadingId(arq.id);
    try {
      const res = await fetch(`${getBase()}/api/portal/download/${arq.id}`, {
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
      toast({ title: "Erro ao baixar arquivo", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`portal_token_${slug}`);
    localStorage.removeItem(`portal_cliente_${slug}`);
    localStorage.removeItem(`portal_escritorio_${slug}`);
    setLocation(`${getBase()}/portal/${slug}`);
  };

  const meusArquivos = arquivos.filter(a => a.enviadoPor === "cliente");
  const arquivosEscritorio = arquivos.filter(a => a.enviadoPor === "escritorio");

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#1a1d27] border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Portal do Cliente</p>
              <p className="text-sm font-semibold text-white">{escritorio?.nome || "Escritório"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <User className="w-4 h-4" />
              <span className="text-sm hidden sm:block">{cliente?.nome || "Cliente"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="bg-[#1a1d27] rounded-xl border border-white/10 p-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            Enviar documento
          </h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 hover:border-blue-500/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                onChange={e => setFileSelecionado(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-sm hover:file:bg-blue-700 cursor-pointer"
              />
              {fileSelecionado && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  {fileSelecionado.name} ({(fileSelecionado.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descrição (opcional)"
              className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600"
            />
            <Button type="submit" disabled={uploading || !fileSelecionado} className="bg-blue-600 hover:bg-blue-700 text-white">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />Enviar</>}
            </Button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" />
              Documentos do escritório ({arquivosEscritorio.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={carregarArquivos} className="text-gray-400 hover:text-white hover:bg-white/10">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {carregando ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : arquivosEscritorio.length === 0 ? (
            <div className="bg-[#1a1d27] rounded-xl border border-white/10 p-8 text-center">
              <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum documento enviado pelo escritório ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {arquivosEscritorio.map(arq => (
                <div key={arq.id} className="bg-[#1a1d27] rounded-lg border border-white/10 p-4 flex items-center gap-3">
                  {getIconForType(arq.tipoArquivo)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{arq.nome}</p>
                    <p className="text-xs text-gray-500">
                      {arq.tamanho} · {format(new Date(arq.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {arq.descricao && <p className="text-xs text-gray-400 mt-0.5">{arq.descricao}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(arq)} disabled={downloadingId === arq.id} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shrink-0">
                    {downloadingId === arq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-400" />
            Meus envios ({meusArquivos.length})
          </h2>
          {meusArquivos.length === 0 ? (
            <div className="bg-[#1a1d27] rounded-xl border border-white/10 p-6 text-center">
              <p className="text-gray-500 text-sm">Você ainda não enviou nenhum documento</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meusArquivos.map(arq => (
                <div key={arq.id} className="bg-[#1a1d27] rounded-lg border border-white/10 p-4 flex items-center gap-3">
                  {getIconForType(arq.tipoArquivo)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{arq.nome}</p>
                    <p className="text-xs text-gray-500">
                      {arq.tamanho} · {format(new Date(arq.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {arq.descricao && <p className="text-xs text-gray-400 mt-0.5">{arq.descricao}</p>}
                  </div>
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full shrink-0">Enviado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
