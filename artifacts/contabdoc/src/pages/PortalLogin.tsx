import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, FolderOpen, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getBase = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

interface PortalEscritorio {
  nomeFantasia: string | null;
  razaoSocial: string | null;
  slug: string | null;
  logoUrl: string | null;
}

export default function PortalLogin() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [escritorio, setEscritorio] = useState<PortalEscritorio | null>(null);
  const [carregandoInfo, setCarregandoInfo] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [erroServidor, setErroServidor] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const existingToken = localStorage.getItem(`portal_token_${slug}`);
    if (existingToken) {
      setLocation(`${getBase()}/portal/${slug}/dashboard`);
      return;
    }
    fetch(`${getBase()}/api/portal/info/${slug}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) { setErroServidor(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setEscritorio(d); })
      .catch(() => setErroServidor(true))
      .finally(() => setCarregandoInfo(false));
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch(`${getBase()}/api/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha, slug }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: d.message || "Erro ao entrar", variant: "destructive" }); return; }
      localStorage.setItem(`portal_token_${slug}`, d.token);
      localStorage.setItem(`portal_cliente_${slug}`, JSON.stringify(d.cliente));
      localStorage.setItem(`portal_escritorio_${slug}`, JSON.stringify(d.escritorio));
      setLocation(`${getBase()}/portal/${slug}/dashboard`);
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  if (carregandoInfo) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (erroServidor) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Erro ao carregar portal</h1>
          <p className="text-gray-400 mb-4">Não foi possível conectar ao servidor. Tente novamente em instantes.</p>
          <button onClick={() => window.location.reload()} className="text-blue-400 text-sm underline hover:text-blue-300">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Portal não encontrado</h1>
          <p className="text-gray-400">O endereço <span className="text-blue-400 font-mono">{slug}</span> não corresponde a nenhum escritório cadastrado.</p>
          <p className="text-gray-500 text-sm mt-2">Verifique se o endereço está correto ou contate seu escritório contábil.</p>
        </div>
      </div>
    );
  }

  const nomeEscritorio = escritorio?.nomeFantasia || escritorio?.razaoSocial || "Escritório Contábil";

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-4">
            {escritorio?.logoUrl ? (
              <img
                src={escritorio.logoUrl}
                alt={nomeEscritorio}
                className="h-16 max-w-[200px] object-contain"
              />
            ) : (
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Portal do Cliente</p>
              <p className="text-xl font-bold text-white leading-tight">{nomeEscritorio}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1d27] rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-2">Acessar meus documentos</h1>
          <p className="text-gray-400 text-sm mb-6">Use o e-mail e senha fornecidos pelo seu escritório de contabilidade.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                  className="pl-10 bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5">
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</> : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Powered by ContabDOC · {nomeEscritorio}
        </p>
      </div>
    </div>
  );
}
