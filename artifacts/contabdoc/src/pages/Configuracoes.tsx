import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Users, Webhook, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { 
  useListarUsuarios, 
  useCriarUsuario, 
  useAtualizarUsuario, 
  useExcluirUsuario,
  useListarIntegracoes,
  useSalvarIntegracao,
  UsuarioPerfil
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListarUsuariosQueryKey, getListarIntegracoesQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INTEGRATION_LIST = [
  { id: 'wavoip', name: 'Wavoip', type: 'comunicacao', icon: '📞' },
  { id: 'falepaco', name: 'FalePaco', type: 'comunicacao', icon: '💬' },
  { id: 'whatiket', name: 'Whatiket', type: 'comunicacao', icon: '📱' },
  { id: 'asaas', name: 'Asaas', type: 'banco', icon: '🏦' },
  { id: 'inter', name: 'Banco Inter', type: 'banco', icon: '🏦' },
  { id: 'efi', name: 'Efí Pay', type: 'banco', icon: '🏦' },
  { id: 'mercadopago', name: 'Mercado Pago', type: 'banco', icon: '💳' },
];

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Data
  const { data: usuarios = [], isLoading: loadUsers } = useListarUsuarios();
  const { data: integracoes = [], isLoading: loadInts } = useListarIntegracoes();
  
  // Mutations Users
  const createUsr = useCriarUsuario();
  const updateUsr = useAtualizarUsuario();
  const deleteUsr = useExcluirUsuario();
  
  // Mutations Integrations
  const saveInt = useSalvarIntegracao();

  // State Users
  const [usrOpen, setUsrOpen] = useState(false);
  const [usrEditId, setUsrEditId] = useState<number|null>(null);
  const [usrForm, setUsrForm] = useState({ nome: '', email: '', senha: '', perfil: 'operador' as UsuarioPerfil, ativo: true });

  const handleUserSave = async () => {
    try {
      if (usrEditId) {
        await updateUsr.mutateAsync({ id: usrEditId, data: usrForm });
        toast({ title: "Usuário atualizado" });
      } else {
        if(!usrForm.senha) { toast({ title: "Senha obrigatória", variant: "destructive" }); return; }
        await createUsr.mutateAsync({ data: usrForm });
        toast({ title: "Usuário criado" });
      }
      queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey() });
      setUsrOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleIntToggle = async (intId: string, name: string, type: string, currentVal: boolean) => {
    try {
      await saveInt.mutateAsync({ data: { nome: name, tipo: type, ativo: !currentVal, config: '{}' } });
      queryClient.invalidateQueries({ queryKey: getListarIntegracoesQueryKey() });
      toast({ title: "Integração atualizada" });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Configurações">
      <Tabs defaultValue="usuarios" className="w-full space-y-6">
        <TabsList className="bg-card border border-border/50 p-1 h-12">
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Users className="w-4 h-4 mr-2"/> Usuários</TabsTrigger>
          <TabsTrigger value="permissoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Shield className="w-4 h-4 mr-2"/> Permissões</TabsTrigger>
          <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Webhook className="w-4 h-4 mr-2"/> Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-0">
          <Card className="bg-card border-border/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestão de Usuários</CardTitle>
                <CardDescription>Cadastre e gerencie o acesso da sua equipe.</CardDescription>
              </div>
              <Button onClick={() => { setUsrForm({nome:'',email:'',senha:'',perfil:'operador',ativo:true}); setUsrEditId(null); setUsrOpen(true); }} className="bg-primary">
                <Plus className="w-4 h-4 mr-2" /> Novo Usuário
              </Button>
            </CardHeader>
            <CardContent>
              {loadUsers ? <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id} className="border-border/50">
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell><span className="capitalize px-2 py-1 rounded bg-secondary text-xs">{u.perfil}</span></TableCell>
                        <TableCell>{u.ativo ? <span className="text-success text-xs font-semibold">ATIVO</span> : <span className="text-muted-foreground text-xs font-semibold">INATIVO</span>}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setUsrForm({nome:u.nome,email:u.email,senha:'',perfil:u.perfil,ativo:u.ativo??true}); setUsrEditId(u.id); setUsrOpen(true); }}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { if(confirm('Excluir?')) { deleteUsr.mutateAsync({id: u.id}).then(()=>queryClient.invalidateQueries({queryKey:getListarUsuariosQueryKey()})) } }}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes" className="mt-0">
          <Card className="bg-card border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Matriz de Permissões</CardTitle>
              <CardDescription>Configure o que cada perfil pode acessar no sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center border-2 border-dashed border-border/50 rounded-xl bg-secondary/20">
                <Shield className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Matriz Avançada em Desenvolvimento</h3>
                <p className="text-muted-foreground max-w-md mx-auto">A configuração detalhada de CRUD por módulo e perfil estará disponível na próxima atualização do sistema.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INTEGRATION_LIST.map(int => {
              const activeData = integracoes.find(i => i.nome === int.name);
              const isActive = activeData?.ativo ?? false;
              return (
                <Card key={int.id} className={`border-border/50 shadow-lg transition-all ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-3xl">{int.icon}</div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{int.name}</h3>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{int.type}</p>
                        </div>
                      </div>
                      <Switch checked={isActive} onCheckedChange={() => handleIntToggle(int.id, int.name, int.type, isActive)} />
                    </div>
                    {isActive && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center"><Key className="w-3 h-3 mr-1"/> API Key / Token</Label>
                          <Input type="password" placeholder="sk_test_..." className="bg-background h-8 text-sm" />
                        </div>
                        <Button size="sm" className="w-full h-8 text-xs">Salvar Credenciais</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={usrOpen} onOpenChange={setUsrOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>{usrEditId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={usrForm.nome} onChange={e=>setUsrForm({...usrForm,nome:e.target.value})} className="bg-background"/></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={usrForm.email} onChange={e=>setUsrForm({...usrForm,email:e.target.value})} className="bg-background"/></div>
            <div className="space-y-2"><Label>{usrEditId ? 'Nova Senha (opcional)' : 'Senha'}</Label><Input type="password" value={usrForm.senha} onChange={e=>setUsrForm({...usrForm,senha:e.target.value})} className="bg-background"/></div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={usrForm.perfil} onValueChange={(v:any)=>setUsrForm({...usrForm, perfil:v})}>
                <SelectTrigger className="bg-background"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={usrForm.ativo} onCheckedChange={v=>setUsrForm({...usrForm, ativo:v})} />
              <Label>Usuário Ativo no Sistema</Label>
            </div>
            <div className="flex justify-end pt-4"><Button onClick={handleUserSave} className="w-full bg-primary">{createUsr.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Salvar'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
