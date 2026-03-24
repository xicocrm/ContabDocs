import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Lock, Mail, ShieldCheck, Eye, EyeOff, KeyRound, Users, FileText, BarChart3, AlertCircle, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, user, loading, isSetupNeeded, checkSetup } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const lembrarSalvo = () => {
    const s = localStorage.getItem("contabdoc_lembrar");
    return s === null ? true : s === "true";
  };

  const [lembrar, setLembrar] = useState(lembrarSalvo);
  const [email, setEmail] = useState(() => lembrarSalvo() ? (localStorage.getItem("contabdoc_saved_email") || "") : "");
  const [senha, setSenha] = useState(() => lembrarSalvo() ? (localStorage.getItem("contabdoc_saved_senha") || "") : "");
  const [mostrarSenha, setMostrarSenha] = useState(() => lembrarSalvo() && !!localStorage.getItem("contabdoc_saved_senha"));
  const [enviando, setEnviando] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (user) { setLocation("/"); return; }
    checkSetup().finally(() => setCheckingSetup(false));
  }, [user]);

  const toggleLembrar = () => {
    const v = !lembrar;
    setLembrar(v);
    localStorage.setItem("contabdoc_lembrar", String(v));
    if (!v) {
      localStorage.removeItem("contabdoc_saved_email");
      localStorage.removeItem("contabdoc_saved_senha");
      setMostrarSenha(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email.trim(), senha, lembrar);
      if (lembrar) {
        localStorage.setItem("contabdoc_saved_email", email.trim().toLowerCase());
        localStorage.setItem("contabdoc_saved_senha", senha);
      } else {
        localStorage.removeItem("contabdoc_saved_email");
        localStorage.removeItem("contabdoc_saved_senha");
      }
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      window.location.href = base + "/";
    } catch (err: any) {
      toast({ title: "Falha no login", description: err.message, variant: "destructive" });
      setEnviando(false);
    }
  };

  if (loading || checkingSetup) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isSetupNeeded) {
    return <SetupInicial />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col items-center justify-center p-12 bg-[#111827]">
        {/* Decorações de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/12 via-transparent to-indigo-900/15 pointer-events-none" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-500/8 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/8 translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ContabDOC</h1>
              <p className="text-blue-400/90 text-xs font-medium tracking-wide uppercase">Sistema de Gestão Documental CONTÁBIL</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold leading-tight mb-4">
              <span className="text-white">Gestão contábil </span>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">DIGITAL</span>
              <br />
              <span className="text-blue-400">simples e eficiente</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Controle clientes, documentos, declarações e obrigações do seu escritório em um só lugar.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              { icon: Users, title: "Multi-cliente e multi-escritório", desc: "Gerencie todos os seus clientes organizados por escritório" },
              { icon: FileText, title: "Protocolos e documentos", desc: "Controle de entregas, guias e obrigações mensais" },
              { icon: BarChart3, title: "Consultas fiscais avançadas", desc: "Simples Nacional, RAT/FAP, regime previdenciário" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm hover:bg-white/[0.09] transition-colors">
                <div className="w-9 h-9 bg-blue-600/25 rounded-lg flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}

            {/* Card de Suporte WhatsApp */}
            <a
              href="https://wa.me/5571988924006"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-green-500/25 bg-green-500/[0.07] hover:bg-green-500/[0.13] hover:border-green-500/40 transition-all duration-200 group"
            >
              <div className="w-9 h-9 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-green-500/30 transition-colors">
                <MessageCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">Suporte via WhatsApp</p>
                <p className="text-green-400 text-xs mt-0.5 font-medium">(71) 9.8892-4006 · Chico Santana</p>
              </div>
              <div className="text-green-500/50 group-hover:text-green-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          </div>
        </div>

        {/* Rodapé esquerdo */}
        <p className="absolute bottom-6 text-gray-600 text-xs">ContabDOC © {new Date().getFullYear()}</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="w-full lg:w-[45%] bg-[#141d2e] flex flex-col items-center justify-center p-8 lg:p-12 relative">
        {/* Logo mobile (visível apenas em telas pequenas) */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/40">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ContabDOC</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Entrar no sistema</h2>
            <p className="text-gray-500 text-sm">Acesse com suas credenciais</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                  className="pl-10 bg-white/[0.06] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:bg-white/[0.09] h-11 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 bg-white/[0.06] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:bg-white/[0.09] h-11 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleLembrar}
                className="flex items-center gap-2 group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  lembrar ? "bg-blue-600 border-blue-600" : "bg-white/[0.06] border-white/20 group-hover:border-white/40"
                }`}>
                  {lembrar && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-400 select-none group-hover:text-gray-300 transition-colors">
                  Lembrar-me neste dispositivo
                </span>
              </button>
            </div>

            <Button
              type="submit"
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11 text-sm mt-2"
            >
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</> : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline-offset-2 hover:underline"
            >
              Não consigo acessar o sistema
            </button>
          </div>
        </div>

        <p className="absolute bottom-6 text-gray-700 text-xs">ContabDOC © {new Date().getFullYear()} · Todos os direitos reservados</p>
      </div>

      {/* Modal de recuperação de emergência */}
      <EmergencyResetModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}

function EmergencyResetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ key: "", email: "", novaSenha: "", confirma: "" });
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.novaSenha !== form.confirma) {
      toast({ title: "As senhas não coincidem", variant: "destructive" }); return;
    }
    setEnviando(true);
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/emergency-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: form.key, email: form.email.trim(), novaSenha: form.novaSenha }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: d.message, variant: "destructive" }); return; }
      setSucesso(true);
      toast({ title: "✓ Senha redefinida!", description: "Faça login com a nova senha." });
    } catch (err: any) {
      toast({ title: "Erro de conexão", description: err.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSucesso(false);
    setForm({ key: "", email: "", novaSenha: "", confirma: "" });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1d27] border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <KeyRound className="w-4 h-4 text-yellow-400" />
            Recuperação de Acesso
          </DialogTitle>
        </DialogHeader>

        {sucesso ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-white font-medium mb-1">Senha redefinida!</p>
            <p className="text-gray-400 text-sm mb-4">Feche esta janela e faça login com a nova senha.</p>
            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">Fechar</Button>
          </div>
        ) : (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-300 text-xs">Use a chave mestre do sistema. Padrão: <strong>ContabReset@2025</strong></p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Chave mestre</Label>
                <Input
                  type="password"
                  value={form.key}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="Chave de recuperação"
                  required
                  className="bg-[#0f1117] border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">E-mail do usuário</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@email.com"
                  required
                  className="bg-[#0f1117] border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Nova senha</Label>
                <div className="relative">
                  <Input
                    type={mostrar ? "text" : "password"}
                    value={form.novaSenha}
                    onChange={e => setForm(f => ({ ...f, novaSenha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="pr-10 bg-[#0f1117] border-white/10 text-white"
                  />
                  <button type="button" onClick={() => setMostrar(!mostrar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={form.confirma}
                  onChange={e => setForm(f => ({ ...f, confirma: e.target.value }))}
                  placeholder="Repita a senha"
                  required
                  className="bg-[#0f1117] border-white/10 text-white"
                />
              </div>
              <Button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700">
                {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Redefinindo...</> : "Redefinir senha"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
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
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Seu nome" required className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@seuescritorio.com" required className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Senha</Label>
              <div className="relative">
                <Input type={mostrarSenha ? "text" : "password"} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" required className="pr-10 bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500" />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Confirmar senha</Label>
              <Input type="password" value={form.confirma} onChange={e => setForm(f => ({ ...f, confirma: e.target.value }))} placeholder="Repita a senha" required className="bg-[#0f1117] border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500" />
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
