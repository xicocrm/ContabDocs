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
import { Loader2, Plus, Edit, Trash2, Search, Receipt, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface ConsultaFiscal {
  id: number; escritorioId: number; clienteId?: number; tipo: string;
  descricao?: string; resultado?: string; status: string; dataConsulta?: string;
  dataRetorno?: string; responsavel?: string; observacoes?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:    { label: "Pendente",    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  em_analise:  { label: "Em Análise",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  concluida:   { label: "Concluída",   color: "bg-green-500/20 text-green-400 border-green-500/30" },
  com_pendencia:{ label: "Com Pendência", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  arquivada:   { label: "Arquivada",   color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const TIPOS = [
  "Situação CNPJ", "Situação CPF", "Simples Nacional", "Débitos Federais",
  "Débitos Estaduais", "Débitos Municipais", "Certidão Negativa",
  "Parcelamento PERT", "REFIS", "Declaração IRPF", "Declaração IRPJ",
  "Declaração SPED", "Outro",
];

const empty: Partial<ConsultaFiscal> = { status: "pendente", tipo: "" };

export default function ConsultasFiscaisPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<ConsultaFiscal>>(empty);

  const { data: consultas = [], isLoading } = useQuery<ConsultaFiscal[]>({
    queryKey: ["consultas-fiscais", escritorioId],
    queryFn: () => API.get(`/consultas-fiscais?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<ConsultaFiscal>) =>
      editId ? API.put(`/consultas-fiscais/${editId}`, data) : API.post("/consultas-fiscais", { ...data, escritorioId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }); setOpen(false); toast({ title: "✓ Consulta salva!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/consultas-fiscais/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    consultas.filter(c =>
      (statusFilter === "todos" || c.status === statusFilter) &&
      (c.tipo.toLowerCase().includes(search.toLowerCase()) || (c.descricao||"").toLowerCase().includes(search.toLowerCase()))
    ), [consultas, statusFilter, search]);

  const count = (s: string) => consultas.filter(c => c.status === s).length;
  const semana = consultas.filter(c => {
    if (!c.dataConsulta) return false;
    const [d, m, y] = c.dataConsulta.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    const diff = (Date.now() - dt.getTime()) / 86400000;
    return diff <= 7;
  }).length;

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (c: ConsultaFiscal) => { setForm(c); setEditId(c.id); setOpen(true); };

  if (!escritorioId) return <AppLayout title="Consultas Fiscais"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Consultas Fiscais">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: String(consultas.length), icon: Receipt, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes", value: String(count("pendente")), icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Concluídas", value: String(count("concluida")), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Com Pendência", value: String(count("com_pendencia")), icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
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
            <h3 className="font-semibold text-foreground text-lg">Consultas Fiscais</h3>
            <div className="flex items-center gap-3">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Tipo / descrição..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Receipt className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma consulta encontrada</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data Consulta</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="border-border/50 hover:bg-secondary/40">
                    <TableCell className="font-medium text-foreground">{c.tipo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.descricao || "—"}</TableCell>
                    <TableCell className="text-sm">{c.dataConsulta || "—"}</TableCell>
                    <TableCell className="text-sm">{c.dataRetorno || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.responsavel || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${STATUS_MAP[c.status]?.color || ""}`}>{STATUS_MAP[c.status]?.label || c.status}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{editId ? "Editar Consulta" : "Nova Consulta Fiscal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v=>setForm(p=>({...p,tipo:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Consulta</Label><Input value={form.dataConsulta||""} onChange={e=>setForm(p=>({...p,dataConsulta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Data Retorno</Label><Input value={form.dataRetorno||""} onChange={e=>setForm(p=>({...p,dataRetorno:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" /></div>
            <div className="space-y-2"><Label>Resultado</Label><Textarea value={form.resultado||""} onChange={e=>setForm(p=>({...p,resultado:e.target.value}))} className="bg-background resize-none" rows={3} placeholder="Registre o resultado da consulta..." /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.tipo} className="w-full bg-primary">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
