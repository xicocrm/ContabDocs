import { useState } from "react";
import { buscarCep } from "@/lib/cep";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListarClientes,
  useListarEscritorios,
  useCriarCliente, 
  useAtualizarCliente, 
  useExcluirCliente,
  useListarContratos,
  useCriarContrato,
  useAtualizarContrato,
  useExcluirContrato,
  consultarCnpj,
  validarCpf,
  getListarClientesQueryKey,
  getListarContratosQueryKey,
  Cliente,
  Contrato,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText, CheckCircle, AlertCircle, DollarSign, Calendar, MapPin
} from "lucide-react";

const emptyCliente = {
  tipo: 'PJ', cnpj: '', cpf: '', razaoSocial: '', nomeFantasia: '', nomeResponsavel: '',
  email: '', telefone: '', celular: '', cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', municipio: '', uf: '', situacaoReceita: '', socios: '', regimeTributario: '',
  atividadePrincipal: '', codigoCliente: ''
};

function gerarCodigoCliente(total: number) {
  return `CLI-${String(total + 1).padStart(4, '0')}`;
}

const emptyContrato = {
  clienteId: 0, numeroContrato: '', valorContrato: '', dataContrato: '',
  diaVencimento: 5, dataVencimento: '', objeto: '', status: 'ativo', observacoes: ''
};

function SituacaoBadge({ situacao }: { situacao?: string | null }) {
  if (!situacao) return <span className="text-muted-foreground text-xs">—</span>;
  const isAtiva = situacao.toUpperCase().includes('ATIVA') || situacao.toUpperCase().includes('REGULAR');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isAtiva ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
      {isAtiva ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
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
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase ${map[key] || map['inativo']}`}>
      {status || 'inativo'}
    </span>
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
  const criarCliente = useCriarCliente();
  const atualizarCliente = useAtualizarCliente();
  const excluirCliente = useExcluirCliente();

  const criarContrato = useCriarContrato();
  const atualizarContrato = useAtualizarContrato();
  const excluirContrato = useExcluirContrato();

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteForm, setClienteForm] = useState<any>(emptyCliente);
  const [isSavingCliente, setIsSavingCliente] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dados");

  const [isContratoOpen, setIsContratoOpen] = useState(false);
  const [contratoId, setContratoId] = useState<number | null>(null);
  const [contratoForm, setContratoForm] = useState<any>(emptyContrato);

  const { data: contratos = [] } = useListarContratos(
    clienteId ? { clienteId } : undefined
  );

  const filteredClientes = clientes.filter(c =>
    (c.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cnpj || '').includes(searchTerm) ||
    (c.cpf || '').includes(searchTerm)
  );

  const openNew = () => {
    setClienteForm({
      ...emptyCliente,
      escritorioId: selectedEscritorioId ?? undefined,
      codigoCliente: gerarCodigoCliente(clientes.length),
    });
    setClienteId(null);
    setActiveTab("dados");
    setView('detail');
  };

  const openEdit = (c: Cliente) => {
    setClienteForm({ ...emptyCliente, ...c });
    setClienteId(c.id);
    setActiveTab("dados");
    setView('detail');
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        socios: data.socios ? data.socios.map((s: any) => `${s.nome} (${s.qualificacao})`).join(' | ') : prev.socios,
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
        toast({ title: "✓ CPF válido — preencha o nome abaixo", description: "A Receita Federal não disponibiliza nomes via API pública. Digite o nome completo manualmente." });
      } else {
        toast({ title: "CPF inválido", description: data.situacao || "Número inválido", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao validar CPF", variant: "destructive" });
    }
  };

  const buscarCepCliente = async () => {
    const cep = formatters.unmask(clienteForm.cep);
    if (cep.length !== 8) { toast({ title: "CEP inválido", description: "O CEP deve ter 8 dígitos", variant: "destructive" }); return; }
    setIsSearchingCep(true);
    try {
      const data = await buscarCep(cep);
      setClienteForm((prev: any) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
      }));
      toast({ title: "✓ Endereço preenchido pelos Correios" });
    } catch (e: any) {
      toast({ title: "Erro ao buscar CEP", description: e.message || "Verifique o CEP e tente novamente.", variant: "destructive" });
    } finally { setIsSearchingCep(false); }
  };

  const salvarCliente = async () => {
    if (!clienteForm.razaoSocial && !clienteForm.nomeResponsavel) {
      toast({ title: "Preencha o nome / razão social", variant: "destructive" }); return;
    }
    setIsSavingCliente(true);
    try {
      if (clienteId) {
        await atualizarCliente.mutateAsync({ id: clienteId, data: clienteForm });
        toast({ title: "✓ Cliente atualizado!" });
      } else {
        const novo = await criarCliente.mutateAsync({ data: clienteForm });
        setClienteId(novo.id);
        toast({ title: "✓ Cliente cadastrado! Agora você pode adicionar contratos." });
        setActiveTab("juridico");
      }
      queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
    } catch {
      toast({ title: "Erro ao salvar cliente", variant: "destructive" });
    } finally { setIsSavingCliente(false); }
  };

  const excluirClienteHandler = async (id: number) => {
    if (!confirm("Deseja excluir este cliente e todos os seus contratos?")) return;
    try {
      await excluirCliente.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
      toast({ title: "✓ Cliente excluído" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const openNovoContrato = () => {
    if (!clienteId) { toast({ title: "Salve o cliente primeiro", variant: "destructive" }); return; }
    setContratoForm({ ...emptyContrato, clienteId });
    setContratoId(null);
    setIsContratoOpen(true);
  };

  const openEditContrato = (c: Contrato) => {
    setContratoForm({ ...emptyContrato, ...c });
    setContratoId(c.id);
    setIsContratoOpen(true);
  };

  const handleContratoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let v: string | number = value;
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

  if (view === 'detail') {
    const currentCliente = clientes.find(c => c.id === clienteId);
    return (
      <AppLayout title={clienteId ? (currentCliente?.nomeFantasia || currentCliente?.razaoSocial || 'Editar Cliente') : 'Novo Cliente'}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView('list')} className="text-muted-foreground hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para lista
            </Button>
            {clienteId && currentCliente?.situacaoReceita && (
              <SituacaoBadge situacao={currentCliente.situacaoReceita} />
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-secondary/50 border border-border/50">
              <TabsTrigger value="dados" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6">
                <User className="w-4 h-4 mr-2" /> Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="juridico" className="data-[state=active]:bg-primary data-[state=active]:text-white px-6" disabled={!clienteId}>
                <FileText className="w-4 h-4 mr-2" /> Jurídico
                {contratos.length > 0 && (
                  <Badge className="ml-2 bg-primary/20 text-primary text-xs h-5 px-1.5">{contratos.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── DADOS CADASTRAIS ── */}
            <TabsContent value="dados" className="mt-6">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6 space-y-6">
                  {/* Tipo e Regime */}
                  <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">Tipo de Inscrição</Label>
                      <RadioGroup
                        value={clienteForm.tipo}
                        onValueChange={(v) => setClienteForm((p: any) => ({ ...p, tipo: v }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="PJ" id="tipo-pj" />
                          <Label htmlFor="tipo-pj" className="cursor-pointer">
                            <Building2 className="w-4 h-4 inline mr-1 text-primary" /> Pessoa Jurídica (CNPJ)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="PF" id="tipo-pf" />
                          <Label htmlFor="tipo-pf" className="cursor-pointer">
                            <User className="w-4 h-4 inline mr-1 text-primary" /> Pessoa Física (CPF)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="min-w-[220px]">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">Regime Tributário</Label>
                      <Select value={clienteForm.regimeTributario} onValueChange={(v) => setClienteForm((p: any) => ({ ...p, regimeTributario: v }))}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                          <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                          <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                          <SelectItem value="MEI">MEI</SelectItem>
                          <SelectItem value="Autônomo / PF">Autônomo / PF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {escritorios.length > 0 && (
                      <div className="min-w-[220px]">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">Escritório</Label>
                        <Select
                          value={clienteForm.escritorioId ? String(clienteForm.escritorioId) : ""}
                          onValueChange={(v) => setClienteForm((p: any) => ({ ...p, escritorioId: v ? parseInt(v) : null }))}
                        >
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {escritorios.map(e => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.nomeFantasia || e.razaoSocial || `Escritório #${e.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Código do cliente */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Código do Cliente</Label>
                      <p className="font-mono text-xl font-bold text-primary mt-0.5">{clienteForm.codigoCliente || '—'}</p>
                    </div>
                    {clienteForm.codigoCliente && (
                      <div className="text-xs text-muted-foreground text-right">
                        <p>ID interno</p>
                        <p>gerado automaticamente</p>
                      </div>
                    )}
                  </div>

                  {/* Documento + busca */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clienteForm.tipo === 'PJ' ? (
                      <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <div className="flex gap-2">
                          <Input
                            name="cnpj"
                            value={clienteForm.cnpj}
                            onChange={handleClienteChange}
                            placeholder="00.000.000/0000-00"
                            className="bg-background font-mono"
                            maxLength={18}
                          />
                          <Button onClick={buscarCnpj} disabled={isSearchingCnpj} variant="secondary" className="shrink-0">
                            {isSearchingCnpj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <div className="flex gap-2">
                          <Input
                            name="cpf"
                            value={clienteForm.cpf}
                            onChange={handleClienteChange}
                            placeholder="000.000.000-00"
                            className="bg-background font-mono"
                            maxLength={14}
                          />
                          <Button onClick={validarCPF} variant="secondary" className="shrink-0">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Situação na Receita Federal</Label>
                      <Input
                        name="situacaoReceita"
                        value={clienteForm.situacaoReceita}
                        readOnly
                        className="bg-secondary/50 cursor-default font-semibold"
                        placeholder="Busque pelo CNPJ/CPF para preencher"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>{clienteForm.tipo === 'PJ' ? 'Razão Social' : 'Nome Completo'}</Label>
                      <Input name="razaoSocial" value={clienteForm.razaoSocial} onChange={handleClienteChange} className="bg-background" />
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

                    <div className="space-y-2">
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

                    {clienteForm.tipo === 'PJ' && (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Atividade Principal (CNAE)</Label>
                          <Input name="atividadePrincipal" value={clienteForm.atividadePrincipal} onChange={handleClienteChange} className="bg-background" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Quadro de Sócios</Label>
                          <Input name="socios" value={clienteForm.socios} onChange={handleClienteChange} className="bg-background text-sm" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Endereço */}
                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-4 block">Endereço</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <div className="flex gap-2">
                          <Input
                            name="cep"
                            value={clienteForm.cep}
                            onChange={(e) => {
                              handleClienteChange(e);
                              const raw = e.target.value.replace(/\D/g, "");
                              if (raw.length === 8) {
                                setTimeout(() => buscarCepCliente(), 100);
                              }
                            }}
                            placeholder="00000-000"
                            className="bg-background font-mono"
                            maxLength={9}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={buscarCepCliente}
                            disabled={isSearchingCep}
                            title="Buscar endereço pelos Correios"
                          >
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
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                    <Button variant="ghost" onClick={() => setView('list')}>Cancelar</Button>
                    <Button onClick={salvarCliente} disabled={isSavingCliente} className="bg-primary px-8">
                      {isSavingCliente && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {clienteId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── JURÍDICO ── */}
            <TabsContent value="juridico" className="mt-6">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6 space-y-4">
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
                      <p>Nenhum contrato cadastrado para este cliente.</p>
                      <Button onClick={openNovoContrato} variant="link" className="text-primary mt-2">
                        + Adicionar primeiro contrato
                      </Button>
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
                            <TableCell className="text-sm">
                              {c.dataVencimento || (c.diaVencimento ? `Todo dia ${c.diaVencimento}` : '—')}
                            </TableCell>
                            <TableCell><StatusContratoBadge status={c.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openEditContrato(c)} className="h-8 w-8 hover:text-primary">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => excluirContratoHandler(c.id)} className="h-8 w-8 hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
                  <Input name="numeroContrato" value={contratoForm.numeroContrato} onChange={handleContratoChange} className="bg-background font-mono" placeholder="001/2024" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={contratoForm.status} onValueChange={(v) => setContratoForm((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor do Contrato</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="valorContrato" value={contratoForm.valorContrato} onChange={handleContratoChange} className="bg-background pl-9" placeholder="R$ 0,00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data do Contrato</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="dataContrato" value={contratoForm.dataContrato} onChange={handleContratoChange} className="bg-background pl-9" placeholder="DD/MM/AAAA" maxLength={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento (1–31)</Label>
                  <Input type="number" min={1} max={31} name="diaVencimento" value={contratoForm.diaVencimento} onChange={handleContratoChange} className="bg-background" placeholder="5" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Término</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="dataVencimento" value={contratoForm.dataVencimento} onChange={handleContratoChange} className="bg-background pl-9" placeholder="DD/MM/AAAA" maxLength={10} />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Objeto do Contrato</Label>
                  <Input name="objeto" value={contratoForm.objeto} onChange={handleContratoChange} className="bg-background" placeholder="Ex: Prestação de serviços contábeis mensais" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="observacoes" value={contratoForm.observacoes} onChange={handleContratoChange} className="bg-background resize-none" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsContratoOpen(false)}>Cancelar</Button>
                <Button onClick={salvarContrato} disabled={criarContrato.isPending || atualizarContrato.isPending} className="bg-primary px-8">
                  {(criarContrato.isPending || atualizarContrato.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Contrato
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </AppLayout>
    );
  }

  // ── LIST VIEW ──
  return (
    <AppLayout title="Clientes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card border-border/50"
              />
            </div>
            {escritorios.length > 0 && (
              <Select
                value={selectedEscritorioId ? String(selectedEscritorioId) : "todos"}
                onValueChange={(v) => setSelectedEscritorioId(v === "todos" ? null : parseInt(v))}
              >
                <SelectTrigger className="bg-card border-border/50 w-full sm:w-56">
                  <SelectValue placeholder="Todos os escritórios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os escritórios</SelectItem>
                  {escritorios.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nomeFantasia || e.razaoSocial || `Escritório #${e.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={openNew} className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        <Card className="bg-card border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-10">Tipo</TableHead>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      Nenhum cliente encontrado. <button onClick={openNew} className="text-primary underline ml-1">Cadastrar agora</button>
                    </TableCell>
                  </TableRow>
                ) : filteredClientes.map((c) => (
                  <TableRow key={c.id} className="border-border/50 group hover:bg-secondary/30 cursor-pointer" onClick={() => openEdit(c)}>
                    <TableCell>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        {c.tipo === 'PJ' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        {(c as any).codigoCliente || `#${c.id}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{c.nomeFantasia || c.razaoSocial || '—'}</p>
                        {c.nomeFantasia && c.razaoSocial && <p className="text-xs text-muted-foreground">{c.razaoSocial}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.tipo === 'PJ' ? c.cnpj : c.cpf}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded bg-secondary/80 text-muted-foreground">{c.regimeTributario || '—'}</span>
                    </TableCell>
                    <TableCell><SituacaoBadge situacao={c.situacaoReceita} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="h-8 w-8 hover:text-primary">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); excluirClienteHandler(c.id); }} className="h-8 w-8 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

