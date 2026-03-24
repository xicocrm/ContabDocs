import { useState, useEffect, useCallback } from "react";
import { buscarCep } from "@/lib/cep";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListarClientes, useListarEscritorios,
  useCriarCliente, useAtualizarCliente, useExcluirCliente,
  useListarContratos, useCriarContrato, useAtualizarContrato, useExcluirContrato,
  consultarCnpj, validarCpf,
  getListarClientesQueryKey, getListarContratosQueryKey,
  Cliente, Contrato,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Plus, Search, Edit, Trash2, Building2, User, ArrowLeft,
  FileText, CheckCircle, AlertCircle, DollarSign, Calendar, MapPin,
  FolderOpen, Lock, Key, ExternalLink, Eye, EyeOff,
  Users, Globe, Scale, UserCheck, ChevronRight,
} from "lucide-react";
import { TabSocios } from "./clientes/TabSocios";
import { TabGoverno } from "./clientes/TabGoverno";

const BASE_URL = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
  return r.json();
}

const listarAlvaras   = (cid: number)           => apiFetch(`/api/alvaras?clienteId=${cid}`);
const criarAlvara     = (d: any)                => apiFetch(`/api/alvaras`, { method: "POST", body: JSON.stringify(d) });
const atualizarAlvara = (id: number, d: any)    => apiFetch(`/api/alvaras/${id}`, { method: "PUT", body: JSON.stringify(d) });
const excluirAlvaraCh = (id: number)            => apiFetch(`/api/alvaras/${id}`, { method: "DELETE" });

const emptyCliente = {
  tipo: 'PJ', cnpj: '', cpf: '', razaoSocial: '', nomeFantasia: '', nomeResponsavel: '',
  email: '', telefone: '', celular: '', cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', municipio: '', uf: '', situacaoReceita: '', socios: '[]', regimeTributario: '',
  atividadePrincipal: '', codigoCliente: '',
  emailPortal: '', senhaPortal: '', ativoPortal: false,
  jucebNumero: '', jucebData: '', jucebSituacao: '', jucebObservacoes: '',
  inscricaoMunicipal: '', inscricaoEstadual: '',
  arquivoInscricaoMunicipal: '', arquivoInscricaoMunicipalNome: '',
  arquivoInscricaoEstadual: '', arquivoInscricaoEstadualNome: '',
};

const emptyContrato = {
  clienteId: 0, numeroContrato: '', valorContrato: '', dataContrato: '',
  diaVencimento: 5, dataVencimento: '', objeto: '', status: 'ativo', observacoes: ''
};

function gerarCodigoCliente(total: number) { return `CLI-${String(total + 1).padStart(4, '0')}`; }

function SituacaoBadge({ situacao }: { situacao?: string | null }) {
  if (!situacao) return <span className="text-muted-foreground text-xs">—</span>;
  const ok = situacao.toUpperCase().includes('ATIVA') || situacao.toUpperCase().includes('REGULAR');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {situacao}
    </span>
  );
}

function StatusContratoBadge({ status }: { status?: string | null }) {
  const map: Record<string, string> = {
    'ativo': 'bg-green-500/10 text-green-400 border-green-500/20',
    'inativo': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    'vencido': 'bg-red-500/10 text-red-400 border-red-500/20',
    'cancelado': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  const key = status || 'inativo';
  return <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase ${map[key] || map['inativo']}`}>{status || 'inativo'}</span>;
}

function SectionHeader({ icon: Icon, title, color = "text-primary" }: { icon: any; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export default function ClientesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: escritorios = [] } = useListarEscritorios();
  const [selectedEscritorioId, setSelectedEscritorioId] = useState<number | null>(null);
  const { data: clientes = [], isLoading } = useListarClientes(
    selectedEscritorioId ? { escritorioId: selectedEscritorioId } : undefined
  );
  const criarCliente     = useCriarCliente();
  const atualizarCliente = useAtualizarCliente();
  const excluirCliente   = useExcluirCliente();
  const criarContrato    = useCriarContrato();
  const atualizarContrato= useAtualizarContrato();
  const excluirContrato  = useExcluirContrato();

  const [view, setView]             = useState<'list' | 'detail'>('list');
  const [clienteId, setClienteId]   = useState<number | null>(null);
  const [clienteForm, setClienteForm] = useState<any>(emptyCliente);
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const [activeTab, setActiveTab]     = useState("dados");
  const [resetandoSenha, setResetandoSenha]       = useState(false);
  const [mostrarSenhaPortal, setMostrarSenhaPortal] = useState(false);
  const [portalAtivoServidor, setPortalAtivoServidor] = useState(false);
  const [isContratoOpen, setIsContratoOpen] = useState(false);
  const [contratoId, setContratoId]         = useState<number | null>(null);
  const [contratoForm, setContratoForm]     = useState<any>(emptyContrato);
  const [alvaras, setAlvaras]               = useState<any[]>([]);

  const { data: contratos = [] } = useListarContratos(clienteId ? { clienteId } : undefined);

  const fetchAlvaras = useCallback(async (cid: number) => {
    try { setAlvaras(await listarAlvaras(cid)); } catch { setAlvaras([]); }
  }, []);

  useEffect(() => { if (clienteId) fetchAlvaras(clienteId); else setAlvaras([]); }, [clienteId, fetchAlvaras]);

  const filteredClientes = clientes.filter(c =>
    (c.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cnpj || '').includes(searchTerm) || (c.cpf || '').includes(searchTerm)
  );

  const openNew = () => {
    setClienteForm({ ...emptyCliente, escritorioId: selectedEscritorioId ?? undefined, codigoCliente: gerarCodigoCliente(clientes.length) });
    setClienteId(null); setActiveTab("dados");
    setPortalAtivoServidor(false); setResetandoSenha(false); setMostrarSenhaPortal(false);
    setView('detail');
  };

  const openEdit = (c: Cliente) => {
    setClienteForm({ ...emptyCliente, ...c, socios: (c as any).socios || '[]' });
    setClienteId(c.id); setActiveTab("dados");
    setPortalAtivoServidor(!!(c as any).ativoPortal);
    setResetandoSenha(false); setMostrarSenhaPortal(false);
    setView('detail');
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'cnpj') v = formatters.cnpj(value);
    if (name === 'cpf') v = formatters.cpf(value);
    if (name === 'telefone' || name === 'celular') v = formatters.phone(value);
    if (name === 'cep') v = formatters.cep(value);
    setClienteForm((prev: any) => ({ ...prev, [name]: v }));
  };

  const buscarCnpj = async () => {
    const cnpj = formatters.unmask(clienteForm.cnpj);
    if (cnpj.length !== 14) { toast({ title: "CNPJ inválido", variant: "destructive" }); return; }
    setIsSearchingCnpj(true);
    try {
      const data = await consultarCnpj(cnpj);
      const sociosImportados = data.socios
        ? JSON.stringify(data.socios.map((s: any) => ({
            nome: s.nome || '', qualificacao: s.qualificacao || '', cpf: '', dataNascimento: '', capitalSocial: '', nomeMae: ''
          })))
        : clienteForm.socios;
      setClienteForm((prev: any) => ({
        ...prev,
        razaoSocial: data.razaoSocial || prev.razaoSocial,
        nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
        cep: formatters.cep(data.cep || ''),
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
        telefone: formatters.phone(data.telefone || ''),
        email: data.email || prev.email,
        situacaoReceita: data.situacao || prev.situacaoReceita,
        atividadePrincipal: data.atividadePrincipal || prev.atividadePrincipal,
        socios: sociosImportados,
      }));
      toast({ title: "✓ Dados importados da Receita Federal" });
    } catch {
      toast({ title: "Erro ao consultar CNPJ", description: "Verifique o número e tente novamente.", variant: "destructive" });
    } finally { setIsSearchingCnpj(false); }
  };

  const validarCPF = async () => {
    const cpf = formatters.unmask(clienteForm.cpf);
    if (cpf.length !== 11) { toast({ title: "CPF inválido", variant: "destructive" }); return; }
    try {
      const data = await validarCpf(cpf);
      if (data.valido) {
        setClienteForm((prev: any) => ({ ...prev, situacaoReceita: data.situacao || 'Regular' }));
        toast({ title: "✓ CPF válido", description: "Preencha o nome manualmente." });
      } else {
        toast({ title: "CPF inválido", description: data.situacao || "Número inválido", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao validar CPF", variant: "destructive" }); }
  };

  const buscarCepCliente = async () => {
    const cep = formatters.unmask(clienteForm.cep);
    if (cep.length !== 8) { toast({ title: "CEP inválido", variant: "destructive" }); return; }
    setIsSearchingCep(true);
    try {
      const data = await buscarCep(cep);
      setClienteForm((prev: any) => ({ ...prev, logradouro: data.logradouro || prev.logradouro, complemento: data.complemento || prev.complemento, bairro: data.bairro || prev.bairro, municipio: data.municipio || prev.municipio, uf: data.uf || prev.uf }));
      toast({ title: "✓ Endereço preenchido" });
    } catch (e: any) { toast({ title: "Erro ao buscar CEP", description: e.message, variant: "destructive" }); }
    finally { setIsSearchingCep(false); }
  };

  const salvarCliente = async () => {
    if (!clienteForm.razaoSocial && !clienteForm.nomeResponsavel) {
      toast({ title: "Preencha o nome / razão social", variant: "destructive" }); return;
    }
    setIsSavingCliente(true);
    try {
      const dadosParaSalvar = { ...clienteForm };
      const ativandoAgora = dadosParaSalvar.ativoPortal && !portalAtivoServidor;
      if (ativandoAgora && !dadosParaSalvar.senhaPortal) {
        const ca = contratos.find((c: any) => c.status === 'ativo') || contratos[0];
        if (ca?.numeroContrato) dadosParaSalvar.senhaPortal = ca.numeroContrato;
      }
      if (clienteId) {
        await atualizarCliente.mutateAsync({ id: clienteId, data: dadosParaSalvar });
        setPortalAtivoServidor(!!dadosParaSalvar.ativoPortal);
        setResetandoSenha(false);
        setClienteForm((p: any) => ({ ...p, senhaPortal: '' }));
        toast({ title: "✓ Cliente atualizado!" });
      } else {
        const novo = await criarCliente.mutateAsync({ data: clienteForm });
        setClienteId(novo.id);
        toast({ title: "✓ Cliente cadastrado! Agora você pode adicionar contratos." });
        setActiveTab("juridico");
      }
      queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const apiMsg = err?.data?.message ?? err?.message ?? "";
      if (status === 409) {
        toast({ title: "⚠️ Cliente já cadastrado", description: apiMsg.replace(/^HTTP \d+ [^:]+: /, "") || "CNPJ/CPF já cadastrado.", variant: "destructive", duration: 7000 });
      } else {
        toast({ title: "Erro ao salvar cliente", description: apiMsg.replace(/^HTTP \d+ [^:]+: /, "") || "Verifique os dados.", variant: "destructive" });
      }
    } finally { setIsSavingCliente(false); }
  };

  const excluirClienteHandler = async (id: number) => {
    if (!confirm("Deseja excluir este cliente e todos os seus dados?")) return;
    try {
      await excluirCliente.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
      toast({ title: "✓ Cliente excluído" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const openNovoContrato = () => {
    if (!clienteId) { toast({ title: "Salve o cliente primeiro", variant: "destructive" }); return; }
    setContratoForm({ ...emptyContrato, clienteId });
    setContratoId(null); setIsContratoOpen(true);
  };
  const openEditContrato = (c: Contrato) => { setContratoForm({ ...emptyContrato, ...c }); setContratoId(c.id); setIsContratoOpen(true); };

  const handleContratoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let v: any = value;
    if (name === 'valorContrato') v = formatters.currency(value);
    if (name === 'dataContrato' || name === 'dataVencimento') v = formatters.date(value);
    if (name === 'diaVencimento') v = parseInt(value.replace(/\D/g, '') || '1');
    setContratoForm((prev: any) => ({ ...prev, [name]: v }));
  };

  const salvarContrato = async () => {
    if (!contratoForm.numeroContrato) { toast({ title: "Informe o número do contrato", variant: "destructive" }); return; }
    try {
      const payload = { ...contratoForm, clienteId: clienteId! };
      if (contratoId) {
        await atualizarContrato.mutateAsync({ id: contratoId, data: payload });
        toast({ title: "✓ Contrato atualizado!" });
      } else {
        await criarContrato.mutateAsync({ data: payload });
        toast({ title: "✓ Contrato cadastrado!" });
      }
      queryClient.invalidateQueries({ queryKey: getListarContratosQueryKey({ clienteId: clienteId! }) });
      setIsContratoOpen(false);
    } catch { toast({ title: "Erro ao salvar contrato", variant: "destructive" }); }
  };

  const excluirContratoHandler = async (id: number) => {
    if (!confirm("Deseja excluir este contrato?")) return;
    try {
      await excluirContrato.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListarContratosQueryKey({ clienteId: clienteId! }) });
      toast({ title: "✓ Contrato excluído" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  /* ─── DETAIL VIEW ─── */
  if (view === 'detail') {
    const currentCliente = clientes.find(c => c.id === clienteId);
    return (
      <AppLayout title={clienteId ? (currentCliente?.nomeFantasia || currentCliente?.razaoSocial || 'Editar Cliente') : 'Novo Cliente'}>
        <div className="space-y-5">
          {/* Back nav */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="text-muted-foreground hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            {clienteId && currentCliente?.situacaoReceita && <SituacaoBadge situacao={currentCliente.situacaoReceita} />}
            {clienteId && (
              <span className="font-mono text-xs text-muted-foreground border border-border/40 rounded px-1.5 py-0.5">
                {currentCliente?.codigoCliente || `#${clienteId}`}
              </span>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-secondary/50 border border-border/50 overflow-x-auto flex-nowrap w-full justify-start">
              <TabsTrigger value="dados" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5" /> Dados
              </TabsTrigger>
              {clienteForm.tipo === 'PJ' && (
                <TabsTrigger value="socios" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 shrink-0">
                  <Users className="w-3.5 h-3.5" /> Sócios
                  {(() => { try { const a = JSON.parse(clienteForm.socios || '[]'); return a.length > 0 ? <Badge className="ml-1 bg-primary/20 text-primary text-xs h-4 px-1">{a.length}</Badge> : null; } catch { return null; } })()}
                </TabsTrigger>
              )}
              {clienteForm.tipo === 'PJ' && (
                <TabsTrigger value="governo" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 shrink-0" disabled={!clienteId}>
                  <Globe className="w-3.5 h-3.5" /> Governo
                </TabsTrigger>
              )}
              <TabsTrigger value="juridico" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 shrink-0" disabled={!clienteId}>
                <Scale className="w-3.5 h-3.5" /> Jurídico
                {contratos.length > 0 && <Badge className="ml-1 bg-primary/20 text-primary text-xs h-4 px-1">{contratos.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="portal" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 shrink-0">
                <FolderOpen className="w-3.5 h-3.5" /> Portal
              </TabsTrigger>
            </TabsList>

            {/* ── DADOS CADASTRAIS ── */}
            <TabsContent value="dados" className="mt-5">
              <div className="space-y-4">
                {/* Tipo + Regime + Escritório */}
                <Card className="bg-card border-border/50">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col sm:flex-row gap-5 flex-wrap">
                      <div className="flex-1">
                        <SectionHeader icon={UserCheck} title="Tipo de Cadastro" />
                        <RadioGroup
                          value={clienteForm.tipo}
                          onValueChange={(v) => setClienteForm((p: any) => ({ ...p, tipo: v }))}
                          className="flex gap-5"
                        >
                          {[{ v: 'PJ', label: 'Pessoa Jurídica (CNPJ)', icon: Building2 }, { v: 'PF', label: 'Pessoa Física (CPF)', icon: User }].map(({ v, label, icon: Ic }) => (
                            <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${clienteForm.tipo === v ? 'border-primary bg-primary/10 text-white' : 'border-border/40 text-muted-foreground hover:border-primary/40'}`}>
                              <RadioGroupItem value={v} id={`tipo-${v}`} className="sr-only" />
                              <Ic className="w-4 h-4" />
                              <span className="text-sm font-medium">{label}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                      <div className="min-w-[200px]">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Regime Tributário</Label>
                        <Select value={clienteForm.regimeTributario} onValueChange={(v) => setClienteForm((p: any) => ({ ...p, regimeTributario: v }))}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI', 'Autônomo / PF'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {escritorios.length > 0 && (
                        <div className="min-w-[200px]">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Escritório</Label>
                          <Select
                            value={clienteForm.escritorioId ? String(clienteForm.escritorioId) : ""}
                            onValueChange={(v) => setClienteForm((p: any) => ({ ...p, escritorioId: v ? parseInt(v) : null }))}
                          >
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {escritorios.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nomeFantasia || e.razaoSocial || `#${e.id}`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Código + Documento */}
                <Card className="bg-card border-border/50">
                  <CardContent className="pt-5 pb-5 space-y-5">
                    {clienteForm.codigoCliente && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Código do Cliente</p>
                          <p className="font-mono text-lg font-bold text-primary">{clienteForm.codigoCliente}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">gerado automaticamente</p>
                      </div>
                    )}

                    <SectionHeader icon={FileText} title="Identificação" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clienteForm.tipo === 'PJ' ? (
                        <div className="space-y-2">
                          <Label>CNPJ</Label>
                          <div className="flex gap-2">
                            <Input name="cnpj" value={clienteForm.cnpj} onChange={handleClienteChange} placeholder="00.000.000/0000-00" className="bg-background font-mono" maxLength={18} />
                            <Button onClick={buscarCnpj} disabled={isSearchingCnpj} variant="secondary" className="shrink-0" title="Buscar na Receita Federal">
                              {isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>CPF</Label>
                          <div className="flex gap-2">
                            <Input name="cpf" value={clienteForm.cpf} onChange={handleClienteChange} placeholder="000.000.000-00" className="bg-background font-mono" maxLength={14} />
                            <Button onClick={validarCPF} variant="secondary" className="shrink-0" title="Validar CPF">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Situação na Receita Federal</Label>
                        <Input name="situacaoReceita" value={clienteForm.situacaoReceita} readOnly className="bg-secondary/50 cursor-default font-semibold" placeholder="Busque pelo CNPJ/CPF" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>{clienteForm.tipo === 'PJ' ? 'Razão Social' : 'Nome Completo'}</Label>
                        <Input name="razaoSocial" value={clienteForm.razaoSocial} onChange={handleClienteChange} className="bg-background uppercase" />
                      </div>

                      {clienteForm.tipo === 'PJ' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Nome Fantasia</Label>
                          <Input name="nomeFantasia" value={clienteForm.nomeFantasia} onChange={handleClienteChange} className="bg-background" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Nome do Responsável</Label>
                        <Input name="nomeResponsavel" value={clienteForm.nomeResponsavel} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      {clienteForm.tipo === 'PJ' && (
                        <div className="space-y-2">
                          <Label>Atividade Principal (CNAE)</Label>
                          <Input name="atividadePrincipal" value={clienteForm.atividadePrincipal} onChange={handleClienteChange} className="bg-background" />
                        </div>
                      )}
                    </div>

                    <SectionHeader icon={DollarSign} title="Contato" color="text-emerald-400" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>E-mail</Label>
                        <Input name="email" value={clienteForm.email} onChange={handleClienteChange} type="email" className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input name="telefone" value={clienteForm.telefone} onChange={handleClienteChange} placeholder="(00) 0000-0000" className="bg-background" maxLength={14} />
                      </div>
                      <div className="space-y-2">
                        <Label>Celular</Label>
                        <Input name="celular" value={clienteForm.celular} onChange={handleClienteChange} placeholder="(00) 00000-0000" className="bg-background" maxLength={15} />
                      </div>
                    </div>

                    <SectionHeader icon={MapPin} title="Endereço" color="text-blue-400" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <div className="flex gap-2">
                          <Input
                            name="cep"
                            value={clienteForm.cep}
                            onChange={(e) => {
                              handleClienteChange(e);
                              if (e.target.value.replace(/\D/g, "").length === 8) setTimeout(buscarCepCliente, 100);
                            }}
                            placeholder="00000-000"
                            className="bg-background font-mono"
                            maxLength={9}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={buscarCepCliente} disabled={isSearchingCep} title="Buscar endereço">
                            {isSearchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Logradouro</Label>
                        <Input name="logradouro" value={clienteForm.logradouro} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input name="numero" value={clienteForm.numero} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Complemento</Label>
                        <Input name="complemento" value={clienteForm.complemento} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>Bairro</Label>
                        <Input name="bairro" value={clienteForm.bairro} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Município</Label>
                        <Input name="municipio" value={clienteForm.municipio} onChange={handleClienteChange} className="bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label>UF</Label>
                        <Input name="uf" value={clienteForm.uf} onChange={handleClienteChange} className="bg-background uppercase" maxLength={2} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setView('list')}>Cancelar</Button>
                  <Button onClick={salvarCliente} disabled={isSavingCliente} className="bg-gradient-to-r from-primary to-indigo-600 px-8">
                    {isSavingCliente && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {clienteId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ── SÓCIOS ── */}
            <TabsContent value="socios" className="mt-5">
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Quadro de Sócios</h3>
                        <p className="text-xs text-muted-foreground">Sócios, administradores e representantes legais</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <TabSocios
                    value={clienteForm.socios || '[]'}
                    onChange={(json) => setClienteForm((p: any) => ({ ...p, socios: json }))}
                  />
                </CardContent>
              </Card>
              <div className="flex justify-end gap-3 mt-4">
                <Button onClick={salvarCliente} disabled={isSavingCliente} className="bg-gradient-to-r from-primary to-indigo-600 px-8">
                  {isSavingCliente && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Sócios
                </Button>
              </div>
            </TabsContent>

            {/* ── GOVERNO ── */}
            <TabsContent value="governo" className="mt-5">
              <TabGoverno
                form={{
                  jucebNumero: clienteForm.jucebNumero || '',
                  jucebData: clienteForm.jucebData || '',
                  jucebSituacao: clienteForm.jucebSituacao || '',
                  jucebObservacoes: clienteForm.jucebObservacoes || '',
                  inscricaoMunicipal: clienteForm.inscricaoMunicipal || '',
                  inscricaoEstadual: clienteForm.inscricaoEstadual || '',
                  arquivoInscricaoMunicipal: clienteForm.arquivoInscricaoMunicipal || '',
                  arquivoInscricaoMunicipalNome: clienteForm.arquivoInscricaoMunicipalNome || '',
                  arquivoInscricaoEstadual: clienteForm.arquivoInscricaoEstadual || '',
                  arquivoInscricaoEstadualNome: clienteForm.arquivoInscricaoEstadualNome || '',
                }}
                onFormChange={(campo, valor) => setClienteForm((p: any) => ({ ...p, [campo]: valor }))}
                clienteId={clienteId}
                alvaras={alvaras}
                onAlvaraCreate={async (a) => { await criarAlvara({ ...a, clienteId }); await fetchAlvaras(clienteId!); }}
                onAlvaraUpdate={async (id, a) => { await atualizarAlvara(id, a); await fetchAlvaras(clienteId!); }}
                onAlvaraDelete={async (id) => { await excluirAlvaraCh(id); await fetchAlvaras(clienteId!); }}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button onClick={salvarCliente} disabled={isSavingCliente} className="bg-gradient-to-r from-primary to-indigo-600 px-8">
                  {isSavingCliente && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Dados Governo
                </Button>
              </div>
            </TabsContent>

            {/* ── JURÍDICO ── */}
            <TabsContent value="juridico" className="mt-5">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-white">Contratos</h3>
                      <p className="text-sm text-muted-foreground">Contratos vinculados a este cliente</p>
                    </div>
                    <Button onClick={openNovoContrato} className="bg-gradient-to-r from-primary to-indigo-600">
                      <Plus className="w-4 h-4 mr-2" /> Novo Contrato
                    </Button>
                  </div>

                  {contratos.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum contrato cadastrado.</p>
                      <Button onClick={openNovoContrato} variant="link" className="text-primary mt-2">+ Adicionar primeiro contrato</Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-secondary/50">
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead>Nº Contrato</TableHead>
                          <TableHead>Objeto</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratos.map((c) => (
                          <TableRow key={c.id} className="border-border/50 group hover:bg-secondary/30">
                            <TableCell className="font-mono font-semibold text-primary">#{c.numeroContrato}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.objeto || '—'}</TableCell>
                            <TableCell className="font-medium">{c.valorContrato || '—'}</TableCell>
                            <TableCell className="text-sm">{c.dataContrato || '—'}</TableCell>
                            <TableCell className="text-sm">{c.dataVencimento || (c.diaVencimento ? `Todo dia ${c.diaVencimento}` : '—')}</TableCell>
                            <TableCell><StatusContratoBadge status={c.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openEditContrato(c)} className="h-8 w-8 hover:text-primary"><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => excluirContratoHandler(c.id)} className="h-8 w-8 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PORTAL ── */}
            <TabsContent value="portal" className="mt-5">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary" /> Acesso ao Portal</h3>
                      <p className="text-sm text-muted-foreground mt-1">Controle o acesso ao portal de documentos</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${clienteForm.ativoPortal ? 'text-green-400' : 'text-muted-foreground'}`}>{clienteForm.ativoPortal ? 'Ativo' : 'Inativo'}</span>
                      <button type="button" onClick={() => setClienteForm((p: any) => ({ ...p, ativoPortal: !p.ativoPortal }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${clienteForm.ativoPortal ? 'bg-primary' : 'bg-secondary'}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${clienteForm.ativoPortal ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {clienteForm.ativoPortal ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Login do cliente</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-mono text-sm text-white">{clienteForm.cnpj || clienteForm.cpf || 'CNPJ ou CPF'}</span>
                          </div>
                        </div>
                        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Senha padrão</p>
                          {(() => {
                            const ca = contratos.find((c: any) => c.status === 'ativo') || contratos[0];
                            const sd = ca?.numeroContrato || '';
                            return (
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-mono text-sm text-white flex-1">
                                  {sd ? (mostrarSenhaPortal ? sd : '•'.repeat(sd.length)) : <span className="text-muted-foreground text-xs">Sem contrato</span>}
                                </span>
                                {sd && <button type="button" onClick={() => setMostrarSenhaPortal(v => !v)} className="text-muted-foreground hover:text-white">{mostrarSenhaPortal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {!resetandoSenha ? (
                        <button type="button" onClick={() => setResetandoSenha(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Key className="w-3 h-3" /> Definir senha personalizada
                        </button>
                      ) : (
                        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-medium text-white">Nova senha</p>
                          <div className="flex gap-2">
                            <Input name="senhaPortal" type="password" value={clienteForm.senhaPortal || ''} onChange={handleClienteChange} placeholder="Mínimo 6 caracteres" className="bg-background" />
                            <Button type="button" variant="ghost" onClick={() => { setResetandoSenha(false); setClienteForm((p: any) => ({ ...p, senhaPortal: '' })); }}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <p className="text-sm text-blue-300 font-medium">Link de acesso ao portal</p>
                        </div>
                        <p className="text-xs text-muted-foreground pl-5 mt-1">
                          <span className="font-mono text-blue-400">[sistema]/portal/[slug-do-escritório]</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary/40 border border-border/50 rounded-xl p-5 text-center">
                      <FolderOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Portal desativado. Ative o toggle acima para liberar o acesso.</p>
                    </div>
                  )}
                  <div className="flex justify-end pt-2 border-t border-border/50">
                    <Button onClick={salvarCliente} disabled={isSavingCliente} className="bg-primary px-8">
                      {isSavingCliente && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Dialog Contrato ── */}
        <Dialog open={isContratoOpen} onOpenChange={setIsContratoOpen}>
          <DialogContent className="max-w-2xl bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {contratoId ? 'Editar Contrato' : 'Novo Contrato'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número do Contrato <span className="text-destructive">*</span></Label>
                  <Input name="numeroContrato" value={contratoForm.numeroContrato} onChange={handleContratoChange} placeholder="Ex: 001/2025" className="bg-background font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Mensal</Label>
                  <Input name="valorContrato" value={contratoForm.valorContrato} onChange={handleContratoChange} placeholder="R$ 0,00" className="bg-background" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Objeto / Descrição</Label>
                  <Input name="objeto" value={contratoForm.objeto} onChange={handleContratoChange} placeholder="Descreva o objeto do contrato" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input name="dataContrato" value={contratoForm.dataContrato} onChange={handleContratoChange} placeholder="DD/MM/AAAA" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento (recorrente)</Label>
                  <Input name="diaVencimento" value={contratoForm.diaVencimento} onChange={handleContratoChange} type="number" min={1} max={31} placeholder="5" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Encerramento</Label>
                  <Input name="dataVencimento" value={contratoForm.dataVencimento} onChange={handleContratoChange} placeholder="DD/MM/AAAA ou vazio" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={contratoForm.status} onValueChange={(v) => setContratoForm((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['ativo', 'inativo', 'vencido', 'cancelado'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="observacoes" value={contratoForm.observacoes} onChange={handleContratoChange} className="bg-background min-h-[70px] resize-none" placeholder="Informações adicionais..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                <Button variant="ghost" onClick={() => setIsContratoOpen(false)}>Cancelar</Button>
                <Button onClick={salvarContrato} className="bg-gradient-to-r from-primary to-indigo-600">
                  {contratoId ? 'Salvar Alterações' : 'Cadastrar Contrato'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AppLayout>
    );
  }

  /* ─── LIST VIEW ─── */
  return (
    <AppLayout title="Clientes">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} {selectedEscritorioId ? 'neste escritório' : 'no total'}
            </p>
          </div>
          <Button onClick={openNew} className="bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou CPF..."
              className="pl-9 bg-card border-border/50"
            />
          </div>
          {escritorios.length > 1 && (
            <Select value={selectedEscritorioId ? String(selectedEscritorioId) : "all"} onValueChange={v => setSelectedEscritorioId(v === 'all' ? null : parseInt(v))}>
              <SelectTrigger className="w-[220px] bg-card border-border/50"><SelectValue placeholder="Todos os escritórios" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os escritórios</SelectItem>
                {escritorios.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nomeFantasia || e.razaoSocial}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredClientes.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Building2 className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">{searchTerm ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
                {!searchTerm && <Button onClick={openNew} variant="link" className="text-primary mt-2">+ Cadastrar primeiro cliente</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="pl-5">Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead>Situação RF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right pr-5">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-border/50 group hover:bg-secondary/30 cursor-pointer"
                      onClick={() => openEdit(c)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                            {c.tipo === 'PJ' ? <Building2 className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-[200px]">{c.nomeFantasia || c.razaoSocial || '—'}</p>
                            {c.nomeFantasia && c.razaoSocial && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.razaoSocial}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">{c.cnpj || c.cpf || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {c.regimeTributario ? (
                          <span className="px-2 py-0.5 text-xs rounded-md border border-border/40 text-muted-foreground">{c.regimeTributario}</span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell><SituacaoBadge situacao={c.situacaoReceita} /></TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {c.email && <p className="text-muted-foreground truncate max-w-[160px]">{c.email}</p>}
                          {c.celular && <p className="text-xs text-muted-foreground">{c.celular}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-5" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 hover:text-primary"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => excluirClienteHandler(c.id)} className="h-8 w-8 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
