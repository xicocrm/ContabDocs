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
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Loader2, Plus, Edit, Trash2, Package, Search, Clock, CheckCircle2,
  AlertCircle, PackageCheck, History, FileText, Printer, ChevronRight,
  CheckSquare, Square
} from "lucide-react";

interface Protocolo {
  id: number; escritorioId: number; clienteId?: number; numero: string; tipo?: string;
  orgao?: string; assunto: string; status: string; dataProtocolo?: string;
  dataPrazo?: string; dataResposta?: string; responsavel?: string; observacoes?: string;
}
interface Cliente { id: number; razaoSocial?: string; nomeFantasia?: string; cnpj?: string; cpf?: string; regimeTributario?: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:   { label: "Pendente",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  aguardando: { label: "Aguardando", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  entregue:   { label: "Entregue",   color: "bg-green-500/20 text-green-400 border-green-500/30" },
  devolvido:  { label: "Devolvido",  color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  arquivado:  { label: "Arquivado",  color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  cancelado:  { label: "Cancelado",  color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const DOCS_PADRAO = [
  { id: "das",    nome: "DAS / Simples Nacional",       tipo: "Guia DARFS / DAS",         checked: true },
  { id: "dctf",   nome: "DCTF",                         tipo: "DCTF",                     checked: false },
  { id: "esocial",nome: "eSocial",                      tipo: "eSocial",                  checked: false },
  { id: "gfip",   nome: "GFIP / SEFIP",                 tipo: "GFIP / SEFIP",             checked: false },
  { id: "reinf",  nome: "REINF",                        tipo: "REINF",                    checked: false },
  { id: "sped",   nome: "SPED Fiscal",                  tipo: "SPED",                     checked: false },
  { id: "folha",  nome: "Folha de Pagamento",           tipo: "Relatório Contábil",       checked: false },
  { id: "bal",    nome: "Balancete Mensal",             tipo: "Balancete",                checked: false },
  { id: "dre",    nome: "DRE — Demonstração de Resultado", tipo: "Relatório Contábil",   checked: false },
  { id: "cert",   nome: "Certidão Negativa",            tipo: "Certidão Negativa",        checked: false },
  { id: "outro",  nome: "Outros documentos",            tipo: "Outro",                    checked: false },
];

const DESTINOS = ["Cliente","Receita Federal","INSS / Previdência","FGTS / Caixa","Junta Comercial","Prefeitura","Cartório","Banco","Outro"];
const TIPOS_DOCUMENTO = ["Guia DARFS / DAS","Declaração IRPF","Declaração IRPJ","Balancete","Balanço Patrimonial","DRE","Certidão Negativa","Contrato Social","Alteração Contratual","Nota Fiscal","Procuração","GFIP / SEFIP","eSocial","SPED","REINF","DCTF","Comprovante de Pagamento","Relatório Contábil","Outro"];
const empty: Partial<Protocolo> = { status: "pendente", numero: "", assunto: "" };

const anoAtual = new Date().getFullYear();
const mesAtual = new Date().getMonth(); // 0-indexed

export default function ProtocolosPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [aba, setAba] = useState<"gerar" | "historico">("gerar");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Protocolo>>(empty);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Gerar Protocolo fields
  const [clienteId, setClienteId] = useState("");
  const [mes, setMes] = useState(String(mesAtual));
  const [ano, setAno] = useState(String(anoAtual));
  const [docs, setDocs] = useState(DOCS_PADRAO.map(d => ({ ...d })));
  const [gerandoProtocolo, setGerandoProtocolo] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState(false);
  const [responsavelEntrega, setResponsavelEntrega] = useState("");
  const [destino, setDestino] = useState("Cliente");

  const { data: protocolos = [], isLoading } = useQuery<Protocolo[]>({
    queryKey: ["protocolos", escritorioId],
    queryFn: () => API.get(`/protocolos?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Protocolo>) =>
      editId ? API.put(`/protocolos/${editId}`, data) : API.post("/protocolos", { ...data, escritorioId }),
    onMutate: async (data) => {
      setOpen(false);
      await qc.cancelQueries({ queryKey: ["protocolos", escritorioId] });
      const previous = qc.getQueryData<Protocolo[]>(["protocolos", escritorioId]);
      qc.setQueryData<Protocolo[]>(["protocolos", escritorioId], (old = []) =>
        editId ? old.map(i => i.id === editId ? { ...i, ...data } : i)
               : [...old, { id: Date.now(), escritorioId: escritorioId!, ...data } as Protocolo]
      );
      return { previous };
    },
    onError: (e: Error, _d, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(["protocolos", escritorioId], ctx.previous);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
    onSuccess: () => { toast({ title: "✓ Protocolo salvo!" }); qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] }); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/protocolos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    protocolos.filter(p =>
      (statusFilter === "todos" || p.status === statusFilter) &&
      (p.assunto.toLowerCase().includes(search.toLowerCase()) ||
       p.numero.includes(search) ||
       (p.orgao || "").toLowerCase().includes(search.toLowerCase()))
    ), [protocolos, statusFilter, search]);

  const count = (s: string) => protocolos.filter(p => p.status === s).length;

  const openNew = () => {
    const n = `DOC-${String(protocolos.length + 1).padStart(4, "0")}`;
    setForm({ ...empty, numero: n }); setEditId(null); setOpen(true);
  };
  const openEdit = (p: Protocolo) => { setForm(p); setEditId(p.id); setOpen(true); };

  const nomeCliente = (id: string) => {
    const c = clientes.find(c => String(c.id) === id);
    return c ? (c.nomeFantasia || c.razaoSocial || "Cliente") : "";
  };

  const toggleDoc = (id: string) => {
    setDocs(d => d.map(x => x.id === id ? { ...x, checked: !x.checked } : x));
  };
  const toggleAll = () => {
    const allChecked = docs.every(d => d.checked);
    setDocs(d => d.map(x => ({ ...x, checked: !allChecked })));
  };

  const handleGerarProtocolo = async () => {
    if (!clienteId) { toast({ title: "Selecione uma empresa", variant: "destructive" }); return; }
    const docsSelecionados = docs.filter(d => d.checked);
    if (docsSelecionados.length === 0) { toast({ title: "Selecione ao menos um documento", variant: "destructive" }); return; }

    setGerandoProtocolo(true);
    try {
      const mesNome = MESES[parseInt(mes)];
      const prefixo = `${String(parseInt(mes) + 1).padStart(2, "0")}/${ano}`;
      const hoje = new Date().toLocaleDateString("pt-BR");
      const numBase = protocolos.length;

      for (let i = 0; i < docsSelecionados.length; i++) {
        const doc = docsSelecionados[i];
        const numero = `ENT-${ano}${String(parseInt(mes) + 1).padStart(2, "0")}-${String(numBase + i + 1).padStart(4, "0")}`;
        await API.post("/protocolos", {
          escritorioId,
          clienteId: parseInt(clienteId),
          numero,
          assunto: `${doc.nome} — ${mesNome}/${ano}`,
          tipo: doc.tipo,
          orgao: destino,
          status: "pendente",
          dataProtocolo: hoje,
          responsavel: responsavelEntrega || undefined,
          observacoes: `Competência: ${prefixo}`,
        });
      }

      await qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] });
      setProtocoloGerado(true);
      toast({ title: `✓ ${docsSelecionados.length} protocolo(s) gerado(s) com sucesso!` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar protocolos", description: err.message, variant: "destructive" });
    } finally {
      setGerandoProtocolo(false);
    }
  };

  const resetGerador = () => {
    setClienteId(""); setMes(String(mesAtual)); setAno(String(anoAtual));
    setDocs(DOCS_PADRAO.map(d => ({ ...d }))); setProtocoloGerado(false);
    setResponsavelEntrega(""); setDestino("Cliente");
  };

  const anos = Array.from({ length: 5 }, (_, i) => String(anoAtual - 2 + i));

  if (!escritorioId) return <AppLayout title="Protocolo de Documentos"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Protocolo de Documentos">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total",     value: String(protocolos.length),                           icon: Package,      color: "text-primary",     bg: "bg-primary/10" },
          { label: "Pendentes", value: String(count("pendente") + count("aguardando")),      icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-500/10" },
          { label: "Entregues", value: String(count("entregue")),                            icon: PackageCheck, color: "text-green-400",   bg: "bg-green-500/10" },
          { label: "Devolvidos",value: String(count("devolvido")),                           icon: AlertCircle,  color: "text-purple-400",  bg: "bg-purple-500/10" },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon className={`w-6 h-6 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setAba("gerar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "gerar"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <FileText className="w-4 h-4" />
          Gerar Protocolo de Entrega
        </button>
        <button
          onClick={() => setAba("historico")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "historico"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Protocolos
          {protocolos.length > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">{protocolos.length}</span>
          )}
        </button>
        <div className="ml-auto">
          <Button onClick={openNew} variant="outline" size="sm" className="border-border/50">
            <Plus className="w-4 h-4 mr-2" />Protocolo Manual
          </Button>
        </div>
      </div>

      {/* Aba: Gerar Protocolo */}
      {aba === "gerar" && (
        <Card className="bg-card border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Gerar Protocolo de Entrega
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione a empresa e o período para listar os impostos e documentos disponíveis
              </p>
            </div>

            {protocoloGerado ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-1">Protocolos gerados com sucesso!</h4>
                <p className="text-muted-foreground text-sm mb-6">
                  Os documentos foram adicionados ao histórico como <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendentes</Badge>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setAba("historico")} variant="outline" className="gap-2">
                    <History className="w-4 h-4" />Ver Histórico
                  </Button>
                  <Button onClick={resetGerador} className="bg-primary gap-2">
                    <Plus className="w-4 h-4" />Novo Protocolo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Seletores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Empresa *</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione a empresa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.length === 0
                          ? <SelectItem value="_none" disabled>Nenhum cliente cadastrado</SelectItem>
                          : clientes.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nomeFantasia || c.razaoSocial || `Cliente #${c.id}`}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Competência (Mês) *</Label>
                    <Select value={mes} onValueChange={setMes}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Competência (Ano) *</Label>
                    <Select value={ano} onValueChange={setAno}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Informações adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Destino / Para quem</Label>
                    <Select value={destino} onValueChange={setDestino}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DESTINOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Recebido por (opcional)</Label>
                    <Input
                      value={responsavelEntrega}
                      onChange={e => setResponsavelEntrega(e.target.value)}
                      placeholder="Nome de quem vai assinar o recebimento"
                      className="bg-background"
                    />
                  </div>
                </div>

                {/* Lista de documentos */}
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-b border-border/50">
                    <span className="text-sm font-medium text-foreground">
                      Documentos para competência {MESES[parseInt(mes)]}/{ano}
                    </span>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {docs.every(d => d.checked) ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                      {docs.every(d => d.checked) ? "Desmarcar todos" : "Selecionar todos"}
                    </button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {docs.map(doc => (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          doc.checked ? "bg-primary/5" : "hover:bg-secondary/20"
                        }`}
                      >
                        <div
                          onClick={() => toggleDoc(doc.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            doc.checked
                              ? "bg-primary border-primary"
                              : "border-border bg-background"
                          }`}
                        >
                          {doc.checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => toggleDoc(doc.id)}>
                          <p className={`text-sm font-medium ${doc.checked ? "text-foreground" : "text-muted-foreground"}`}>
                            {doc.nome}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/30 shrink-0">
                          {doc.tipo}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{docs.filter(d => d.checked).length}</span> documento(s) selecionado(s)
                    {clienteId && <> · <span className="text-primary font-medium">{nomeCliente(clienteId)}</span></>}
                  </p>
                  <Button
                    onClick={handleGerarProtocolo}
                    disabled={gerandoProtocolo || !clienteId || docs.filter(d => d.checked).length === 0}
                    className="bg-primary gap-2"
                  >
                    {gerandoProtocolo
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                      : <><Printer className="w-4 h-4" />Gerar Protocolo<ChevronRight className="w-4 h-4" /></>
                    }
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Aba: Histórico */}
      {aba === "historico" && (
        <Card className="bg-card border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Histórico de Protocolos
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Controle de documentos entregues e pendentes</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nº / Documento / Destino..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-background w-52"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== "todos" ? "Nenhum resultado para o filtro aplicado" : "Nenhum protocolo registrado"}
                </p>
                <Button onClick={() => setAba("gerar")} variant="outline" size="sm" className="mt-4 gap-2">
                  <FileText className="w-4 h-4" />Gerar primeiro protocolo
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Número</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Recebido por</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className="border-border/50 hover:bg-secondary/40">
                      <TableCell className="font-mono text-xs text-primary">{p.numero}</TableCell>
                      <TableCell className="font-medium text-foreground max-w-[160px] truncate">{p.assunto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{p.tipo || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.orgao || "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{formatters.displayDate(p.dataProtocolo)}</TableCell>
                      <TableCell className={`text-sm font-mono ${p.status === "pendente" && p.dataPrazo ? "text-red-400" : ""}`}>
                        {formatters.displayDate(p.dataPrazo)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.responsavel || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUS_MAP[p.status]?.color || ""}`}>
                          {STATUS_MAP[p.status]?.label || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: p.id, name: p.assunto || p.numero || `#${p.id}` })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog: Protocolo Manual */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Protocolo" : "Novo Protocolo Manual"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.numero || ""} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} className="bg-background font-mono" placeholder="DOC-0001" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do Documento *</Label>
              <Input value={form.assunto || ""} onChange={e => setForm(p => ({ ...p, assunto: e.target.value }))} className="bg-background" placeholder="Ex: DARFS Competência 01/2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={form.tipo || ""} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino / Para quem</Label>
                <Select value={form.orgao || ""} onValueChange={v => setForm(p => ({ ...p, orgao: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{DESTINOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Entrega</Label>
                <Input value={form.dataProtocolo || ""} onChange={e => setForm(p => ({ ...p, dataProtocolo: formatters.date(e.target.value) }))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input value={form.dataPrazo || ""} onChange={e => setForm(p => ({ ...p, dataPrazo: formatters.date(e.target.value) }))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Data Devolução</Label>
                <Input value={form.dataResposta || ""} onChange={e => setForm(p => ({ ...p, dataResposta: formatters.date(e.target.value) }))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recebido por / Responsável</Label>
              <Input value={form.responsavel || ""} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} className="bg-background" placeholder="Nome de quem assinou o recebimento" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ""} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="bg-background resize-none" rows={2} />
            </div>
            <Button onClick={() => save.mutate(form)} disabled={!form.assunto} className="w-full bg-primary">
              {save.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : "Salvar Protocolo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { del.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        itemName={deleteTarget?.name}
      />
    </AppLayout>
  );
}
