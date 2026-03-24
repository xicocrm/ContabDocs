import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, user, loading, isSetupNeeded, checkSetup } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (user) { setLocation("/"); return; }
    checkSetup().finally(() => setCheckingSetup(false));
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Falha no login", description: err.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  if (loading || checkingSetup) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isSetupNeeded) {
    return <SetupInicial />;
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ContabDOC</span>
          </div>
          <p className="text-gray-400 text-sm">Sistema de Gestão Contábil</p>
        </div>

        <div className="bg-[#1a1d27] rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-6">Entrar no sistema</h1>

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
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
            >
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</> : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          ContabDOC © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

function SetupInicial() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", confirma: "" });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.senha !== form.confirma) {
      toast({ title: "As senhas não coincidem", variant: "destructive" }); return;
    }
    if (form.senha.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" }); return;
    }
    setEnviando(true);
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: d.message, variant: "destructive" }); return; }
      toast({ title: "Configuração concluída!", description: "Fazendo login..." });
      await login(form.email, form.senha);
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Erro ao configurar", description: err.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ContabDOC</span>
          </div>
          <p className="text-blue-400 text-sm font-medium">Configuração inicial do sistema</p>
        </div>

        <div className="bg-[#1a1d27] rounded-2xl p-8 border border-blue-500/30 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-2">Bem-vindo!</h1>
          <p className="text-gray-400 text-sm mb-6">Crie o primeiro usuário administrador para começar a usar o ContabDOC.</p>

          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Nome completo</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Seu nome"
                required
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@seuescritorio.com"
                required
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Senha</Label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="pr-10 bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Confirmar senha</Label>
              <Input
                type="password"
                value={form.confirma}
                onChange={e => setForm(f => ({ ...f, confirma: e.target.value }))}
                placeholder="Repita a senha"
                required
                className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500"
              />
            </div>
            <Button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 mt-2">
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Configurando...</> : "Criar conta e entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
