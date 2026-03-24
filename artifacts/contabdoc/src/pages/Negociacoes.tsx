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
import { Loader2, Plus, Edit, Trash2, Handshake, TrendingUp, Target, Trophy, Search } from "lucide-react";

interface Negociacao {
  id: number; escritorioId: number; clienteId?: number; titulo: string;
  descricao?: string; valor?: string; status: string; probabilidade?: number;
  responsavel?: string; dataInicio?: string; dataPrevFechamento?: string;
  dataFechamento?: string; motivoPerda?: string; observacoes?: string;
}

const STAGES = [
  { key: "prospeccao",   label: "Prospecção",   color: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { key: "qualificacao", label: "Qualificação",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { key: "proposta",     label: "Proposta",      color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { key: "negociacao",   label: "Negociação",    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { key: "ganho",        label: "Ganho",         color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { key: "perdido",      label: "Perdido",       color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const empty: Partial<Negociacao> = { status: "prospeccao", probabilidade: 0 };

export default function NegociacoesPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Negociacao>>(empty);

  const { data: negs = [], isLoading } = useQuery<Negociacao[]>({
    queryKey: ["negociacoes", escritorioId],
    queryFn: () => API.get(`/negociacoes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Negociacao>) =>
      editId ? API.put(`/negociacoes/${editId}`, data) : API.post("/negociacoes", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["negociacoes", escritorioId] }); setOpen(false); toast({ title: "✓ Negociação salva!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/negociacoes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["negociacoes", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    negs.filter(n =>
      (statusFilter === "todos" || n.status === statusFilter) &&
      n.titulo.toLowerCase().includes(search.toLowerCase())
    ), [negs, statusFilter, search]);

  const total = negs.filter(n => !["ganho","perdido"].includes(n.status)).length;
  const ganhos = negs.filter(n => n.status === "ganho").length;
  const taxa = negs.length ? Math.round(ganhos / negs.length * 100) : 0;
  const valorTotal = negs.filter(n => !["perdido"].includes(n.status))
    .reduce((a, n) => a + parseFloat(n.valor?.replace(/\D/g,"") || "0") / 100, 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getStage = (key: string) => STAGES.find(s => s.key === key) || STAGES[0];

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (n: Negociacao) => { setForm(n); setEditId(n.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Negociações"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Negociações">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Em Andamento", value: String(total), icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Valor Pipeline", value: fmt(valorTotal), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ganhos", value: String(ganhos), icon: Trophy, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Taxa de Conversão", value: `${taxa}%`, icon: Handshake, color: "text-yellow-400", bg: "bg-yellow-500/10" },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon className={`w-6 h-6 ${k.color}`} />
              </div>
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold text-foreground">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-semibold text-foreground text-lg">Pipeline de Negociações</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Handshake className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma negociação encontrada</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Título</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Prev. Fechamento</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(n => {
                  const stage = getStage(n.status);
                  return (
                    <TableRow key={n.id} className="border-border/50 hover:bg-secondary/40">
                      <TableCell className="font-medium text-foreground">{n.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.responsavel || "—"}</TableCell>
                      <TableCell className="font-mono font-semibold">{n.valor || "—"}</TableCell>
                      <TableCell>
                        {n.probabilidade != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${n.probabilidade}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{n.probabilidade}%</span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{n.dataPrevFechamento || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${stage.color}`}>{stage.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(n.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Negociação" : "Nova Negociação"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo||""} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} className="bg-background" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estágio</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Probabilidade (%)</Label><Input type="number" min={0} max={100} value={form.probabilidade??0} onChange={e=>setForm(p=>({...p,probabilidade:parseInt(e.target.value)||0}))} className="bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input value={form.valor||""} onChange={e=>setForm(p=>({...p,valor:formatters.currency(e.target.value)}))} className="bg-background font-mono" placeholder="R$ 0,00" /></div>
              <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Início</Label><Input value={form.dataInicio||""} onChange={e=>setForm(p=>({...p,dataInicio:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Prev. Fechamento</Label><Input value={form.dataPrevFechamento||""} onChange={e=>setForm(p=>({...p,dataPrevFechamento:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
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
