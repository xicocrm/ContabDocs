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
import { Loader2, Plus, Edit, Trash2, Megaphone, Mail, MessageSquare, Send, Search } from "lucide-react";

interface Campanha {
  id: number; escritorioId: number; titulo: string; descricao?: string; canal: string;
  publicoAlvo?: string; mensagem?: string; status: string; dataInicio?: string;
  dataFim?: string; totalEnviados?: number; totalAbertos?: number; totalCliques?: number; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho:  { label: "Rascunho",  color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  agendada:  { label: "Agendada",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ativa:     { label: "Ativa",     color: "bg-green-500/20 text-green-400 border-green-500/30" },
  pausada:   { label: "Pausada",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  concluida: { label: "Concluída", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

const CANAIS: Record<string, { label: string; icon: any }> = {
  email:     { label: "E-mail",    icon: Mail },
  whatsapp:  { label: "WhatsApp",  icon: MessageSquare },
  sms:       { label: "SMS",       icon: Send },
};

const empty: Partial<Campanha> = { status: "rascunho", canal: "email", titulo: "" };

export default function CampanhasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Campanha>>(empty);

  const { data: campanhas = [], isLoading } = useQuery<Campanha[]>({
    queryKey: ["campanhas", escritorioId],
    queryFn: () => API.get(`/campanhas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Campanha>) =>
      editId ? API.put(`/campanhas/${editId}`, data) : API.post("/campanhas", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campanhas", escritorioId] }); setOpen(false); toast({ title: "✓ Campanha salva!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/campanhas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campanhas", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    campanhas.filter(c =>
      (statusFilter === "todos" || c.status === statusFilter) &&
      c.titulo.toLowerCase().includes(search.toLowerCase())
    ), [campanhas, statusFilter, search]);

  const totalEnv = campanhas.reduce((a, c) => a + (c.totalEnviados || 0), 0);
  const totalAb  = campanhas.reduce((a, c) => a + (c.totalAbertos || 0), 0);
  const taxa = totalEnv ? Math.round(totalAb / totalEnv * 100) : 0;

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (c: Campanha) => { setForm(c); setEditId(c.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Campanhas"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Campanhas">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de Campanhas", value: String(campanhas.length), icon: Megaphone, color: "text-primary", bg: "bg-primary/10" },
          { label: "Ativas", value: String(campanhas.filter(c=>c.status==="ativa").length), icon: Send, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Total Enviados", value: totalEnv.toLocaleString("pt-BR"), icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Taxa de Abertura", value: `${taxa}%`, icon: MessageSquare, color: "text-yellow-400", bg: "bg-yellow-500/10" },
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
            <h3 className="font-semibold text-foreground text-lg">Campanhas de Marketing</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Campanha</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Megaphone className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma campanha encontrada</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Título</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Abertos</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const canal = CANAIS[c.canal] || { label: c.canal, icon: Send };
                  const t = c.totalEnviados || 0;
                  const a = c.totalAbertos || 0;
                  const tx = t ? Math.round(a / t * 100) : 0;
                  return (
                    <TableRow key={c.id} className="border-border/50 hover:bg-secondary/40">
                      <TableCell className="font-medium text-foreground">{c.titulo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <canal.icon className="w-3.5 h-3.5" />{canal.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.dataInicio || "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{t.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm font-mono">{a.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${tx}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{tx}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${STATUS_MAP[c.status]?.color || ""}`}>{STATUS_MAP[c.status]?.label || c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Editar Campanha" : "Nova Campanha"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Título *</Label><Input value={form.titulo||""} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} className="bg-background" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={form.canal} onValueChange={v=>setForm(p=>({...p,canal:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CANAIS).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Público-Alvo</Label><Input value={form.publicoAlvo||""} onChange={e=>setForm(p=>({...p,publicoAlvo:e.target.value}))} className="bg-background" placeholder="Ex: Clientes MEI, Simples Nacional..." /></div>
            <div className="space-y-2"><Label>Mensagem</Label><Textarea value={form.mensagem||""} onChange={e=>setForm(p=>({...p,mensagem:e.target.value}))} className="bg-background resize-none" rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Início</Label><Input value={form.dataInicio||""} onChange={e=>setForm(p=>({...p,dataInicio:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Data Fim</Label><Input value={form.dataFim||""} onChange={e=>setForm(p=>({...p,dataFim:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
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
