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
import { Loader2, Plus, Edit, Trash2, ClipboardList, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";

interface Protocolo {
  id: number; escritorioId: number; clienteId?: number; numero: string; tipo?: string;
  orgao?: string; assunto: string; status: string; dataProtocolo?: string;
  dataPrazo?: string; dataResposta?: string; responsavel?: string; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:    { label: "Pendente",    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  em_prazo:    { label: "Em Prazo",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  respondido:  { label: "Respondido",  color: "bg-green-500/20 text-green-400 border-green-500/30" },
  vencido:     { label: "Vencido",     color: "bg-red-500/20 text-red-400 border-red-500/30" },
  arquivado:   { label: "Arquivado",   color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] }); setOpen(false); toast({ title: "✓ Protocolo salvo!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/protocolos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocolos", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    protocolos.filter(p =>
      (statusFilter === "todos" || p.status === statusFilter) &&
      (p.assunto.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search))
    ), [protocolos, statusFilter, search]);

  const count = (s: string) => protocolos.filter(p => p.status === s).length;

  const openNew = () => {
    const n = `PROT-${String(protocolos.length + 1).padStart(4, "0")}`;
    setForm({ ...empty, numero: n }); setEditId(null); setOpen(true);
  };
  const openEdit = (p: Protocolo) => { setForm(p); setEditId(p.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Protocolos"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Protocolos">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: String(protocolos.length), icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes", value: String(count("pendente")), icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Respondidos", value: String(count("respondido")), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Vencidos", value: String(count("vencido")), icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
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
            <h3 className="font-semibold text-foreground text-lg">Controle de Protocolos</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Nº / Assunto..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
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
            <div className="text-center py-16"><ClipboardList className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhum protocolo encontrado</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Número</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-border/50 hover:bg-secondary/40">
                    <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                    <TableCell className="font-medium text-foreground max-w-xs truncate">{p.assunto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.orgao || "—"}</TableCell>
                    <TableCell className="text-sm">{p.dataProtocolo || "—"}</TableCell>
                    <TableCell className={`text-sm font-medium ${p.status === "vencido" ? "text-red-400" : ""}`}>{p.dataPrazo || "—"}</TableCell>
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
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Protocolo" : "Novo Protocolo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Número</Label><Input value={form.numero||""} onChange={e=>setForm(p=>({...p,numero:e.target.value}))} className="bg-background font-mono" /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Assunto *</Label><Input value={form.assunto||""} onChange={e=>setForm(p=>({...p,assunto:e.target.value}))} className="bg-background" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Órgão</Label><Input value={form.orgao||""} onChange={e=>setForm(p=>({...p,orgao:e.target.value}))} className="bg-background" placeholder="Receita, INSS, Junta..." /></div>
              <div className="space-y-2"><Label>Tipo</Label><Input value={form.tipo||""} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} className="bg-background" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Data Protocolo</Label><Input value={form.dataProtocolo||""} onChange={e=>setForm(p=>({...p,dataProtocolo:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Prazo</Label><Input value={form.dataPrazo||""} onChange={e=>setForm(p=>({...p,dataPrazo:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Resposta</Label><Input value={form.dataResposta||""} onChange={e=>setForm(p=>({...p,dataResposta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.assunto} className="w-full bg-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
