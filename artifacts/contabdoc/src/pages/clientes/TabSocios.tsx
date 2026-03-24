import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, User, Users } from "lucide-react";

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
}

const emptySocio = (): Socio => ({
  nome: "", qualificacao: "", cpf: "", dataNascimento: "", capitalSocial: "", nomeMae: "",
});

interface TabSociosProps {
  value: string;
  onChange: (json: string) => void;
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
