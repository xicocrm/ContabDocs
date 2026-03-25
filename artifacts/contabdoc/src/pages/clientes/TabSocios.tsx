import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, User, Users, Paperclip, Upload, X, Eye, FileText } from "lucide-react";

const QUALIFICACOES = [
  "22-Sócio", "49-Sócio-Administrador", "05-Administrador", "10-Diretor",
  "16-Presidente", "21-Procurador", "65-Titular", "08-Conselheiro",
  "28-Inventariante", "29-Liquidante", "31-Titular de empresa individual",
];

function calcularIdade(dataNasc: string): string {
  if (!dataNasc) return "";
  const nascimento = new Date(dataNasc);
  if (isNaN(nascimento.getTime())) return "";
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) anos--;
  return anos >= 0 ? `${anos} anos` : "";
}

function formatarCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

interface Socio {
  nome: string;
  qualificacao: string;
  cpf: string;
  dataNascimento: string;
  capitalSocial: string;
  nomeMae: string;
  documentoPessoal?: string;
  documentoPessoalNome?: string;
  comprovanteEndereco?: string;
  comprovanteEnderecoNome?: string;
}

const emptySocio = (): Socio => ({
  nome: "", qualificacao: "", cpf: "", dataNascimento: "", capitalSocial: "", nomeMae: "",
  documentoPessoal: "", documentoPessoalNome: "",
  comprovanteEndereco: "", comprovanteEnderecoNome: "",
});

interface TabSociosProps {
  value: string;
  onChange: (json: string) => void;
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

function DocUploadSlot({
  label, variant = "primary",
  arquivoNome, arquivo,
  onFile, onClear,
}: {
  label: string; variant?: "primary" | "green";
  arquivoNome: string; arquivo: string;
  onFile: (b64: string, nome: string) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const iconCls = variant === "green" ? "text-emerald-400" : "text-primary";
  const filledCls = variant === "green"
    ? "bg-emerald-500/5 border-emerald-500/20"
    : "bg-primary/5 border-primary/20";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande. Máx 5MB.", variant: "destructive" }); return;
    }
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as string, f.name);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${arquivoNome ? filledCls : "bg-secondary/20 border-border/40"}`}>
        {arquivoNome ? (
          <div className="flex items-center gap-2">
            <FileText className={`w-3.5 h-3.5 ${iconCls} shrink-0`} />
            <span className="text-xs text-foreground truncate flex-1">{arquivoNome}</span>
            <button type="button" onClick={() => setViewOpen(true)} className={`p-0.5 rounded ${iconCls} hover:opacity-70`} title="Visualizar">
              <Eye className="w-3 h-3" />
            </button>
            <button type="button" onClick={onClear} className="p-0.5 rounded text-muted-foreground hover:text-destructive" title="Remover">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="text-xs">Nenhum arquivo</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded border border-border/40 bg-secondary/30 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Upload className="w-3 h-3" />
          {arquivoNome ? "Trocar" : "Anexar"}
        </button>
      </div>
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFile} />
      {viewOpen && arquivo && (
        <FileViewDialog open={viewOpen} onClose={() => setViewOpen(false)} arquivo={arquivo} arquivoNome={arquivoNome} />
      )}
    </div>
  );
}

export function TabSocios({ value, onChange }: TabSociosProps) {
  const parseInitial = (): Socio[] => {
    try { const p = JSON.parse(value || "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
  };
  const [socios, setSocios] = useState<Socio[]>(parseInitial);

  const update = (list: Socio[]) => {
    setSocios(list);
    onChange(JSON.stringify(list));
  };

  const addSocio = () => update([...socios, emptySocio()]);

  const removeSocio = (i: number) => {
    if (!confirm(`Remover Sócio ${i + 1}?`)) return;
    update(socios.filter((_, idx) => idx !== i));
  };

  const setSocioField = (i: number, field: keyof Socio, val: string) => {
    const list = socios.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    update(list);
  };

  if (socios.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary/60" />
        </div>
        <p className="text-muted-foreground mb-1">Nenhum sócio cadastrado</p>
        <p className="text-sm text-muted-foreground/60 mb-6">Adicione os sócios ou representantes legais desta empresa</p>
        <Button onClick={addSocio} className="bg-gradient-to-r from-primary to-indigo-600">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Sócio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {socios.map((s, i) => (
        <Card key={i} className="bg-card border border-white/8 hover:border-primary/30 transition-colors">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Sócio {i + 1}</p>
                  {s.nome && <p className="text-sm font-medium text-white/80 truncate max-w-[260px]">{s.nome}</p>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeSocio(i)} className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Nome do Sócio</Label>
                <Input
                  value={s.nome}
                  onChange={e => setSocioField(i, "nome", e.target.value.toUpperCase())}
                  placeholder="Nome completo"
                  className="bg-background/60 uppercase font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Qualificação</Label>
                <Select value={s.qualificacao} onValueChange={v => setSocioField(i, "qualificacao", v)}>
                  <SelectTrigger className="bg-background/60"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {QUALIFICACOES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <Input
                  value={s.cpf}
                  onChange={e => setSocioField(i, "cpf", formatarCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="bg-background/60 font-mono"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={s.dataNascimento}
                  onChange={e => setSocioField(i, "dataNascimento", e.target.value)}
                  className="bg-background/60"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Idade</Label>
                <Input
                  value={calcularIdade(s.dataNascimento)}
                  readOnly
                  placeholder="—"
                  className="bg-secondary/40 cursor-default text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">% Capital Social</Label>
                <Input
                  value={s.capitalSocial}
                  onChange={e => setSocioField(i, "capitalSocial", e.target.value)}
                  placeholder="Ex: 50%"
                  className="bg-background/60"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                <Input
                  value={s.nomeMae}
                  onChange={e => setSocioField(i, "nomeMae", e.target.value.toUpperCase())}
                  placeholder="Nome completo da mãe"
                  className="bg-background/60 uppercase"
                />
              </div>
            </div>

          </CardContent>
        </Card>
      ))}

      <Button
        onClick={addSocio}
        variant="outline"
        className="w-full border-dashed border-white/20 text-muted-foreground hover:text-white hover:border-primary/40 hover:bg-primary/5"
      >
        <Plus className="w-4 h-4 mr-2" /> Adicionar Sócio
      </Button>
    </div>
  );
}
