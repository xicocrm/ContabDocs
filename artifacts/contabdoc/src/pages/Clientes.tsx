import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListarClientes, 
  useCriarCliente, 
  useAtualizarCliente, 
  useExcluirCliente,
  consultarCnpj,
  validarCpf,
  Cliente
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Edit, Trash2, CheckCircle2, AlertTriangle, Building2, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListarClientesQueryKey } from "@workspace/api-client-react";

const initialForm = {
  tipo: 'PJ', cnpj: '', cpf: '', razaoSocial: '', nomeFantasia: '', nomeResponsavel: '', 
  email: '', telefone: '', celular: '', cep: '', logradouro: '', numero: '', complemento: '', 
  bairro: '', municipio: '', uf: '', situacaoReceita: '', socios: '', regimeTributario: '', atividadePrincipal: ''
};

export default function ClientesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clientes = [], isLoading } = useListarClientes();
  const createMutation = useCriarCliente();
  const updateMutation = useAtualizarCliente();
  const deleteMutation = useExcluirCliente();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>(initialForm);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClientes = clientes.filter(c => 
    c.razaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nomeFantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) || c.cpf?.includes(searchTerm)
  );

  const openNew = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (client: Cliente) => {
    setFormData({ ...initialForm, ...client });
    setEditingId(client.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if(confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
        toast({ title: "Excluído com sucesso" });
      } catch (e) {
        toast({ title: "Erro", variant: "destructive" });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'cnpj') formattedValue = formatters.cnpj(value);
    if (name === 'cpf') formattedValue = formatters.cpf(value);
    if (name === 'telefone' || name === 'celular') formattedValue = formatters.phone(value);
    if (name === 'cep') formattedValue = formatters.cep(value);
    setFormData((prev: any) => ({ ...prev, [name]: formattedValue }));
  };

  const handleSearchCnpj = async () => {
    const unmasked = formatters.unmask(formData.cnpj);
    if (unmasked.length !== 14) return toast({ title: "CNPJ Inválido", variant: "destructive" });
    setIsSearching(true);
    try {
      const data = await consultarCnpj(unmasked);
      setFormData((prev: any) => ({
        ...prev,
        razaoSocial: data.razaoSocial || prev.razaoSocial,
        nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
        cep: formatters.cep(data.cep || prev.cep),
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
        telefone: formatters.phone(data.telefone || prev.telefone),
        email: data.email || prev.email,
        situacaoReceita: data.situacao || prev.situacaoReceita,
        atividadePrincipal: data.atividadePrincipal || prev.atividadePrincipal,
        socios: data.socios ? data.socios.map((s:any) => `${s.nome} (${s.qualificacao})`).join(', ') : prev.socios
      }));
      toast({ title: "Dados importados da Receita" });
    } catch {
      toast({ title: "Erro ao buscar CNPJ", variant: "destructive" });
    } finally { setIsSearching(false); }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createMutation.mutateAsync({ data: formData });
        toast({ title: "Cliente cadastrado!" });
      }
      queryClient.invalidateQueries({ queryKey: getListarClientesQueryKey() });
      setIsOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Gestão de Clientes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar cliente por nome, CNPJ ou CPF..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border/50 shadow-sm"
            />
          </div>
          <Button onClick={openNew} className="w-full sm:w-auto bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
        </div>

        <Card className="bg-card border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
                ) : filteredClientes.map((c) => (
                  <TableRow key={c.id} className="border-border/50 group hover:bg-secondary/30">
                    <TableCell>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        {c.tipo === 'PJ' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.nomeFantasia || c.razaoSocial}</TableCell>
                    <TableCell className="font-mono text-sm">{c.tipo === 'PJ' ? c.cnpj : c.cpf}</TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded bg-secondary/80 text-muted-foreground">{c.regimeTributario || 'Não def.'}</span></TableCell>
                    <TableCell>
                      {c.situacaoReceita ? (
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${c.situacaoReceita === 'ATIVA' || c.situacaoReceita === 'Regular' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {c.situacaoReceita}
                        </div>
                      ) : '-'}
                    </TableCell>
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
          <DialogContent className="max-w-4xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-display">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-muted-foreground mb-2 block">Tipo de Inscrição</Label>
                  <RadioGroup value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})} className="flex space-x-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PJ" id="pj-client" /><Label htmlFor="pj-client">PJ (CNPJ)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="PF" id="pf-client" /><Label htmlFor="pf-client">PF (CPF)</Label></div>
                  </RadioGroup>
                </div>
                
                <div className="w-full sm:w-1/3">
                  <Label className="text-muted-foreground mb-2 block">Regime Tributário</Label>
                  <Select value={formData.regimeTributario} onValueChange={(v) => setFormData({...formData, regimeTributario: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                      <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="Autônomo">Autônomo / PF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.tipo === 'PJ' ? (
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <div className="flex space-x-2">
                      <Input name="cnpj" value={formData.cnpj} onChange={handleChange} className="bg-background" />
                      <Button onClick={handleSearchCnpj} disabled={isSearching} variant="secondary">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input name="cpf" value={formData.cpf} onChange={handleChange} className="bg-background" />
                  </div>
                )}
                
                <div className="space-y-2"><Label>Situação Receita</Label><Input name="situacaoReceita" value={formData.situacaoReceita} readOnly className="bg-secondary/50 font-semibold" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Razão Social / Nome Completo</Label><Input name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} className="bg-background" /></div>
                {formData.tipo === 'PJ' && <div className="space-y-2 md:col-span-2"><Label>Nome Fantasia</Label><Input name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} className="bg-background" /></div>}
                
                <div className="space-y-2"><Label>Telefone</Label><Input name="telefone" value={formData.telefone} onChange={handleChange} className="bg-background" /></div>
                <div className="space-y-2"><Label>Celular</Label><Input name="celular" value={formData.celular} onChange={handleChange} className="bg-background" /></div>
                <div className="space-y-2 md:col-span-2"><Label>E-mail</Label><Input name="email" value={formData.email} onChange={handleChange} className="bg-background" /></div>
                
                {formData.tipo === 'PJ' && (
                  <>
                    <div className="space-y-2 md:col-span-2"><Label>Atividade Principal</Label><Input name="atividadePrincipal" value={formData.atividadePrincipal} onChange={handleChange} className="bg-background" /></div>
                    <div className="space-y-2 md:col-span-2"><Label>Quadro de Sócios</Label><Input name="socios" value={formData.socios} onChange={handleChange} className="bg-background" /></div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>CEP</Label><Input name="cep" value={formData.cep} onChange={handleChange} className="bg-background" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Logradouro</Label><Input name="logradouro" value={formData.logradouro} onChange={handleChange} className="bg-background" /></div>
                  <div className="space-y-2"><Label>Número</Label><Input name="numero" value={formData.numero} onChange={handleChange} className="bg-background" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Bairro</Label><Input name="bairro" value={formData.bairro} onChange={handleChange} className="bg-background" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Município</Label><Input name="municipio" value={formData.municipio} onChange={handleChange} className="bg-background" /></div>
                  <div className="space-y-2"><Label>UF</Label><Input name="uf" value={formData.uf} onChange={handleChange} className="bg-background" /></div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white px-8">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
