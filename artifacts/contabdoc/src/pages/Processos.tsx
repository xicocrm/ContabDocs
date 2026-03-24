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
import { Loader2, Plus, Edit, Trash2, Scale, Search, AlertCircle } from "lucide-react";

interface Processo {
  id: number; escritorioId: number; clienteId?: number; numero: string; tipo?: string;
  tribunal?: string; vara?: string; comarca?: string; descricao?: string;
  valorCausa?: string; status: string; dataAbertura?: string;
  dataUltimoAndamento?: string; dataEncerramento?: string; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ativo:        { label: "Ativo",        color: "bg-green-500/20 text-green-400 border-green-500/30" },
  suspenso:     { label: "Suspenso",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  arquivado:    { label: "Arquivado",    color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  encerrado:    { label: "Encerrado",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const TIPOS = ["Tributário","Trabalhista","Civil","Previdenciário","Criminal","Administrativo","Outro"];

const empty: Partial<Processo> = { status: "ativo", numero: "" };

export default function ProcessosPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Processo>>(empty);

  const { data: processos = [], isLoading } = useQuery<Processo[]>({
    queryKey: ["processos", escritorioId],
    queryFn: () => API.get(`/processos?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Processo>) =>
      editId ? API.put(`/processos/${editId}`, data) : API.post("/processos", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processos", escritorioId] }); setOpen(false); toast({ title: "✓ Processo salvo!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/processos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["processos", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    processos.filter(p =>
      (statusFilter === "todos" || p.status === statusFilter) &&
      (p.numero.toLowerCase().includes(search.toLowerCase()) || (p.tipo||"").toLowerCase().includes(search.toLowerCase()))
    ), [processos, statusFilter, search]);

  const count = (s: string) => processos.filter(p => p.status === s).length;

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (p: Processo) => { setForm(p); setEditId(p.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Processos"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Processos">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: String(processos.length), icon: Scale, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ativos", value: String(count("ativo")), icon: AlertCircle, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Suspensos", value: String(count("suspenso")), icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Encerrados", value: String(count("encerrado")), icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
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
            <h3 className="font-semibold text-foreground text-lg">Processos Jurídicos</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Nº / Tipo..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Novo Processo</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Scale className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhum processo encontrado</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Vara/Comarca</TableHead>
                  <TableHead>Valor Causa</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="border-border/50 hover:bg-secondary/40">
                    <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                    <TableCell className="text-sm">{p.tipo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.tribunal || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.vara || p.comarca || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{p.valorCausa || "—"}</TableCell>
                    <TableCell className="text-sm">{p.dataAbertura || "—"}</TableCell>
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
          <DialogHeader><DialogTitle>{editId ? "Editar Processo" : "Novo Processo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Número *</Label><Input value={form.numero||""} onChange={e=>setForm(p=>({...p,numero:e.target.value}))} className="bg-background font-mono" /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo||""} onValueChange={v=>setForm(p=>({...p,tipo:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valor da Causa</Label><Input value={form.valorCausa||""} onChange={e=>setForm(p=>({...p,valorCausa:formatters.currency(e.target.value)}))} className="bg-background font-mono" placeholder="R$ 0,00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tribunal</Label><Input value={form.tribunal||""} onChange={e=>setForm(p=>({...p,tribunal:e.target.value}))} className="bg-background" /></div>
              <div className="space-y-2"><Label>Vara</Label><Input value={form.vara||""} onChange={e=>setForm(p=>({...p,vara:e.target.value}))} className="bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Comarca</Label><Input value={form.comarca||""} onChange={e=>setForm(p=>({...p,comarca:e.target.value}))} className="bg-background" /></div>
              <div className="space-y-2"><Label>Data Abertura</Label><Input value={form.dataAbertura||""} onChange={e=>setForm(p=>({...p,dataAbertura:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Descrição / Objeto</Label><Textarea value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background resize-none" rows={3} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.numero} className="w-full bg-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
