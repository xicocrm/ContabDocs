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
import { Loader2, Plus, Edit, Trash2, FileText, Send, CheckCircle2, XCircle, Search } from "lucide-react";

interface Proposta {
  id: number; escritorioId: number; clienteId?: number; numero: string;
  titulo: string; descricao?: string; servicos?: string; valor?: string;
  validade?: string; status: string; dataEnvio?: string; dataResposta?: string; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho:  { label: "Rascunho", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  enviada:   { label: "Enviada",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  aprovada:  { label: "Aprovada", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  recusada:  { label: "Recusada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  expirada:  { label: "Expirada", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

const empty: Partial<Proposta> = { status: "rascunho", numero: "", titulo: "" };

export default function PropostasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Proposta>>(empty);

  const { data: propostas = [], isLoading } = useQuery<Proposta[]>({
    queryKey: ["propostas", escritorioId],
    queryFn: () => API.get(`/propostas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Proposta>) =>
      editId ? API.put(`/propostas/${editId}`, data) : API.post("/propostas", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["propostas", escritorioId] }); setOpen(false); toast({ title: "✓ Proposta salva!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/propostas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["propostas", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    propostas.filter(p =>
      (statusFilter === "todos" || p.status === statusFilter) &&
      (p.titulo.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search))
    ), [propostas, statusFilter, search]);

  const count = (s: string) => propostas.filter(p => p.status === s).length;

  const openNew = () => {
    const n = `PROP-${String(propostas.length + 1).padStart(3, "0")}`;
    setForm({ ...empty, numero: n }); setEditId(null); setOpen(true);
  };
  const openEdit = (p: Proposta) => { setForm(p); setEditId(p.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Propostas"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Propostas">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: String(propostas.length), icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          { label: "Enviadas", value: String(count("enviada")), icon: Send, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Aprovadas", value: String(count("aprovada")), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Recusadas", value: String(count("recusada")), icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
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
            <h3 className="font-semibold text-foreground text-lg">Propostas Comerciais</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Proposta</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><FileText className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma proposta encontrada</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Envio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-border/50 hover:bg-secondary/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.numero}</TableCell>
                    <TableCell className="font-medium text-foreground">{p.titulo}</TableCell>
                    <TableCell className="font-mono font-semibold">{p.valor || "—"}</TableCell>
                    <TableCell className="text-sm">{p.validade || "—"}</TableCell>
                    <TableCell className="text-sm">{p.dataEnvio || "—"}</TableCell>
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
          <DialogHeader><DialogTitle>{editId ? "Editar Proposta" : "Nova Proposta"}</DialogTitle></DialogHeader>
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
            <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo||""} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} className="bg-background" /></div>
            <div className="space-y-2"><Label>Serviços Inclusos</Label><Textarea value={form.servicos||""} onChange={e=>setForm(p=>({...p,servicos:e.target.value}))} className="bg-background resize-none" rows={3} placeholder="Liste os serviços inclusos na proposta..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor Total</Label><Input value={form.valor||""} onChange={e=>setForm(p=>({...p,valor:formatters.currency(e.target.value)}))} className="bg-background font-mono" placeholder="R$ 0,00" /></div>
              <div className="space-y-2"><Label>Válidade</Label><Input value={form.validade||""} onChange={e=>setForm(p=>({...p,validade:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Envio</Label><Input value={form.dataEnvio||""} onChange={e=>setForm(p=>({...p,dataEnvio:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Data Resposta</Label><Input value={form.dataResposta||""} onChange={e=>setForm(p=>({...p,dataResposta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.titulo} className="w-full bg-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
