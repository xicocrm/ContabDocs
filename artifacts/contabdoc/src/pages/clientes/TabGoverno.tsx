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
  Calendar, AlertTriangle, CheckCircle, Clock, Paperclip, X,
  Sparkles, Loader2, ScanLine
} from "lucide-react";

const BASE_URL = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const JUNTAS_COMERCIAIS: Record<string, string> = {
  AC:"JUCEAC", AL:"JUCEAL", AM:"JUCEA", AP:"JUCAP", BA:"JUCEB", CE:"JUCEC",
  DF:"JUCIS", ES:"JUCEES", GO:"JUCEG", MA:"JUCEMA", MG:"JUCEMG", MS:"JUCEMAT",
  MT:"JUCEMAT", PA:"JUCEPA", PB:"JUCEP", PE:"JUCEPE", PI:"JUCEPI", PR:"JUCEPAR",
  RJ:"JUCERJA", RN:"JUCERN", RO:"JUCERO", RR:"JUCERR", RS:"JUCERGS", SC:"JUCESC",
  SE:"JUCESE", SP:"JUCESP", TO:"JUETO",
};

async function extrairDocumento(base64: string, mimeType: string, tipoDocumento: string) {
  const r = await fetch(`${BASE_URL}/api/extrair-documento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType, tipoDocumento }),
  });
  if (!r.ok) throw new Error("Erro na extração");
  return r.json();
}

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

function FileViewDialog({ open, onClose, arquivo, arquivoNome }: {
  open: boolean; onClose: () => void; arquivo: string; arquivoNome: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border/50 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Paperclip className="w-4 h-4 text-primary" /> {arquivoNome}
          </DialogTitle>
        </DialogHeader>
        <div style={{ minHeight: "60vh" }}>
          {arquivo.startsWith("data:image") ? (
            <img src={arquivo} alt={arquivoNome} className="max-w-full mx-auto" />
          ) : (
            <iframe src={arquivo} title={arquivoNome} className="w-full h-full min-h-[65vh] border-0" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FileUploadWithAiProps {
  label: string;
  arquivoNome: string;
  arquivo: string;
  onChange: (base64: string, nome: string) => void;
  onClear: () => void;
  tipoDocumento: string;
  onExtracted?: (dados: Record<string, string>) => void;
}

function FileUploadWithAi({ label, arquivoNome, arquivo, onChange, onClear, tipoDocumento, onExtracted }: FileUploadWithAiProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast({ title: "Arquivo muito grande. Máximo 15MB.", variant: "destructive" }); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      onChange(base64, f.name);

      if (onExtracted) {
        setExtracting(true);
        toast({ title: "🔍 Lendo documento com IA..." });
        try {
          const { dados } = await extrairDocumento(base64, f.type || "image/jpeg", tipoDocumento);
          onExtracted(dados || {});
          toast({ title: "✓ Dados extraídos do documento!" });
        } catch {
          toast({ title: "Documento anexado. Extração IA indisponível.", variant: "default" });
        } finally { setExtracting(false); }
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {arquivo ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          {extracting && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          {!extracting && <Paperclip className="w-4 h-4 text-primary shrink-0" />}
          <span className="text-sm text-white flex-1 truncate">{arquivoNome}</span>
          {!extracting && onExtracted && (
            <button
              type="button"
              onClick={async () => {
                setExtracting(true);
                toast({ title: "🔍 Relendo documento com IA..." });
                try {
                  const { dados } = await extrairDocumento(arquivo, arquivo.startsWith("data:image") ? "image/jpeg" : "application/pdf", tipoDocumento);
                  onExtracted(dados || {});
                  toast({ title: "✓ Dados extraídos!" });
                } catch { toast({ title: "Erro na extração", variant: "destructive" }); }
                finally { setExtracting(false); }
              }}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 shrink-0"
              title="Re-extrair dados com IA"
            >
              <ScanLine className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setViewOpen(true)} className="text-muted-foreground hover:text-primary shrink-0">
            <Eye className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-red-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={extracting}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/15 text-muted-foreground hover:text-white hover:border-primary/30 hover:bg-primary/5 transition-all text-sm"
        >
          {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {extracting ? "Lendo com IA..." : (
            <span className="flex items-center gap-1.5">
              Anexar arquivo
              <span className="flex items-center gap-0.5 text-xs text-violet-400"><Sparkles className="w-3 h-3" /> leitura automática</span>
            </span>
          )}
        </button>
      )}
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFile} />
      {viewOpen && arquivo && (
        <FileViewDialog open={viewOpen} onClose={() => setViewOpen(false)} arquivo={arquivo} arquivoNome={arquivoNome} />
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
          <button type="button" onClick={() => setViewOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10">
            <Eye className="w-3.5 h-3.5" /> Ver doc
          </button>
        )}
        <button type="button" onClick={() => onEdit(a)} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white">
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(a.id!)} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {viewOpen && a.arquivo && (
        <FileViewDialog open={viewOpen} onClose={() => setViewOpen(false)} arquivo={a.arquivo} arquivoNome={a.arquivoNome} />
      )}
    </div>
  );
}

interface GovernoCampos {
  jucebNumero: string;
  jucebData: string;
  jucebSituacao: string;
  jucebObservacoes: string;
  jucebUf: string;
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
  const [alvaraOpen, setAlvaraOpen]       = useState(false);
  const [alvaraEditId, setAlvaraEditId]   = useState<number | null>(null);
  const [alvaraForm, setAlvaraForm]       = useState<Alvara>(emptyAlvara());
  const [savingAlvara, setSavingAlvara]   = useState(false);
  const [extractingAlvara, setExtractingAlvara] = useState(false);

  const nomeJunta = JUNTAS_COMERCIAIS[form.jucebUf || "BA"] || "Junta Comercial";

  const openNovoAlvara = () => {
    if (!clienteId) { toast({ title: "Salve o cliente primeiro", variant: "destructive" }); return; }
    setAlvaraForm(emptyAlvara());
    setAlvaraEditId(null); setAlvaraOpen(true);
  };

  const openEditAlvara = (a: Alvara) => {
    setAlvaraForm({ ...a }); setAlvaraEditId(a.id ?? null); setAlvaraOpen(true);
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

  const handleAlvaraFileExtracted = (dados: Record<string, string>) => {
    setAlvaraForm(prev => ({
      ...prev,
      numero: dados.numero || prev.numero,
      orgaoExpedidor: dados.orgaoExpedidor || prev.orgaoExpedidor,
      tipo: dados.tipo || prev.tipo,
      dataEmissao: dados.dataEmissao || prev.dataEmissao,
      vencimento: dados.vencimento || prev.vencimento,
      observacoes: dados.observacoes ? `${prev.observacoes}\n${dados.observacoes}`.trim() : prev.observacoes,
    }));
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
              <h3 className="font-semibold text-white text-sm">{nomeJunta} — Junta Comercial</h3>
              <p className="text-xs text-muted-foreground">Registro e situação na Junta Comercial Estadual</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* UF row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Estado (UF) da Junta</Label>
              <Select value={form.jucebUf || "BA"} onValueChange={v => onFormChange("jucebUf", v)}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  {UFS.map(uf => (
                    <SelectItem key={uf} value={uf}>
                      <span className="font-mono font-semibold text-primary mr-2">{uf}</span>
                      {JUNTAS_COMERCIAIS[uf] || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Número de Registro</Label>
              <Input
                value={form.jucebNumero}
                onChange={e => onFormChange("jucebNumero", e.target.value)}
                placeholder={`Nº do registro na ${nomeJunta}`}
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <Input
                value={form.jucebSituacao}
                onChange={e => onFormChange("jucebSituacao", e.target.value)}
                placeholder="Ex: Ativa, Baixada, Inapta..."
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea
                value={form.jucebObservacoes}
                onChange={e => onFormChange("jucebObservacoes", e.target.value)}
                placeholder="Observações adicionais"
                className="bg-background/60 min-h-[60px] resize-none"
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
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Inscrição Municipal e Estadual
                <span className="flex items-center gap-0.5 text-violet-400 text-[10px]">
                  <Sparkles className="w-2.5 h-2.5" /> leitura automática ao anexar
                </span>
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          {/* Inscrição Municipal */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Inscrição Municipal
            </p>
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
              <FileUploadWithAi
                label="Documento (PDF/Imagem)"
                arquivo={form.arquivoInscricaoMunicipal}
                arquivoNome={form.arquivoInscricaoMunicipalNome}
                tipoDocumento="inscricao_municipal"
                onChange={(b64, nome) => {
                  onFormChange("arquivoInscricaoMunicipal", b64);
                  onFormChange("arquivoInscricaoMunicipalNome", nome);
                }}
                onClear={() => {
                  onFormChange("arquivoInscricaoMunicipal", "");
                  onFormChange("arquivoInscricaoMunicipalNome", "");
                }}
                onExtracted={(dados) => {
                  if (dados.inscricaoMunicipal) onFormChange("inscricaoMunicipal", dados.inscricaoMunicipal);
                  if (dados.numero && !form.inscricaoMunicipal) onFormChange("inscricaoMunicipal", dados.numero);
                }}
              />
            </div>
          </div>

          {/* Inscrição Estadual */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Inscrição Estadual
            </p>
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
              <FileUploadWithAi
                label="Documento (PDF/Imagem)"
                arquivo={form.arquivoInscricaoEstadual}
                arquivoNome={form.arquivoInscricaoEstadualNome}
                tipoDocumento="inscricao_estadual"
                onChange={(b64, nome) => {
                  onFormChange("arquivoInscricaoEstadual", b64);
                  onFormChange("arquivoInscricaoEstadualNome", nome);
                }}
                onClear={() => {
                  onFormChange("arquivoInscricaoEstadual", "");
                  onFormChange("arquivoInscricaoEstadualNome", "");
                }}
                onExtracted={(dados) => {
                  if (dados.inscricaoEstadual) onFormChange("inscricaoEstadual", dados.inscricaoEstadual);
                  if (dados.numero && !form.inscricaoEstadual) onFormChange("inscricaoEstadual", dados.numero);
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
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Controle de vencimentos e documentos
                  <span className="flex items-center gap-0.5 text-violet-400 text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" /> dados extraídos automaticamente
                  </span>
                </p>
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
            {/* Anexo primeiro para leitura IA auto-preencher campos */}
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-xs text-violet-400 font-medium mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Anexe o documento primeiro — a IA preencherá os campos automaticamente
              </p>
              <FileUploadWithAi
                label="Documento do Alvará (PDF/Imagem)"
                arquivo={alvaraForm.arquivo}
                arquivoNome={alvaraForm.arquivoNome}
                tipoDocumento="alvara"
                onChange={(b64, nome) => setAlvaraForm(p => ({ ...p, arquivo: b64, arquivoNome: nome }))}
                onClear={() => setAlvaraForm(p => ({ ...p, arquivo: "", arquivoNome: "" }))}
                onExtracted={handleAlvaraFileExtracted}
              />
            </div>

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
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
              <Button variant="ghost" onClick={() => setAlvaraOpen(false)}>Cancelar</Button>
              <Button onClick={salvarAlvara} disabled={savingAlvara} className="bg-gradient-to-r from-amber-600 to-orange-600">
                {savingAlvara && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {alvaraEditId ? "Salvar Alterações" : "Cadastrar Alvará"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
