import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Users, Webhook, Loader2, Plus, Edit, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
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

type ConfigField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'select';
  options?: string[];
  hint?: string;
};

const INTEGRATION_LIST: {
  id: string; name: string; type: string; icon: string; description: string;
  fields: ConfigField[];
}[] = [
  {
    id: 'asaas', name: 'Asaas', type: 'gateway', icon: '🏦',
    description: 'Cobranças, boletos, Pix e cartão de crédito',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: '$aact_...', type: 'password', hint: 'Encontre em Minha Conta → Integrações → API Key' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Sandbox (Testes)'] },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://seudominio.com/webhooks/asaas', hint: 'URL para receber eventos de pagamento' },
      { key: 'walletId', label: 'Wallet ID (opcional)', placeholder: 'ID da subconta Asaas' },
    ],
  },
  {
    id: 'efi', name: 'Efí Pay (Gerencianet)', type: 'gateway', icon: '💳',
    description: 'Pix, boletos e cobranças via API',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'Client_Id_...', type: 'password' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Client_Secret_...', type: 'password' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Homologação (Testes)'] },
      { key: 'pixKey', label: 'Chave Pix', placeholder: 'CNPJ, email, telefone ou aleatória' },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://seudominio.com/webhooks/efi' },
    ],
  },
  {
    id: 'inter', name: 'Banco Inter', type: 'gateway', icon: '🟠',
    description: 'Cobrança via API Banco Inter',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'UUID do app Inter', type: 'password' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Secret do app Inter', type: 'password' },
      { key: 'contaCorrente', label: 'Conta Corrente', placeholder: '0000000-0' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Sandbox (Testes)'] },
      { key: 'certPath', label: 'Certificado (.pem)', placeholder: 'Caminho do certificado mTLS', hint: 'Baixe em Inter → Desenvolvedores → Certificados' },
    ],
  },
  {
    id: 'mercadopago', name: 'Mercado Pago', type: 'gateway', icon: '💛',
    description: 'Pagamentos via Pix, cartão e link de pagamento',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'APP_USR-...', type: 'password', hint: 'Encontre em mercadopago.com/developers → Credenciais' },
      { key: 'publicKey', label: 'Public Key', placeholder: 'APP_USR-...', hint: 'Usada no frontend para tokenização de cartão' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Sandbox (Testes)'] },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://seudominio.com/webhooks/mp' },
    ],
  },
  {
    id: 'wavoip', name: 'Wavoip', type: 'comunicacao', icon: '📞',
    description: 'VoIP via WhatsApp',
    fields: [
      { key: 'apiToken', label: 'API Token', placeholder: 'Token Wavoip', type: 'password' },
      { key: 'instancia', label: 'Instância', placeholder: 'Nome da instância' },
      { key: 'baseUrl', label: 'URL Base', placeholder: 'https://api.wavoip.com' },
    ],
  },
  {
    id: 'whatiket', name: 'Whatiket', type: 'comunicacao', icon: '📱',
    description: 'Multi-atendimento WhatsApp',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Token Whatiket', type: 'password' },
      { key: 'baseUrl', label: 'URL da Instância', placeholder: 'https://app.whatiket.com.br' },
      { key: 'queueId', label: 'Fila (Queue ID)', placeholder: 'ID da fila de atendimento' },
    ],
  },
  {
    id: 'falepaco', name: 'FalePaco', type: 'comunicacao', icon: '💬',
    description: 'Comunicação e atendimento via WhatsApp',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Chave FalePaco', type: 'password' },
      { key: 'baseUrl', label: 'URL Base', placeholder: 'https://api.falepaco.com.br' },
      { key: 'instancia', label: 'Instância', placeholder: 'Nome ou ID da instância' },
    ],
  },
];

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="bg-background h-9 text-sm pr-9 font-mono" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function IntegrationCard({ int, integracoes, onSave }: any) {
  const activeData = integracoes.find((i: any) => i.nome === int.name);
  const isActive = activeData?.ativo ?? false;
  const savedConfig = (() => { try { return JSON.parse(activeData?.config || '{}'); } catch { return {}; } })();
  const [config, setConfig] = useState<Record<string, string>>(savedConfig);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleToggle = () => onSave(int, !isActive, config);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(int, isActive, config);
      toast({ title: `✓ ${int.name} configurado!` });
      setExpanded(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className={`border-border/50 shadow-lg transition-all ${isActive ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{int.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">{int.name}</h3>
                <Badge variant="outline" className={`text-xs uppercase ${int.type === 'gateway' ? 'text-blue-400 border-blue-400/30' : 'text-green-400 border-green-400/30'}`}>{int.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{int.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isActive ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-muted-foreground/40" />}
            <Switch checked={isActive} onCheckedChange={handleToggle} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => setExpanded(!expanded)}>
            <Key className="w-3 h-3 mr-1" /> {expanded ? 'Fechar' : 'Configurar Credenciais'}
          </Button>
          {isActive && savedConfig.apiKey || savedConfig.clientId || savedConfig.accessToken ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Configurado</Badge>
          ) : null}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            {int.fields.map((f: ConfigField) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                  {f.type === 'password' && <Key className="w-3 h-3" />}
                  {f.label}
                </Label>
                {f.type === 'select' ? (
                  <Select value={config[f.key] || ''} onValueChange={v => setConfig(p => ({ ...p, [f.key]: v }))}>
                    <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{f.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : f.type === 'password' ? (
                  <PasswordField value={config[f.key] || ''} onChange={v => setConfig(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} />
                ) : (
                  <Input value={config[f.key] || ''} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="bg-background h-9 text-sm" />
                )}
                {f.hint && <p className="text-xs text-muted-foreground/70 italic">{f.hint}</p>}
              </div>
            ))}
            <Button size="sm" className="w-full bg-primary mt-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Credenciais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: usuarios = [], isLoading: loadUsers } = useListarUsuarios();
  const { data: integracoes = [], isLoading: loadInts } = useListarIntegracoes();
  
  const createUsr = useCriarUsuario();
  const updateUsr = useAtualizarUsuario();
  const deleteUsr = useExcluirUsuario();
  const saveInt = useSalvarIntegracao();

  const [usrOpen, setUsrOpen] = useState(false);
  const [usrEditId, setUsrEditId] = useState<number|null>(null);
  const [usrForm, setUsrForm] = useState({ nome: '', email: '', senha: '', perfil: 'operador' as UsuarioPerfil, ativo: true });

  const handleUserSave = async () => {
    try {
      if (usrEditId) {
        await updateUsr.mutateAsync({ id: usrEditId, data: usrForm });
        toast({ title: "Usuário atualizado" });
      } else {
        if (!usrForm.senha) { toast({ title: "Senha obrigatória", variant: "destructive" }); return; }
        await createUsr.mutateAsync({ data: usrForm });
        toast({ title: "Usuário criado" });
      }
      queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey() });
      setUsrOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleIntSave = async (int: any, active: boolean, config: Record<string, string>) => {
    await saveInt.mutateAsync({ data: { nome: int.name, tipo: int.type, ativo: active, config: JSON.stringify(config) } });
    queryClient.invalidateQueries({ queryKey: getListarIntegracoesQueryKey() });
  };

  const gateways = INTEGRATION_LIST.filter(i => i.type === 'gateway');
  const comunicacao = INTEGRATION_LIST.filter(i => i.type === 'comunicacao');

  return (
    <AppLayout title="Configurações">
      <Tabs defaultValue="integracoes" className="w-full space-y-6">
        <TabsList className="bg-card border border-border/50 p-1 h-12">
          <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Webhook className="w-4 h-4 mr-2"/> Integrações</TabsTrigger>
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Users className="w-4 h-4 mr-2"/> Usuários</TabsTrigger>
          <TabsTrigger value="permissoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-6"><Shield className="w-4 h-4 mr-2"/> Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="integracoes" className="mt-0 space-y-8">
          {loadInts ? (
            <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-semibold text-lg text-foreground">Gateways de Pagamento</h2>
                  <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">FINANCEIRO</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Configure as credenciais para cobranças via boleto, Pix e cartão de crédito.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {gateways.map(int => (
                    <IntegrationCard key={int.id} int={int} integracoes={integracoes} onSave={handleIntSave} />
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-semibold text-lg text-foreground">Comunicação</h2>
                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">WHATSAPP / VoIP</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Integre ferramentas de atendimento e comunicação com clientes.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {comunicacao.map(int => (
                    <IntegrationCard key={int.id} int={int} integracoes={integracoes} onSave={handleIntSave} />
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <Card className="bg-card border-border/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestão de Usuários</CardTitle>
                <CardDescription>Cadastre e gerencie o acesso da sua equipe.</CardDescription>
              </div>
              <Button onClick={() => { setUsrForm({ nome: '', email: '', senha: '', perfil: 'operador', ativo: true }); setUsrEditId(null); setUsrOpen(true); }} className="bg-primary">
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
                        <TableCell>{u.ativo ? <span className="text-green-400 text-xs font-semibold">ATIVO</span> : <span className="text-muted-foreground text-xs font-semibold">INATIVO</span>}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setUsrForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo ?? true }); setUsrEditId(u.id); setUsrOpen(true); }}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('Excluir?')) deleteUsr.mutateAsync({ id: u.id }).then(() => queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey() })); }}><Trash2 className="w-4 h-4" /></Button>
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
                <p className="text-muted-foreground max-w-md mx-auto">A configuração detalhada de CRUD por módulo e perfil estará disponível na próxima atualização.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={usrOpen} onOpenChange={setUsrOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>{usrEditId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={usrForm.nome} onChange={e => setUsrForm({ ...usrForm, nome: e.target.value })} className="bg-background" /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={usrForm.email} onChange={e => setUsrForm({ ...usrForm, email: e.target.value })} className="bg-background" /></div>
            <div className="space-y-2"><Label>{usrEditId ? 'Nova Senha (opcional)' : 'Senha'}</Label><Input type="password" value={usrForm.senha} onChange={e => setUsrForm({ ...usrForm, senha: e.target.value })} className="bg-background" /></div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={usrForm.perfil} onValueChange={(v: any) => setUsrForm({ ...usrForm, perfil: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={usrForm.ativo} onCheckedChange={v => setUsrForm({ ...usrForm, ativo: v })} />
              <Label>Usuário Ativo no Sistema</Label>
            </div>
            <Button onClick={handleUserSave} className="w-full bg-primary">{createUsr.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
