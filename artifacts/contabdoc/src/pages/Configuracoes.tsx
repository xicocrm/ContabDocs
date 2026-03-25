import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AsaasLogo, EfiPayLogo, BancoInterLogo, MercadoPagoLogo, WavoipLogo, WhatiketLogo, FalePacoLogo } from "@/components/logos/GatewayLogos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Key, Users, Webhook, Loader2, Plus, Edit, Trash2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Palette, Download, Upload, Database, HardDrive, RefreshCw,
  Mail, MessageSquare, Send, Copy, FileText, Zap, Globe, Server, Clock,
  Building2, Scale, Receipt, Megaphone, ClipboardList, Handshake, DollarSign,
  CheckSquare, BarChart3, Settings2
} from "lucide-react";
import {
  useListarUsuarios, useCriarUsuario, useAtualizarUsuario, useExcluirUsuario,
  useListarIntegracoes, useSalvarIntegracao,
  useListarClientes, useListarEscritorios, useListarContratos, useListarContas,
  UsuarioPerfil
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListarUsuariosQueryKey, getListarIntegracoesQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { useTheme, THEME_LABELS, THEME_HEX, type ThemeColor } from "@/contexts/ThemeContext";
import { APP_VERSION } from "@/lib/version";

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

type ConfigField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'select' | 'textarea';
  options?: string[];
  hint?: string;
};

const INTEGRATION_LIST: {
  id: string; name: string; type: string; icon: React.ReactNode; description: string;
  fields: ConfigField[];
}[] = [
  {
    id: 'zapi', name: 'Z-API', type: 'whatsapp',
    icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">Z</div>,
    description: 'Integração completa WhatsApp Business API',
    fields: [
      { key: 'instanceId', label: 'Instance ID', placeholder: 'Seu Instance ID Z-API', type: 'text', hint: 'Encontre em z-api.io → Painel → Sua Instância' },
      { key: 'token', label: 'Token', placeholder: 'Token da instância', type: 'password', hint: 'Token de autenticação da instância Z-API' },
      { key: 'securityToken', label: 'Security Token', placeholder: 'Client-Token header', type: 'password', hint: 'Token de segurança para webhooks' },
      { key: 'webhookUrl', label: 'Webhook URL (Recebimento)', placeholder: 'https://seudominio.com/api/webhooks/zapi', hint: 'URL que receberá notificações de mensagens' },
      { key: 'webhookStatus', label: 'Webhook Status', placeholder: 'https://seudominio.com/api/webhooks/zapi/status', hint: 'URL para status de entrega' },
    ],
  },
  {
    id: 'resend', name: 'Resend', type: 'email',
    icon: <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-black to-gray-800 flex items-center justify-center text-white font-bold text-xs">R</div>,
    description: 'Envio de emails transacionais e marketing',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 're_xxxxxxxxxxxx', type: 'password', hint: 'Crie em resend.com → API Keys → Create API Key' },
      { key: 'fromEmail', label: 'Email Remetente', placeholder: 'contato@seudominio.com', type: 'text', hint: 'Domínio deve estar verificado no Resend' },
      { key: 'fromName', label: 'Nome Remetente', placeholder: 'ContabDOC', type: 'text' },
      { key: 'replyTo', label: 'Reply-To (opcional)', placeholder: 'suporte@seudominio.com', type: 'text' },
    ],
  },
  {
    id: 'asaas', name: 'Asaas', type: 'gateway', icon: <AsaasLogo />,
    description: 'Cobranças, boletos, Pix e cartão de crédito',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: '$aact_...', type: 'password', hint: 'Encontre em Minha Conta → Integrações → API Key' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Sandbox (Testes)'] },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://seudominio.com/webhooks/asaas', hint: 'URL para receber eventos de pagamento' },
      { key: 'walletId', label: 'Wallet ID (opcional)', placeholder: 'ID da subconta Asaas' },
    ],
  },
  {
    id: 'efi', name: 'Efí Pay (Gerencianet)', type: 'gateway', icon: <EfiPayLogo />,
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
    id: 'inter', name: 'Banco Inter', type: 'gateway', icon: <BancoInterLogo />,
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
    id: 'mercadopago', name: 'Mercado Pago', type: 'gateway', icon: <MercadoPagoLogo />,
    description: 'Pagamentos via Pix, cartão e link de pagamento',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'APP_USR-...', type: 'password', hint: 'Encontre em mercadopago.com/developers → Credenciais' },
      { key: 'publicKey', label: 'Public Key', placeholder: 'APP_USR-...', hint: 'Usada no frontend para tokenização de cartão' },
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['Produção', 'Sandbox (Testes)'] },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://seudominio.com/webhooks/mp' },
    ],
  },
  {
    id: 'wavoip', name: 'Wavoip', type: 'comunicacao', icon: <WavoipLogo />,
    description: 'VoIP via WhatsApp',
    fields: [
      { key: 'apiToken', label: 'API Token', placeholder: 'Token Wavoip', type: 'password' },
      { key: 'instancia', label: 'Instância', placeholder: 'Nome da instância' },
      { key: 'baseUrl', label: 'URL Base', placeholder: 'https://api.wavoip.com' },
    ],
  },
  {
    id: 'whatiket', name: 'Whatiket', type: 'comunicacao', icon: <WhatiketLogo />,
    description: 'Multi-atendimento WhatsApp',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Token Whatiket', type: 'password' },
      { key: 'baseUrl', label: 'URL da Instância', placeholder: 'https://app.whatiket.com.br' },
      { key: 'queueId', label: 'Fila (Queue ID)', placeholder: 'ID da fila de atendimento' },
    ],
  },
  {
    id: 'falepaco', name: 'FalePaco', type: 'comunicacao', icon: <FalePacoLogo />,
    description: 'Comunicação e atendimento via WhatsApp',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Chave FalePaco', type: 'password' },
      { key: 'baseUrl', label: 'URL Base', placeholder: 'https://api.falepaco.com.br' },
      { key: 'instancia', label: 'Instância', placeholder: 'Nome ou ID da instância' },
    ],
  },
];

const EMAIL_TEMPLATES = [
  { id: 'boas_vindas', nome: 'Boas-vindas', assunto: 'Bem-vindo(a) à {escritorio}!', descricao: 'Enviado ao cadastrar novo cliente', corpo: 'Olá {nome},\n\nSeja bem-vindo(a) ao escritório {escritorio}!\n\nSeu acesso ao portal do cliente já está disponível:\n🔗 Link: {portal_url}\n📧 Email: {email}\n🔑 Senha: {senha}\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,\n{escritorio}' },
  { id: 'vencimento_contrato', nome: 'Vencimento de Contrato', assunto: 'Contrato {numero} - Vencimento em {dias} dias', descricao: 'Lembrete de vencimento de contrato', corpo: 'Olá {nome},\n\nInformamos que o contrato {numero} vencerá em {dias} dias ({data_vencimento}).\n\nValor: R$ {valor}\n\nPara renovação ou esclarecimentos, entre em contato.\n\nAtenciosamente,\n{escritorio}' },
  { id: 'cobranca', nome: 'Cobrança', assunto: 'Fatura {numero} - Vencimento {data_vencimento}', descricao: 'Cobrança de fatura ou boleto', corpo: 'Olá {nome},\n\nSegue sua fatura referente aos serviços contábeis:\n\n📄 Fatura: {numero}\n💰 Valor: R$ {valor}\n📅 Vencimento: {data_vencimento}\n\n{link_pagamento}\n\nEm caso de dúvidas, entre em contato.\n\nAtenciosamente,\n{escritorio}' },
  { id: 'documento_pronto', nome: 'Documento Disponível', assunto: 'Novo documento disponível no portal', descricao: 'Notificação de documento no portal', corpo: 'Olá {nome},\n\nUm novo documento foi disponibilizado no seu portal:\n\n📄 {documento_nome}\n📅 Data: {data}\n\nAcesse pelo link: {portal_url}\n\nAtenciosamente,\n{escritorio}' },
  { id: 'imposto_guia', nome: 'Guia de Imposto', assunto: 'Guia {tipo} - Competência {competencia}', descricao: 'Envio de guia de imposto', corpo: 'Olá {nome},\n\n Segue a guia de {tipo} referente à competência {competencia}:\n\n💰 Valor: R$ {valor}\n📅 Vencimento: {data_vencimento}\n\n{link_guia}\n\nAtenciosamente,\n{escritorio}' },
];

const WHATSAPP_TEMPLATES = [
  { id: 'boas_vindas_wpp', nome: 'Boas-vindas', descricao: 'Mensagem de boas-vindas ao novo cliente', corpo: '👋 Olá *{nome}*!\n\nSeja bem-vindo(a) ao escritório *{escritorio}*!\n\nSeu acesso ao portal: {portal_url}\n📧 Email: {email}\n🔑 Senha: {senha}\n\nQualquer dúvida é só chamar! 😊' },
  { id: 'vencimento_wpp', nome: 'Lembrete de Vencimento', descricao: 'Aviso de vencimento próximo', corpo: '⚠️ Olá *{nome}*!\n\nLembrete: seu contrato *{numero}* vence em *{dias} dias* ({data_vencimento}).\n\n💰 Valor: R$ {valor}\n\nDeseja renovar? Responda esta mensagem!' },
  { id: 'cobranca_wpp', nome: 'Cobrança', descricao: 'Cobrança via WhatsApp', corpo: '📄 Olá *{nome}*!\n\nSua fatura está disponível:\n\n🔢 Nº: {numero}\n💰 Valor: *R$ {valor}*\n📅 Vencimento: {data_vencimento}\n\n🔗 Pague aqui: {link_pagamento}\n\nDúvidas? Estamos aqui!' },
  { id: 'documento_wpp', nome: 'Documento Pronto', descricao: 'Notificação de novo documento', corpo: '📎 Olá *{nome}*!\n\nNovo documento disponível no seu portal:\n\n📄 *{documento_nome}*\n📅 {data}\n\n🔗 Acesse: {portal_url}' },
  { id: 'imposto_wpp', nome: 'Guia de Imposto', descricao: 'Envio de guia por WhatsApp', corpo: '📊 Olá *{nome}*!\n\nSegue sua guia de *{tipo}*:\n\n📅 Competência: {competencia}\n💰 Valor: *R$ {valor}*\n📅 Vencimento: {data_vencimento}\n\n{link_guia}' },
  { id: 'aniversario_wpp', nome: 'Aniversário', descricao: 'Parabenização automática', corpo: '🎂 Parabéns *{nome}*!\n\nO escritório *{escritorio}* deseja a você um feliz aniversário! 🎉\n\nQue este novo ano seja repleto de conquistas e prosperidade! 🌟' },
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

  const typeColors: Record<string, string> = {
    gateway: 'text-blue-400 border-blue-400/30',
    whatsapp: 'text-green-400 border-green-400/30',
    email: 'text-purple-400 border-purple-400/30',
    comunicacao: 'text-cyan-400 border-cyan-400/30',
  };
  const typeLabels: Record<string, string> = {
    gateway: 'PAGAMENTO',
    whatsapp: 'WHATSAPP',
    email: 'E-MAIL',
    comunicacao: 'COMUNICAÇÃO',
  };

  return (
    <Card className={`border-border/50 shadow-lg transition-all hover:shadow-xl ${isActive ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-card'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden">{int.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">{int.name}</h3>
                <Badge variant="outline" className={`text-[10px] uppercase ${typeColors[int.type] || 'text-gray-400 border-gray-400/30'}`}>
                  {typeLabels[int.type] || int.type}
                </Badge>
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
          {isActive && (savedConfig.apiKey || savedConfig.clientId || savedConfig.accessToken || savedConfig.token || savedConfig.instanceId) ? (
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
                ) : f.type === 'textarea' ? (
                  <Textarea value={config[f.key] || ''} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="bg-background text-sm min-h-[100px]" />
                ) : (
                  <Input value={config[f.key] || ''} onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="bg-background h-9 text-sm" />
                )}
                {f.hint && <p className="text-xs text-muted-foreground/70 italic">{f.hint}</p>}
              </div>
            ))}
            <Button size="sm" className="w-full bg-primary mt-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Salvar Credenciais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TemplateCard({ template, tipo, onCopy }: { template: any; tipo: 'email' | 'whatsapp'; onCopy: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="bg-card border-border/50 shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {tipo === 'email' ? <Mail className="w-4 h-4 text-purple-400" /> : <MessageSquare className="w-4 h-4 text-green-400" />}
            <h4 className="font-semibold text-sm">{template.nome}</h4>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(template.corpo)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{template.descricao}</p>
        {template.assunto && (
          <div className="text-xs mb-2">
            <span className="text-muted-foreground">Assunto: </span>
            <span className="font-mono text-foreground/80">{template.assunto}</span>
          </div>
        )}
        {expanded && (
          <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{template.corpo}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ThemeSelector() {
  const { themeColor, setThemeColor } = useTheme();
  const colors: ThemeColor[] = ["blue", "emerald", "violet", "rose", "amber", "cyan", "indigo", "orange"];

  return (
    <Card className="bg-card border-border/50 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Cor do Tema</CardTitle>
            <CardDescription>Personalize a aparência do sistema</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setThemeColor(color)}
              className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                themeColor === color
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-border/50 hover:border-border bg-card hover:bg-secondary/30'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full shadow-lg transition-transform ${themeColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-background' : 'group-hover:scale-105'}`}
                style={{ backgroundColor: THEME_HEX[color], boxShadow: `0 4px 14px ${THEME_HEX[color]}40` }}
              />
              <span className={`text-xs font-medium ${themeColor === color ? 'text-primary' : 'text-muted-foreground'}`}>
                {THEME_LABELS[color]}
              </span>
              {themeColor === color && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-background border border-border/50">
          <h4 className="text-sm font-medium mb-3">Pré-visualização</h4>
          <div className="flex gap-3">
            <Button size="sm" className="bg-primary text-primary-foreground">Botão Primário</Button>
            <Button size="sm" variant="outline">Botão Outline</Button>
            <Badge className="bg-primary/20 text-primary border-primary/30">Badge</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BackupSection() {
  const { toast } = useToast();
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("contabdoc_token");
      const r = await fetch(`${BASE}/api/backup/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) setBackupStatus(await r.json());
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("contabdoc_token");
      const r = await fetch(`${BASE}/api/backup/exportar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contabdoc_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✓ Backup exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar backup", variant: "destructive" });
    } finally { setExporting(false); }
  };

  const stats = backupStatus?.totals || {};

  const statItems = [
    { label: "Escritórios", value: stats.escritorios, icon: Building2, color: "text-blue-400" },
    { label: "Clientes", value: stats.clientes, icon: Users, color: "text-emerald-400" },
    { label: "Contratos", value: stats.contratos, icon: FileText, color: "text-violet-400" },
    { label: "Tarefas", value: stats.tarefas, icon: CheckSquare, color: "text-amber-400" },
    { label: "Contas", value: stats.contas, icon: DollarSign, color: "text-green-400" },
    { label: "Usuários", value: stats.usuarios, icon: Users, color: "text-cyan-400" },
    { label: "Processos", value: stats.processos, icon: Scale, color: "text-orange-400" },
    { label: "Protocolos", value: stats.protocolos, icon: ClipboardList, color: "text-rose-400" },
    { label: "Propostas", value: stats.propostas, icon: Handshake, color: "text-indigo-400" },
    { label: "Negociações", value: stats.negociacoes, icon: Handshake, color: "text-pink-400" },
    { label: "Campanhas", value: stats.campanhas, icon: Megaphone, color: "text-yellow-400" },
    { label: "Consultas", value: stats.consultas, icon: Receipt, color: "text-teal-400" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Status do Banco de Dados</CardTitle>
                <CardDescription>Visão geral de todos os cadastros da aplicação</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !backupStatus ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-background border border-border/50">
                <HardDrive className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{backupStatus?.dbSize || '—'}</p>
                  <p className="text-xs text-muted-foreground">Tamanho do banco</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-foreground">{backupStatus?.serverTime ? new Date(backupStatus.serverTime).toLocaleString('pt-BR') : '—'}</p>
                  <p className="text-xs text-muted-foreground">Hora do servidor</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {statItems.map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/30 hover:border-border/60 transition-colors">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <div>
                      <p className="text-lg font-bold text-foreground">{item.value ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle>Exportar Backup</CardTitle>
                <CardDescription>Baixe todos os dados em JSON</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exporta todas as tabelas do sistema (escritórios, clientes, contratos, tarefas, contas, etc.) em formato JSON.
              O arquivo pode ser usado para restauração ou migração.
            </p>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Exportar Backup Completo
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <CardTitle>Restaurar Backup</CardTitle>
                <CardDescription>Importe dados de um arquivo JSON</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Restaure dados a partir de um arquivo de backup exportado anteriormente.
              <span className="text-destructive font-medium"> Atenção: dados existentes podem ser sobrescritos.</span>
            </p>
            <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10" disabled>
              <Upload className="w-4 h-4 mr-2" /> Restaurar (em breve)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-600/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <CardTitle>Backup Automático VPS</CardTitle>
              <CardDescription>Configuração de backup automático no servidor</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Servidor VPS</Label>
              <Input value="187.77.229.111" disabled className="bg-background h-9 text-sm font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Diretório de Backup</Label>
              <Input value="/opt/contabdoc/backups/" disabled className="bg-background h-9 text-sm font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frequência</Label>
              <Select defaultValue="diario">
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6h">A cada 6 horas</SelectItem>
                  <SelectItem value="12h">A cada 12 horas</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Retenção</Label>
              <Select defaultValue="30">
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Script de backup configurado no crontab do VPS</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">pg_dump automático via cron + rotação de arquivos</p>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border/50">
            <p className="text-xs text-muted-foreground font-mono">
              # Crontab VPS (configuração recomendada)<br/>
              0 2 * * * /opt/contabdoc/scripts/backup.sh &gt;&gt; /var/log/contabdoc-backup.log 2&gt;&amp;1
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
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
  const [usrEditId, setUsrEditId] = useState<number | null>(null);
  const [usrForm, setUsrForm] = useState({ nome: '', email: '', senha: '', perfil: 'operador' as UsuarioPerfil, ativo: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState("aparencia");

  const handleUserSave = async () => {
    try {
      if (usrEditId) {
        const payload = { ...usrForm };
        if (!payload.senha) delete (payload as any).senha;
        await updateUsr.mutateAsync({ id: usrEditId, data: payload });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "✓ Copiado para a área de transferência" });
  };

  const zapiInt = INTEGRATION_LIST.filter(i => i.type === 'whatsapp');
  const resendInt = INTEGRATION_LIST.filter(i => i.type === 'email');
  const gateways = INTEGRATION_LIST.filter(i => i.type === 'gateway');
  const comunicacao = INTEGRATION_LIST.filter(i => i.type === 'comunicacao');

  return (
    <AppLayout title="Configurações" icon={<Settings2 className="w-5 h-5" />}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-card border border-border/50 p-1 h-12 inline-flex w-auto min-w-full md:w-full">
            <TabsTrigger value="aparencia" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <Palette className="w-4 h-4 mr-1.5" /> Aparência
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <Webhook className="w-4 h-4 mr-1.5" /> Integrações
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-1.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <Database className="w-4 h-4 mr-1.5" /> Backup
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1.5" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="data-[state=active]:bg-primary data-[state=active]:text-white h-10 px-4 text-xs sm:text-sm">
              <Shield className="w-4 h-4 mr-1.5" /> Permissões
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="aparencia" className="mt-0 space-y-6">
          <ThemeSelector />

          <Card className="bg-card border-border/50 shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Informações do Sistema</CardTitle>
                  <CardDescription>Versão e configurações gerais</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-background border border-border/50 text-center">
                  <p className="text-2xl font-bold text-primary">v{APP_VERSION}</p>
                  <p className="text-xs text-muted-foreground mt-1">Versão</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">PostgreSQL</p>
                  <p className="text-xs text-muted-foreground mt-1">Banco de Dados</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">Node.js</p>
                  <p className="text-xs text-muted-foreground mt-1">Runtime</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border/50 text-center">
                  <p className="text-2xl font-bold text-foreground">Docker</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="mt-0 space-y-8">
          {loadInts ? (
            <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-green-400" />
                  <h2 className="font-semibold text-lg text-foreground">WhatsApp API</h2>
                  <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">Z-API</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Integração completa com WhatsApp Business via Z-API. Envie e receba mensagens automaticamente.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {zapiInt.map(int => (
                    <IntegrationCard key={int.id} int={int} integracoes={integracoes} onSave={handleIntSave} />
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <h2 className="font-semibold text-lg text-foreground">E-mail Transacional</h2>
                  <Badge variant="outline" className="text-purple-400 border-purple-400/30 text-xs">RESEND</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Envio de emails profissionais via Resend. Cobranças, notificações e comunicados automáticos.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {resendInt.map(int => (
                    <IntegrationCard key={int.id} int={int} integracoes={integracoes} onSave={handleIntSave} />
                  ))}
                </div>
              </div>

              <div className="border-t border-border/50 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-blue-400" />
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
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-semibold text-lg text-foreground">Comunicação</h2>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400/30 text-xs">ATENDIMENTO</Badge>
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

        <TabsContent value="templates" className="mt-0 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold text-lg text-foreground">Templates de E-mail</h2>
              <Badge variant="outline" className="text-purple-400 border-purple-400/30 text-xs">RESEND</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Modelos prontos para envio automático de e-mails. Clique em copiar para usar em suas automações.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EMAIL_TEMPLATES.map(t => (
                <TemplateCard key={t.id} template={t} tipo="email" onCopy={copyToClipboard} />
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 pt-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold text-lg text-foreground">Templates de WhatsApp</h2>
              <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">Z-API</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Modelos prontos para envio via WhatsApp. Use as variáveis {'{nome}'}, {'{escritorio}'}, etc.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {WHATSAPP_TEMPLATES.map(t => (
                <TemplateCard key={t.id} template={t} tipo="whatsapp" onCopy={copyToClipboard} />
              ))}
            </div>
          </div>

          <Card className="bg-card border-border/50 shadow-xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Variáveis Disponíveis</h4>
                  <p className="text-sm text-muted-foreground mb-3">Use estas variáveis nos templates. Elas serão substituídas automaticamente:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['{nome}', '{email}', '{escritorio}', '{portal_url}', '{senha}', '{numero}', '{valor}', '{data_vencimento}',
                      '{dias}', '{competencia}', '{tipo}', '{link_pagamento}', '{link_guia}', '{documento_nome}', '{data}'].map(v => (
                      <button key={v} onClick={() => copyToClipboard(v)}
                        className="text-xs font-mono px-2 py-1 rounded bg-background border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-0">
          <BackupSection />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <Card className="bg-card border-border/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle>Gestão de Usuários</CardTitle>
                  <CardDescription>Cadastre e gerencie o acesso da sua equipe.</CardDescription>
                </div>
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
                      <TableRow key={u.id} className="border-border/50 hover:bg-secondary/30">
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs uppercase ${
                            u.perfil === 'admin' ? 'text-red-400 border-red-400/30' :
                            u.perfil === 'gerente' ? 'text-amber-400 border-amber-400/30' :
                            u.perfil === 'operador' ? 'text-blue-400 border-blue-400/30' :
                            'text-gray-400 border-gray-400/30'
                          }`}>{u.perfil}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.ativo
                            ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">ATIVO</Badge>
                            : <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">INATIVO</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => { setUsrForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo ?? true }); setUsrEditId(u.id); setUsrOpen(true); }}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({ id: u.id, name: u.nome || u.email || `#${u.id}` })}><Trash2 className="w-4 h-4" /></Button>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-600/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <CardTitle>Matriz de Permissões</CardTitle>
                  <CardDescription>Configure o que cada perfil pode acessar no sistema.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="w-48">Módulo</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                      <TableHead className="text-center">Gerente</TableHead>
                      <TableHead className="text-center">Operador</TableHead>
                      <TableHead className="text-center">Visualizador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { mod: 'Dashboard', admin: 'CRUD', gerente: 'CRUD', operador: 'R', visualizador: 'R' },
                      { mod: 'Escritórios', admin: 'CRUD', gerente: 'CRUD', operador: 'R', visualizador: 'R' },
                      { mod: 'Clientes', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Contratos', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Contas', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Tarefas', admin: 'CRUD', gerente: 'CRUD', operador: 'CRUD', visualizador: 'R' },
                      { mod: 'Processos', admin: 'CRUD', gerente: 'CRUD', operador: 'CR', visualizador: 'R' },
                      { mod: 'Protocolos', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Propostas', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Negociações', admin: 'CRUD', gerente: 'CRUD', operador: 'CRU', visualizador: 'R' },
                      { mod: 'Campanhas', admin: 'CRUD', gerente: 'CRUD', operador: 'CR', visualizador: 'R' },
                      { mod: 'Configurações', admin: 'CRUD', gerente: 'R', operador: '—', visualizador: '—' },
                    ].map(row => (
                      <TableRow key={row.mod} className="border-border/50">
                        <TableCell className="font-medium">{row.mod}</TableCell>
                        {['admin', 'gerente', 'operador', 'visualizador'].map(perfil => {
                          const val = (row as any)[perfil];
                          return (
                            <TableCell key={perfil} className="text-center">
                              <Badge variant="outline" className={`text-[10px] font-mono ${
                                val === 'CRUD' ? 'text-green-400 border-green-400/30' :
                                val === '—' ? 'text-muted-foreground/30 border-muted-foreground/10' :
                                'text-amber-400 border-amber-400/30'
                              }`}>{val}</Badge>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                C = Criar, R = Ler, U = Atualizar, D = Deletar
              </p>
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { deleteUsr.mutateAsync({ id: deleteTarget.id }).then(() => queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey() })); setDeleteTarget(null); } }}
        itemName={deleteTarget?.name}
      />
    </AppLayout>
  );
}
