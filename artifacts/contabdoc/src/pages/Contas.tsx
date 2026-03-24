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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import { Loader2, Plus, Edit, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Search, DollarSign } from "lucide-react";

interface Conta {
  id: number; escritorioId: number; clienteId?: number; tipo: string;
  descricao: string; valor?: string; categoria?: string; dataVencimento?: string;
  dataPagamento?: string; status: string; formaPagamento?: string;
  numeroDocumento?: string; observacoes?: string;
}

const empty: Partial<Conta> = { tipo: "receber", status: "pendente", descricao: "", valor: "" };

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  pago:      { label: "Pago",      color: "bg-green-500/20  text-green-400  border-green-500/30"  },
  vencido:   { label: "Vencido",   color: "bg-red-500/20    text-red-400    border-red-500/30"    },
  cancelado: { label: "Cancelado", color: "bg-gray-500/20   text-gray-400   border-gray-500/30"   },
};

export default function ContasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"receber" | "pagar">("receber");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Conta>>(empty);

  const { data: contas = [], isLoading } = useQuery<Conta[]>({
    queryKey: ["contas", escritorioId],
    queryFn: () => API.get(`/contas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Conta>) =>
      editId ? API.put(`/contas/${editId}`, data) : API.post("/contas", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contas", escritorioId] }); setOpen(false); toast({ title: "✓ Conta salva!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/contas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contas", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    contas.filter(c =>
      c.tipo === tab &&
      (statusFilter === "todos" || c.status === statusFilter) &&
      (c.descricao.toLowerCase().includes(search.toLowerCase()))
    ), [contas, tab, statusFilter, search]);

  const soma = (tipo: string, status?: string) =>
    contas.filter(c => c.tipo === tipo && (!status || c.status === status))
      .reduce((acc, c) => acc + parseFloat(c.valor?.replace(/\D/g, "") || "0") / 100, 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const openNew = () => { setForm({ ...empty, tipo: tab }); setEditId(null); setOpen(true); };
  const openEdit = (c: Conta) => { setForm(c); setEditId(c.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Contas a Receber/Pagar"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Contas a Receber / Pagar">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total a Receber", value: fmt(soma("receber","pendente")), icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Total a Pagar", value: fmt(soma("pagar","pendente")), icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Vencidos", value: fmt(soma("receber","vencido") + soma("pagar","vencido")), icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Pagos (Mês)", value: fmt(soma("receber","pago")), icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
        ].map(k => (
          <Card key={k.label} className="bg-card border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon className={`w-6 h-6 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border/50 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="bg-secondary border border-border/50">
                <TabsTrigger value="receber" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Contas a Receber</TabsTrigger>
                <TabsTrigger value="pagar" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">Contas a Pagar</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Conta</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma conta encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="border-border/50 hover:bg-secondary/40">
                    <TableCell className="font-medium text-foreground">{c.descricao}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.categoria || "—"}</TableCell>
                    <TableCell className="font-mono font-semibold">{c.valor || "—"}</TableCell>
                    <TableCell className="text-sm">{c.dataVencimento || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_MAP[c.status]?.color || ""}`}>
                        {STATUS_MAP[c.status]?.label || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({...p, tipo: v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receber">A Receber</SelectItem>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor</Label><Input value={form.valor||""} onChange={e=>setForm(p=>({...p,valor:formatters.currency(e.target.value)}))} className="bg-background font-mono" placeholder="R$ 0,00" /></div>
              <div className="space-y-2"><Label>Categoria</Label><Input value={form.categoria||""} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} className="bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Vencimento</Label><Input value={form.dataVencimento||""} onChange={e=>setForm(p=>({...p,dataVencimento:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Pagamento</Label><Input value={form.dataPagamento||""} onChange={e=>setForm(p=>({...p,dataPagamento:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Forma de Pagamento</Label><Input value={form.formaPagamento||""} onChange={e=>setForm(p=>({...p,formaPagamento:e.target.value}))} className="bg-background" placeholder="Pix, Boleto, Transferência..." /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.descricao} className="w-full bg-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
