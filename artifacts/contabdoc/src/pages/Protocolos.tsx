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
import { Loader2, Plus, Edit, Trash2, Package, Search, Clock, CheckCircle2, AlertCircle, PackageCheck } from "lucide-react";

interface Protocolo {
  id: number; escritorioId: number; clienteId?: number; numero: string; tipo?: string;
  orgao?: string; assunto: string; status: string; dataProtocolo?: string;
  dataPrazo?: string; dataResposta?: string; responsavel?: string; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:    { label: "Pendente",         color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  aguardando:  { label: "Aguardando",       color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  entregue:    { label: "Entregue",         color: "bg-green-500/20 text-green-400 border-green-500/30" },
  devolvido:   { label: "Devolvido",        color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  arquivado:   { label: "Arquivado",        color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  cancelado:   { label: "Cancelado",        color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const TIPOS_DOCUMENTO = [
  "Guia DARFS / DAS",
  "Declaração IRPF",
  "Declaração IRPJ",
  "Balancete",
  "Balanço Patrimonial",
  "DRE",
  "Certidão Negativa",
  "Contrato Social",
  "Alteração Contratual",
  "Nota Fiscal",
  "Procuração",
  "GFIP / SEFIP",
  "eSocial",
  "SPED",
  "REINF",
  "DCTF",
  "Comprovante de Pagamento",
  "Relatório Contábil",
  "Outro",
];

const DESTINOS = [
  "Cliente",
  "Receita Federal",
  "INSS / Previdência",
  "FGTS / Caixa",
  "Junta Comercial",
  "Prefeitura",
  "Cartório",
  "Banco",
  "Outro",
];

const empty: Partial<Protocolo> = { status: "pendente", numero: "", assunto: "" };

export default function ProtocolosPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Protocolo>>(empty);

  const { data: protocolos = [], isLoading } = useQuery<Protocolo[]>({
    queryKey: ["protocolos", escritorioId],
    queryFn: () => API.get(`/protocolos?escritorioId=${escritorioId}`),
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
    onSuccess: () => toast({ title: "✓ Protocolo salvo!" }),
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
      (p.assunto.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search) ||
       (p.orgao || "").toLowerCase().includes(search.toLowerCase()))
    ), [protocolos, statusFilter, search]);

  const count = (s: string) => protocolos.filter(p => p.status === s).length;

  const openNew = () => {
    const n = `DOC-${String(protocolos.length + 1).padStart(4, "0")}`;
    setForm({ ...empty, numero: n }); setEditId(null); setOpen(true);
  };
  const openEdit = (p: Protocolo) => { setForm(p); setEditId(p.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Protocolo de Documentos"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Protocolo de Documentos">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: String(protocolos.length), icon: Package, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes", value: String(count("pendente") + count("aguardando")), icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Entregues", value: String(count("entregue")), icon: PackageCheck, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Devolvidos", value: String(count("devolvido")), icon: AlertCircle, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}><k.icon className={`w-6 h-6 ${k.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold text-foreground">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-foreground text-lg">Entrega de Documentos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Controle de guias, declarações e documentos entregues</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Nº / Documento / Destino..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-52" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Novo Protocolo</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Package className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhum documento protocolado</p></div>
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
                    <TableCell className="text-sm font-mono">{p.dataProtocolo || "—"}</TableCell>
                    <TableCell className={`text-sm font-mono ${p.status === "pendente" && p.dataPrazo ? "text-red-400" : ""}`}>{p.dataPrazo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.responsavel || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${STATUS_MAP[p.status]?.color || ""}`}>{STATUS_MAP[p.status]?.label || p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Protocolo" : "Novo Protocolo de Documento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.numero||""} onChange={e=>setForm(p=>({...p,numero:e.target.value}))} className="bg-background font-mono" placeholder="DOC-0001" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Documento *</Label>
              <Input value={form.assunto||""} onChange={e=>setForm(p=>({...p,assunto:e.target.value}))} className="bg-background" placeholder="Ex: DARFS Competência 01/2026" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={form.tipo||""} onValueChange={v=>setForm(p=>({...p,tipo:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS_DOCUMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino / Para quem</Label>
                <Select value={form.orgao||""} onValueChange={v=>setForm(p=>({...p,orgao:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{DESTINOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Entrega</Label>
                <Input value={form.dataProtocolo||""} onChange={e=>setForm(p=>({...p,dataProtocolo:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input value={form.dataPrazo||""} onChange={e=>setForm(p=>({...p,dataPrazo:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Data Devolução</Label>
                <Input value={form.dataResposta||""} onChange={e=>setForm(p=>({...p,dataResposta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recebido por / Responsável</Label>
              <Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" placeholder="Nome de quem assinou o recebimento" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} />
            </div>

            <Button onClick={() => save.mutate(form)} disabled={!form.assunto} className="w-full bg-primary">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
