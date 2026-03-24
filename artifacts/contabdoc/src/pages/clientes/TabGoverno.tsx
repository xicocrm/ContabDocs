import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Landmark, Building2, FileText, Plus, Trash2, Upload, Eye,
  Calendar, AlertTriangle, CheckCircle, Clock, Paperclip, X
} from "lucide-react";

interface Alvara {
  id?: number;
  tipo: string;
  numero: string;
  orgaoExpedidor: string;
  dataEmissao: string;
  vencimento: string;
  status: string;
  arquivo: string;
  arquivoNome: string;
  observacoes: string;
}

const emptyAlvara = (): Alvara => ({
  tipo: "", numero: "", orgaoExpedidor: "", dataEmissao: "",
  vencimento: "", status: "ativo", arquivo: "", arquivoNome: "", observacoes: ""
});

function StatusAlvaraChip({ status, vencimento }: { status: string; vencimento?: string }) {
  const hoje = new Date();
  const venc = vencimento ? new Date(vencimento) : null;
  const diasRestantes = venc ? Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const estaVencido = venc && venc < hoje;
  const vcBreve = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

  if (estaVencido) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
      <AlertTriangle className="w-3 h-3" /> Vencido
    </span>
  );
  if (vcBreve) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
      <Clock className="w-3 h-3" /> Vence em {diasRestantes}d
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
      <CheckCircle className="w-3 h-3" /> Ativo
    </span>
  );
}

function FileUploadButton({
  label, arquivoNome, arquivo, onChange, onClear
}: {
  label: string;
  arquivoNome: string;
  arquivo: string;
  onChange: (base64: string, nome: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { alert("Arquivo muito grande. Máximo 15MB."); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, f.name);
    reader.readAsDataURL(f);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {arquivo ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <Paperclip className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm text-white flex-1 truncate">{arquivoNome}</span>
          <button
            type="button"
            onClick={() => setViewOpen(true)}
            className="text-xs text-primary hover:underline shrink-0"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-red-400 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/15 text-muted-foreground hover:text-white hover:border-primary/30 hover:bg-primary/5 transition-all text-sm"
        >
          <Upload className="w-4 h-4" /> Anexar arquivo (PDF, imagem)
        </button>
      )}
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFile} />

      {viewOpen && arquivo && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border/50 p-0 overflow-hidden">
            <DialogHeader className="px-5 py-4 border-b border-border/50">
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Paperclip className="w-4 h-4 text-primary" /> {arquivoNome}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto" style={{ minHeight: "60vh" }}>
              {arquivo.startsWith("data:image") ? (
                <img src={arquivo} alt={arquivoNome} className="max-w-full mx-auto" />
              ) : (
                <iframe src={arquivo} title={arquivoNome} className="w-full h-full min-h-[65vh] border-0" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AlvaraRow({ a, onEdit, onDelete }: { a: Alvara; onEdit: (a: Alvara) => void; onDelete: (id: number) => void }) {
  const [viewOpen, setViewOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/20 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm">{a.tipo}</span>
          {a.numero && <span className="text-xs text-muted-foreground font-mono">#{a.numero}</span>}
          <StatusAlvaraChip status={a.status} vencimento={a.vencimento} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {a.orgaoExpedidor && <span>{a.orgaoExpedidor}</span>}
          {a.vencimento && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Vence: {new Date(a.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {a.arquivo && (
          <button type="button" onClick={() => setViewOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors">
            <Eye className="w-3.5 h-3.5" /> Ver doc
          </button>
        )}
        <button type="button" onClick={() => onEdit(a)} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(a.id!)} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {viewOpen && a.arquivo && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border/50 p-0 overflow-hidden">
            <DialogHeader className="px-5 py-4 border-b border-border/50">
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Paperclip className="w-4 h-4 text-primary" /> {a.tipo} — {a.arquivoNome}
              </DialogTitle>
            </DialogHeader>
            <div style={{ minHeight: "60vh" }}>
              {a.arquivo.startsWith("data:image") ? (
                <img src={a.arquivo} alt={a.arquivoNome} className="max-w-full mx-auto" />
              ) : (
                <iframe src={a.arquivo} title={a.arquivoNome} className="w-full h-full min-h-[65vh] border-0" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface GovernoCampos {
  jucebNumero: string;
  jucebData: string;
  jucebSituacao: string;
  jucebObservacoes: string;
  inscricaoMunicipal: string;
  inscricaoEstadual: string;
  arquivoInscricaoMunicipal: string;
  arquivoInscricaoMunicipalNome: string;
  arquivoInscricaoEstadual: string;
  arquivoInscricaoEstadualNome: string;
}

interface TabGovernoProps {
  form: GovernoCampos;
  onFormChange: (campo: string, valor: string) => void;
  clienteId: number | null;
  alvaras: Alvara[];
  onAlvaraCreate: (a: Omit<Alvara, "id">) => Promise<void>;
  onAlvaraUpdate: (id: number, a: Partial<Alvara>) => Promise<void>;
  onAlvaraDelete: (id: number) => Promise<void>;
}

export function TabGoverno({
  form, onFormChange, clienteId, alvaras, onAlvaraCreate, onAlvaraUpdate, onAlvaraDelete
}: TabGovernoProps) {
  const { toast } = useToast();
  const [alvaraOpen, setAlvaraOpen] = useState(false);
  const [alvaraEditId, setAlvaraEditId] = useState<number | null>(null);
  const [alvaraForm, setAlvaraForm] = useState<Alvara>(emptyAlvara());
  const [savingAlvara, setSavingAlvara] = useState(false);

  const openNovoAlvara = () => {
    if (!clienteId) { toast({ title: "Salve o cliente primeiro", variant: "destructive" }); return; }
    setAlvaraForm(emptyAlvara());
    setAlvaraEditId(null);
    setAlvaraOpen(true);
  };

  const openEditAlvara = (a: Alvara) => {
    setAlvaraForm({ ...a });
    setAlvaraEditId(a.id ?? null);
    setAlvaraOpen(true);
  };

  const salvarAlvara = async () => {
    if (!alvaraForm.tipo) { toast({ title: "Informe o tipo do alvará", variant: "destructive" }); return; }
    setSavingAlvara(true);
    try {
      if (alvaraEditId) {
        await onAlvaraUpdate(alvaraEditId, alvaraForm);
        toast({ title: "✓ Alvará atualizado!" });
      } else {
        await onAlvaraCreate({ ...alvaraForm, clienteId: clienteId! } as any);
        toast({ title: "✓ Alvará cadastrado!" });
      }
      setAlvaraOpen(false);
    } catch { toast({ title: "Erro ao salvar alvará", variant: "destructive" }); }
    finally { setSavingAlvara(false); }
  };

  const excluirAlvara = async (id: number) => {
    if (!confirm("Excluir este alvará?")) return;
    try {
      await onAlvaraDelete(id);
      toast({ title: "✓ Alvará excluído" });
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">

      {/* ── JUCEB ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Junta Comercial do Estado da Bahia</h3>
              <p className="text-xs text-muted-foreground">Registro e situação na JUCEB</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Número de Registro</Label>
              <Input
                value={form.jucebNumero}
                onChange={e => onFormChange("jucebNumero", e.target.value)}
                placeholder="Nº do registro na JUCEB"
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data de Registro</Label>
              <Input
                type="date"
                value={form.jucebData}
                onChange={e => onFormChange("jucebData", e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <Input
                value={form.jucebSituacao}
                onChange={e => onFormChange("jucebSituacao", e.target.value)}
                placeholder="Ex: Ativa, Baixada, etc."
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea
                value={form.jucebObservacoes}
                onChange={e => onFormChange("jucebObservacoes", e.target.value)}
                placeholder="Observações adicionais sobre o registro"
                className="bg-background/60 min-h-[70px] resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Inscrições ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Inscrições Fiscais</h3>
              <p className="text-xs text-muted-foreground">Inscrição Municipal e Estadual com documentos</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Inscrição Municipal</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Número</Label>
                <Input
                  value={form.inscricaoMunicipal}
                  onChange={e => onFormChange("inscricaoMunicipal", e.target.value)}
                  placeholder="Número da inscrição municipal"
                  className="bg-background/60"
                />
              </div>
              <FileUploadButton
                label="Documento"
                arquivo={form.arquivoInscricaoMunicipal}
                arquivoNome={form.arquivoInscricaoMunicipalNome}
                onChange={(b64, nome) => {
                  onFormChange("arquivoInscricaoMunicipal", b64);
                  onFormChange("arquivoInscricaoMunicipalNome", nome);
                }}
                onClear={() => {
                  onFormChange("arquivoInscricaoMunicipal", "");
                  onFormChange("arquivoInscricaoMunicipalNome", "");
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Inscrição Estadual</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Número</Label>
                <Input
                  value={form.inscricaoEstadual}
                  onChange={e => onFormChange("inscricaoEstadual", e.target.value)}
                  placeholder="Número da inscrição estadual"
                  className="bg-background/60"
                />
              </div>
              <FileUploadButton
                label="Documento"
                arquivo={form.arquivoInscricaoEstadual}
                arquivoNome={form.arquivoInscricaoEstadualNome}
                onChange={(b64, nome) => {
                  onFormChange("arquivoInscricaoEstadual", b64);
                  onFormChange("arquivoInscricaoEstadualNome", nome);
                }}
                onClear={() => {
                  onFormChange("arquivoInscricaoEstadual", "");
                  onFormChange("arquivoInscricaoEstadualNome", "");
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Alvarás ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Alvarás e Licenças</h3>
                <p className="text-xs text-muted-foreground">Controle de vencimentos e documentos</p>
              </div>
            </div>
            <Button onClick={openNovoAlvara} size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Alvará
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {alvaras.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhum alvará cadastrado</p>
              <button type="button" onClick={openNovoAlvara} className="text-primary text-sm hover:underline mt-1.5">
                + Cadastrar primeiro alvará
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {alvaras.map(a => (
                <AlvaraRow key={a.id} a={a} onEdit={openEditAlvara} onDelete={excluirAlvara} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Alvará ── */}
      <Dialog open={alvaraOpen} onOpenChange={setAlvaraOpen}>
        <DialogContent className="max-w-xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              {alvaraEditId ? "Editar Alvará" : "Novo Alvará / Licença"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Tipo / Nome do Alvará <span className="text-destructive">*</span></Label>
                <Input
                  value={alvaraForm.tipo}
                  onChange={e => setAlvaraForm(p => ({ ...p, tipo: e.target.value }))}
                  placeholder="Ex: Alvará de Funcionamento, Alvará Sanitário..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={alvaraForm.numero}
                  onChange={e => setAlvaraForm(p => ({ ...p, numero: e.target.value }))}
                  placeholder="Número do documento"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Órgão Expedidor</Label>
                <Input
                  value={alvaraForm.orgaoExpedidor}
                  onChange={e => setAlvaraForm(p => ({ ...p, orgaoExpedidor: e.target.value }))}
                  placeholder="Ex: Prefeitura Municipal"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input type="date" value={alvaraForm.dataEmissao} onChange={e => setAlvaraForm(p => ({ ...p, dataEmissao: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={alvaraForm.vencimento} onChange={e => setAlvaraForm(p => ({ ...p, vencimento: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={alvaraForm.status} onValueChange={v => setAlvaraForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="em_renovacao">Em Renovação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={alvaraForm.observacoes}
                  onChange={e => setAlvaraForm(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Informações adicionais"
                  className="bg-background min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <FileUploadButton
                  label="Documento do Alvará"
                  arquivo={alvaraForm.arquivo}
                  arquivoNome={alvaraForm.arquivoNome}
                  onChange={(b64, nome) => setAlvaraForm(p => ({ ...p, arquivo: b64, arquivoNome: nome }))}
                  onClear={() => setAlvaraForm(p => ({ ...p, arquivo: "", arquivoNome: "" }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
              <Button variant="ghost" onClick={() => setAlvaraOpen(false)}>Cancelar</Button>
              <Button onClick={salvarAlvara} disabled={savingAlvara} className="bg-gradient-to-r from-amber-600 to-orange-600">
                {alvaraEditId ? "Salvar Alterações" : "Cadastrar Alvará"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
