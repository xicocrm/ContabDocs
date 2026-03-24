import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListarContratos, 
  useCriarContrato, 
  useAtualizarContrato, 
  useExcluirContrato,
  useListarClientes,
  Contrato,
  ContratoStatus
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Edit, Trash2, Calendar, DollarSign, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListarContratosQueryKey } from "@workspace/api-client-react";

const initialForm = {
  clienteId: 0, numeroContrato: '', valorContrato: '', dataContrato: '', diaVencimento: 5, dataVencimento: '', objeto: '', status: 'ativo' as ContratoStatus, observacoes: ''
};

export default function ContratosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: contratos = [], isLoading } = useListarContratos();
  const { data: clientes = [], isLoading: isLoadingClientes } = useListarClientes();
  const createMutation = useCriarContrato();
  const updateMutation = useAtualizarContrato();
  const deleteMutation = useExcluirContrato();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(initialForm);
  const [searchTerm, setSearchTerm] = useState("");

  const getClientName = (id: number) => {
    const c = clientes.find(cl => cl.id === id);
    return c ? (c.nomeFantasia || c.razaoSocial) : `Cliente #${id}`;
  };

  const filtered = contratos.filter(c => 
    c.numeroContrato.includes(searchTerm) || 
    getClientName(c.clienteId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNew = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (contrato: Contrato) => {
    setFormData({ ...initialForm, ...contrato });
    setEditingId(contrato.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if(confirm("Tem certeza que deseja excluir este contrato?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListarContratosQueryKey() });
        toast({ title: "Excluído com sucesso" });
      } catch (e) {
        toast({ title: "Erro", variant: "destructive" });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue: string | number = value;
    
    if (name === 'valorContrato') formattedValue = formatters.currency(value);
    if (name === 'dataContrato' || name === 'dataVencimento') formattedValue = formatters.date(value);
    if (name === 'diaVencimento') formattedValue = parseInt(value.replace(/\D/g, '') || "1");

    setFormData((prev: any) => ({ ...prev, [name]: formattedValue }));
  };

  const handleSave = async () => {
    if(!formData.clienteId || formData.clienteId === 0) {
      toast({ title: "Selecione um cliente", variant: "destructive" }); return;
    }
    try {
      const payload = { ...formData, clienteId: parseInt(formData.clienteId.toString()) };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Contrato atualizado!" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Contrato criado!" });
      }
      queryClient.invalidateQueries({ queryKey: getListarContratosQueryKey() });
      setIsOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      'ativo': 'bg-success/10 text-success border-success/20',
      'inativo': 'bg-muted text-muted-foreground border-border',
      'vencido': 'bg-destructive/10 text-destructive border-destructive/20',
      'cancelado': 'bg-warning/10 text-warning border-warning/20'
    };
    return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${map[status || 'inativo']} uppercase`}>{status}</span>
  };

  return (
    <AppLayout title="Gestão de Contratos">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente ou nº contrato..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border/50 shadow-sm"
            />
          </div>
          <Button onClick={openNew} className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        </div>

        <Card className="bg-card border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          {(isLoading || isLoadingClientes) ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Nº Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum contrato encontrado.</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id} className="border-border/50 group hover:bg-secondary/30">
                    <TableCell className="font-mono font-medium text-primary">#{c.numeroContrato}</TableCell>
                    <TableCell className="font-medium">{getClientName(c.clienteId)}</TableCell>
                    <TableCell>{c.valorContrato || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{c.dataVencimento || `Dia ${c.diaVencimento}`}</span>
                        {c.diaVencimento && !c.dataVencimento && <span className="text-xs text-muted-foreground">Todo mês</span>}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={c.status || 'inativo'} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 hover:text-primary">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Dialog Add/Edit */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-display flex items-center"><FileText className="w-5 h-5 mr-2 text-primary"/>{editingId ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select value={formData.clienteId.toString()} onValueChange={(v) => setFormData({...formData, clienteId: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(cl => (
                        <SelectItem key={cl.id} value={cl.id.toString()}>{cl.nomeFantasia || cl.razaoSocial}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número do Contrato</Label>
                  <Input name="numeroContrato" value={formData.numeroContrato} onChange={handleChange} className="bg-background font-mono" />
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor do Contrato</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="valorContrato" value={formData.valorContrato} onChange={handleChange} className="bg-background pl-9" placeholder="R$ 0,00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Assinatura</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="dataContrato" value={formData.dataContrato} onChange={handleChange} className="bg-background pl-9" placeholder="DD/MM/AAAA" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Input type="number" min="1" max="31" name="diaVencimento" value={formData.diaVencimento} onChange={handleChange} className="bg-background" />
                </div>

                <div className="space-y-2">
                  <Label>Data de Término (Opcional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="dataVencimento" value={formData.dataVencimento} onChange={handleChange} className="bg-background pl-9" placeholder="DD/MM/AAAA" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Objeto do Contrato</Label>
                  <Input name="objeto" value={formData.objeto} onChange={handleChange} className="bg-background" placeholder="Ex: Prestação de serviços contábeis..." />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="observacoes" value={formData.observacoes} onChange={handleChange} className="bg-background resize-none" rows={3} />
                </div>

              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary px-8">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
