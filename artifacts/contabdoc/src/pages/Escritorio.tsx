import { useState } from "react";
import { buscarCep } from "@/lib/cep";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEscritorio } from "@/contexts/EscritorioContext";
import {
  useListarEscritorios,
  useCriarEscritorio,
  useAtualizarEscritorio,
  useExcluirEscritorio,
  consultarCnpj,
  validarCpf,
  getListarEscritoriosQueryKey,
  Escritorio,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Plus, Search, Edit, Trash2, Building2, User, ArrowLeft,
  CheckCircle2, AlertTriangle, Save, MapPin, PenLine, Upload, X
} from "lucide-react";

const emptyEscritorio = {
  tipo: "PJ", cnpj: "", cpf: "", razaoSocial: "", nomeFantasia: "",
  nomeResponsavel: "", email: "", telefone: "", celular: "",
  cep: "", logradouro: "", numero: "", complemento: "",
  bairro: "", municipio: "", uf: "", situacao: "", slug: "", logoUrl: "",
  contadorNome: "", contadorCrc: "", contadorCpf: "", contadorEmail: "",
  contadorTelefone: "", contadorAssinatura: "",
};

function SituacaoBadge({ situacao }: { situacao?: string | null }) {
  if (!situacao) return <span className="text-muted-foreground text-xs">—</span>;
  const isOk = situacao.toUpperCase().includes("ATIVA") || situacao.toUpperCase().includes("REGULAR");
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOk ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {isOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {situacao}
    </span>
  );
}

export default function EscritorioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: escritorios = [], isLoading } = useListarEscritorios();
  const criarEscritorio = useCriarEscritorio();
  const atualizarEscritorio = useAtualizarEscritorio();
  const excluirEscritorio = useExcluirEscritorio();

  const { escritorioId: activeEscritorioId, setEscritorio: setActiveEscritorio } = useEscritorio();

  const [view, setView] = useState<"list" | "detail">("list");
  const [escritorioId, setEscritorioId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(emptyEscritorio);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = escritorios.filter(e =>
    (e.razaoSocial || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.nomeFantasia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cnpj || "").includes(searchTerm) ||
    (e.cpf || "").includes(searchTerm)
  );

  const openNew = () => {
    setForm(emptyEscritorio);
    setEscritorioId(null);
    setView("detail");
  };

  const openEdit = (e: Escritorio) => {
    setForm({
      ...emptyEscritorio,
      ...e,
      cnpj: e.cnpj ? formatters.cnpj(e.cnpj) : "",
      cpf: e.cpf ? formatters.cpf(e.cpf) : "",
      telefone: e.telefone ? formatters.phone(e.telefone) : "",
      celular: e.celular ? formatters.phone(e.celular) : "",
      cep: e.cep ? formatters.cep(e.cep) : "",
    });
    setEscritorioId(e.id);
    setView("detail");
  };

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = ev.target;
    let v = value;
    if (name === "cnpj") v = formatters.cnpj(value);
    if (name === "cpf") v = formatters.cpf(value);
    if (name === "telefone" || name === "celular") v = formatters.phone(value);
    if (name === "cep") v = formatters.cep(value);
    setForm((p: any) => ({ ...p, [name]: v }));
  };

  const buscarCnpj = async () => {
    const cnpj = formatters.unmask(form.cnpj);
    if (cnpj.length !== 14) { toast({ title: "CNPJ inválido", variant: "destructive" }); return; }
    setIsSearching(true);
    try {
      const data = await consultarCnpj(cnpj);
      setForm((p: any) => ({
        ...p,
        razaoSocial: data.razaoSocial || p.razaoSocial,
        nomeFantasia: data.nomeFantasia || p.nomeFantasia,
        cep: formatters.cep(data.cep || ""),
        logradouro: data.logradouro || p.logradouro,
        numero: data.numero || p.numero,
        complemento: data.complemento || p.complemento,
        bairro: data.bairro || p.bairro,
        municipio: data.municipio || p.municipio,
        uf: data.uf || p.uf,
        telefone: formatters.phone(data.telefone || ""),
        email: data.email || p.email,
        situacao: data.situacao || p.situacao,
      }));
      toast({ title: "✓ Dados importados da Receita Federal" });
    } catch {
      toast({ title: "Erro ao consultar CNPJ", variant: "destructive" });
    } finally { setIsSearching(false); }
  };

  const buscarCpf = async () => {
    const cpf = formatters.unmask(form.cpf);
    if (cpf.length !== 11) { toast({ title: "CPF inválido", variant: "destructive" }); return; }
    setIsSearching(true);
    try {
      const data = await validarCpf(cpf);
      if (data.valido) {
        setForm((p: any) => ({ ...p, nomeResponsavel: data.nome || p.nomeResponsavel, situacao: data.situacao || "Regular" }));
        toast({ title: "✓ CPF válido — preencha o nome abaixo", description: "A Receita Federal não disponibiliza nomes via API pública. Digite o nome completo manualmente." });
      } else {
        toast({ title: "CPF inválido", description: data.situacao || "Número inválido", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao validar CPF", variant: "destructive" });
    } finally { setIsSearching(false); }
  };

  const buscarCepEscritorio = async () => {
    const cep = formatters.unmask(form.cep);
    if (cep.length !== 8) { toast({ title: "CEP inválido", description: "O CEP deve ter 8 dígitos", variant: "destructive" }); return; }
    setIsSearchingCep(true);
    try {
      const data = await buscarCep(cep);
      setForm((p: any) => ({
        ...p,
        logradouro: data.logradouro || p.logradouro,
        complemento: data.complemento || p.complemento,
        bairro: data.bairro || p.bairro,
        municipio: data.municipio || p.municipio,
        uf: data.uf || p.uf,
      }));
      toast({ title: "✓ Endereço preenchido pelos Correios" });
    } catch (e: any) {
      toast({ title: "Erro ao buscar CEP", description: e.message || "Verifique o CEP e tente novamente.", variant: "destructive" });
    } finally { setIsSearchingCep(false); }
  };

  const salvar = async () => {
    if (!form.razaoSocial && !form.nomeResponsavel) {
      toast({ title: "Preencha a Razão Social ou Nome", variant: "destructive" }); return;
    }
    setIsSaving(true);
    try {
      if (escritorioId) {
        await atualizarEscritorio.mutateAsync({ id: escritorioId, data: form });
        toast({ title: "✓ Escritório atualizado!" });
      } else {
        const novo = await criarEscritorio.mutateAsync({ data: form });
        setEscritorioId(novo.id);
        toast({ title: "✓ Escritório cadastrado!" });
      }
      queryClient.invalidateQueries({ queryKey: getListarEscritoriosQueryKey() });
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Erro ao salvar";
      toast({ title: msg, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm("Deseja excluir este escritório?")) return;
    try {
      await excluirEscritorio.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListarEscritoriosQueryKey() });
      toast({ title: "✓ Escritório excluído" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  /* ── DETALHE ── */
  if (view === "detail") {
    return (
      <AppLayout title={escritorioId ? (form.nomeFantasia || form.razaoSocial || "Editar Escritório") : "Novo Escritório"}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView("list")} className="text-muted-foreground hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para lista
            </Button>
            {form.situacao && <SituacaoBadge situacao={form.situacao} />}
          </div>

          <Card className="bg-card border-border/50">
            <div className="h-1.5 bg-gradient-to-r from-primary to-indigo-500 w-full rounded-t-lg" />
            <CardContent className="pt-6 space-y-6">

              {/* Tipo */}
              <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-3 block">Tipo de Inscrição</Label>
                  <RadioGroup value={form.tipo} onValueChange={(v) => setForm((p: any) => ({ ...p, tipo: v }))} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="PJ" id="e-pj" />
                      <Label htmlFor="e-pj" className="cursor-pointer"><Building2 className="w-4 h-4 inline mr-1 text-primary" /> Pessoa Jurídica (CNPJ)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="PF" id="e-pf" />
                      <Label htmlFor="e-pf" className="cursor-pointer"><User className="w-4 h-4 inline mr-1 text-primary" /> Pessoa Física (CPF)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Documento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.tipo === "PJ" ? (
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <div className="flex gap-2">
                      <Input name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className="bg-background font-mono" maxLength={18} />
                      <Button onClick={buscarCnpj} disabled={isSearching} variant="secondary" className="shrink-0">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <div className="flex gap-2">
                      <Input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" className="bg-background font-mono" maxLength={14} />
                      <Button onClick={buscarCpf} disabled={isSearching} variant="secondary" className="shrink-0">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Situação na Receita Federal</Label>
                  <Input name="situacao" value={form.situacao} readOnly className="bg-secondary/50 cursor-default font-semibold" placeholder="Busque pelo CNPJ/CPF" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{form.tipo === "PJ" ? "Razão Social" : "Nome Completo"}</Label>
                  <Input name="razaoSocial" value={form.razaoSocial} onChange={handleChange} className="bg-background" />
                </div>

                {form.tipo === "PJ" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome Fantasia</Label>
                    <Input name="nomeFantasia" value={form.nomeFantasia} onChange={handleChange} className="bg-background" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Nome do Responsável</Label>
                  <Input name="nomeResponsavel" value={form.nomeResponsavel} onChange={handleChange} className="bg-background" />
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input name="email" value={form.email} onChange={handleChange} type="email" className="bg-background" />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 0000-0000" className="bg-background" maxLength={14} />
                </div>

                <div className="space-y-2">
                  <Label>Celular / WhatsApp</Label>
                  <Input name="celular" value={form.celular} onChange={handleChange} placeholder="(00) 00000-0000" className="bg-background" maxLength={15} />
                </div>
              </div>

              {/* Portal */}
              <div className="pt-4 border-t border-border/50">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-4 block">Portal do Cliente</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Slug do Portal</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/portal/</span>
                      <Input
                        name="slug"
                        value={form.slug}
                        onChange={(e) => {
                          const v = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
                          setForm((p: any) => ({ ...p, slug: v }));
                        }}
                        placeholder="meuescritorio"
                        className="bg-background pl-16 font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Apenas letras minúsculas e números, sem espaços. Ex: cnservicos</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Logo do Escritório</Label>
                    <div className="flex items-center gap-3">
                      {form.logoUrl ? (
                        <div className="relative">
                          <img src={form.logoUrl} alt="Logo" className="h-12 max-w-[120px] object-contain rounded border border-border/50 bg-secondary/30 p-1" />
                          <button
                            type="button"
                            onClick={() => setForm((p: any) => ({ ...p, logoUrl: "" }))}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-600"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded border-2 border-dashed border-border/50 flex items-center justify-center bg-secondary/20">
                          <Building2 className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-secondary/30 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            {form.logoUrl ? "Trocar logo" : "Enviar logo"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 500 * 1024) {
                                toast({ title: "Imagem muito grande", description: "Use uma imagem de até 500KB", variant: "destructive" });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => setForm((p: any) => ({ ...p, logoUrl: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG ou SVG. Máx 500KB</p>
                      </div>
                    </div>
                  </div>
                </div>
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
                        value={form.cep}
                        onChange={(e) => {
                          handleChange(e);
                          const raw = e.target.value.replace(/\D/g, "");
                          if (raw.length === 8) {
                            setTimeout(() => buscarCepEscritorio(), 100);
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
                        onClick={buscarCepEscritorio}
                        disabled={isSearchingCep}
                        title="Buscar endereço pelos Correios"
                      >
                        {isSearchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input name="logradouro" value={form.logradouro} onChange={handleChange} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input name="numero" value={form.numero} onChange={handleChange} className="bg-background" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Complemento</Label>
                    <Input name="complemento" value={form.complemento} onChange={handleChange} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input name="bairro" value={form.bairro} onChange={handleChange} className="bg-background" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Município</Label>
                    <Input name="municipio" value={form.municipio} onChange={handleChange} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input name="uf" value={form.uf} onChange={handleChange} className="bg-background uppercase" maxLength={2} />
                  </div>
                </div>
              </div>

              {/* Dados do Contador */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <PenLine className="w-4 h-4 text-primary" />
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Dados do Contador</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome do Contador</Label>
                    <Input name="contadorNome" value={form.contadorNome} onChange={handleChange} placeholder="Nome completo do contador responsável" className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>CRC</Label>
                    <Input name="contadorCrc" value={form.contadorCrc} onChange={handleChange} placeholder="CRC/UF-000000/O-0" className="bg-background font-mono" />
                  </div>

                  <div className="space-y-2">
                    <Label>CPF do Contador</Label>
                    <Input
                      name="contadorCpf"
                      value={form.contadorCpf}
                      onChange={(e) => {
                        const v = formatters.cpf(e.target.value);
                        setForm((p: any) => ({ ...p, contadorCpf: v }));
                      }}
                      placeholder="000.000.000-00"
                      className="bg-background font-mono"
                      maxLength={14}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-mail do Contador</Label>
                    <Input name="contadorEmail" value={form.contadorEmail} onChange={handleChange} type="email" placeholder="contador@exemplo.com.br" className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone do Contador</Label>
                    <Input
                      name="contadorTelefone"
                      value={form.contadorTelefone}
                      onChange={(e) => {
                        const v = formatters.phone(e.target.value);
                        setForm((p: any) => ({ ...p, contadorTelefone: v }));
                      }}
                      placeholder="(00) 00000-0000"
                      className="bg-background"
                      maxLength={15}
                    />
                  </div>

                  {/* Assinatura */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Assinatura do Contador</Label>
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-secondary/20 border border-border/40">
                      {form.contadorAssinatura ? (
                        <div className="relative">
                          <img
                            src={form.contadorAssinatura}
                            alt="Assinatura do Contador"
                            className="h-20 max-w-[280px] object-contain rounded-lg border border-border/50 bg-white/5 p-2"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((p: any) => ({ ...p, contadorAssinatura: "" }))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-600 shadow"
                            title="Remover assinatura"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-[280px] h-20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center bg-secondary/20">
                          <div className="text-center">
                            <PenLine className="w-6 h-6 mx-auto mb-1 text-muted-foreground/40" />
                            <p className="text-xs text-muted-foreground/60">Nenhuma assinatura</p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-secondary/40 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <Upload className="w-4 h-4" />
                            {form.contadorAssinatura ? "Trocar assinatura" : "Enviar assinatura"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 1024 * 1024) {
                                toast({ title: "Imagem muito grande", description: "Use uma imagem de até 1MB", variant: "destructive" });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => setForm((p: any) => ({ ...p, contadorAssinatura: ev.target?.result as string }));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground">PNG, JPG ou SVG transparente. Máx 1MB</p>
                        <p className="text-xs text-muted-foreground/60">Será usada em documentos e relatórios gerados pelo sistema.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                <Button variant="ghost" onClick={() => setView("list")}>Cancelar</Button>
                <Button onClick={salvar} disabled={isSaving} className="bg-gradient-to-r from-primary to-indigo-600 px-8">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {escritorioId ? "Salvar Alterações" : "Cadastrar Escritório"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  /* ── LISTA ── */
  return (
    <AppLayout title="Escritórios">
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, CNPJ..."
              className="pl-9 bg-card border-border/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={openNew} className="bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Novo Escritório
          </Button>
        </div>

        {/* Tabela */}
        <Card className="bg-card border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum escritório encontrado</p>
              <Button onClick={openNew} variant="link" className="text-primary mt-2">Cadastrar primeiro escritório</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Escritório</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Documento</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Responsável</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Situação</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Município/UF</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className="border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => openEdit(e)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {e.tipo === "PJ" ? <Building2 className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{e.nomeFantasia || e.razaoSocial || "—"}</p>
                          {e.nomeFantasia && <p className="text-xs text-muted-foreground">{e.razaoSocial}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-sm text-muted-foreground">
                        {e.tipo === "PJ" ? (e.cnpj || "—") : (e.cpf || "—")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{e.nomeResponsavel || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell"><SituacaoBadge situacao={e.situacao} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {e.municipio ? `${e.municipio}/${e.uf}` : "—"}
                    </TableCell>
                    <TableCell onClick={ev => ev.stopPropagation()}>
                      <div className="flex gap-1 justify-end items-center">
                        {activeEscritorioId === e.id ? (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 mr-1">Ativo</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 px-2"
                            onClick={() => {
                              setActiveEscritorio(e.id, e.nomeFantasia || e.razaoSocial || String(e.id));
                              toast({ title: `✓ Escritório ativo: ${e.nomeFantasia || e.razaoSocial}` });
                            }}
                          >
                            Selecionar
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(e)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => excluir(e.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">{filtered.length} escritório{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
        )}
      </div>
    </AppLayout>
  );
}
