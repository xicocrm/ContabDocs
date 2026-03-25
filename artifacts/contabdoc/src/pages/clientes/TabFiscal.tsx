import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, RefreshCw, CheckCircle, AlertCircle, Clock, Info,
  BarChart3, FileText, Loader2, ChevronDown, ChevronRight, BookOpen,
  Calculator, AlertTriangle, DollarSign, Building2, Percent,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Regime =
  | "simples_nacional"
  | "mei"
  | "lucro_presumido"
  | "lucro_real"
  | "lucro_arbitrado"
  | "imune_isento"
  | "";

interface SimplesInfo {
  optante: boolean;
  mei: boolean;
  dataOpcao: string | null;
  dataExclusao: string | null;
  dataMei: string | null;
  situacao: "ativo" | "excluido" | "nao_optante";
}

interface FiscalData {
  regimeTributario: string;
  faturamentoAnual: string;
  faturamentoMes: string;
  anexoSimples: string;
  dasValorMensal: string;
  optanteSimples: string;
  situacaoSimples: string;
  dataOpcaoSimples: string;
  regimeFiscalObs: string;
  aliquotaEfetiva: string;
}

interface TabFiscalProps {
  clienteId: number | null;
  cnpj: string;
  atividadePrincipal: string;
  initialData: Partial<FiscalData>;
  onSave: (data: Partial<FiscalData>) => Promise<void>;
  isSaving: boolean;
}

// ─────────────────────────────────────────────
// SIMPLES NACIONAL DATA (Tabelas 2024)
// ─────────────────────────────────────────────
const LIMITE_SIMPLES = 4_800_000;
const LIMITE_MEI = 81_000;
const SALARIO_MINIMO_2024 = 1_412;

const FAIXAS_SIMPLES = [
  { de: 0,         ate: 180_000,     i: "4,00%",  ii: "4,50%",  iii: "6,00%",  iv: "4,50%",  v: "15,50%" },
  { de: 180_000,   ate: 360_000,     i: "7,30%",  ii: "7,80%",  iii: "11,20%", iv: "9,00%",  v: "18,00%" },
  { de: 360_000,   ate: 720_000,     i: "9,50%",  ii: "10,00%", iii: "13,50%", iv: "10,20%", v: "19,50%" },
  { de: 720_000,   ate: 1_800_000,   i: "10,70%", ii: "11,20%", iii: "16,00%", iv: "14,00%", v: "20,50%" },
  { de: 1_800_000, ate: 3_600_000,   i: "14,30%", ii: "14,70%", iii: "21,00%", iv: "22,00%", v: "23,00%" },
  { de: 3_600_000, ate: 4_800_000,   i: "19,00%", ii: "30,00%", iii: "33,00%", iv: "33,00%", v: "30,50%" },
];

const FAIXAS_DEDUCAO = [
  { i: 0,         ii: 0,         iii: 0,          iv: 0,         v: 0 },
  { i: 5_940,     ii: 5_940,     iii: 9_360,      iv: 8_100,     v: 4_500 },
  { i: 13_860,    ii: 13_860,    iii: 17_640,     iv: 12_420,    v: 9_900 },
  { i: 22_500,    ii: 22_500,    iii: 35_640,     iv: 39_780,    v: 17_100 },
  { i: 87_300,    ii: 85_500,    iii: 125_640,    iv: 183_780,   v: 62_100 },
  { i: 378_000,   ii: 720_000,   iii: 648_000,    iv: 828_000,   v: 540_000 },
];

const ANEXO_INFO: Record<string, { nome: string; descricao: string; exemplos: string; cor: string; corBg: string }> = {
  "I":   { nome: "Comércio", descricao: "Comércio em geral", exemplos: "Lojas, supermercados, pet shops, farmácias, papelarias", cor: "text-blue-400", corBg: "bg-blue-500/10 border-blue-500/30" },
  "II":  { nome: "Indústria", descricao: "Indústria e fabricação", exemplos: "Confecções, gráficas, fábricas, marcenarias, padarias com produção", cor: "text-purple-400", corBg: "bg-purple-500/10 border-purple-500/30" },
  "III": { nome: "Serviços I", descricao: "Serviços com menor carga tributária", exemplos: "Academias, agências de viagem, instalação, manutenção, representação comercial", cor: "text-green-400", corBg: "bg-green-500/10 border-green-500/30" },
  "IV":  { nome: "Serviços II", descricao: "Serviços de construção e limpeza", exemplos: "Construção civil, limpeza, vigilância, mão-de-obra em geral (sem recolhimento do CPP)", cor: "text-orange-400", corBg: "bg-orange-500/10 border-orange-500/30" },
  "V":   { nome: "Serviços III", descricao: "Serviços com maior especialização", exemplos: "TI, medicina, arquitetura, advocacia, engenharia, publicidade, jornalismo", cor: "text-red-400", corBg: "bg-red-500/10 border-red-500/30" },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function getFaixaIndex(faturamento: number): number {
  return FAIXAS_SIMPLES.findIndex(f => faturamento >= f.de && faturamento <= f.ate);
}

function calcularAliquotaEfetiva(faturamento: number, anexo: string): { aliquota: string; das: string; faixa: number } {
  if (!faturamento || !anexo) return { aliquota: "—", das: "—", faixa: -1 };
  const idx = getFaixaIndex(faturamento);
  if (idx < 0) return { aliquota: "—", das: "—", faixa: -1 };
  const key = anexo.toLowerCase() as keyof typeof FAIXAS_SIMPLES[0];
  const nominalStr = FAIXAS_SIMPLES[idx][key] as string;
  if (!nominalStr) return { aliquota: "—", das: "—", faixa: -1 };
  const nominal = parseFloat(nominalStr.replace("%", "").replace(",", ".")) / 100;
  const deducao = FAIXAS_DEDUCAO[idx][key as keyof typeof FAIXAS_DEDUCAO[0]] as number;
  const efetiva = ((faturamento * nominal - deducao) / faturamento) * 100;
  const dasAnual = (faturamento * nominal) - deducao;
  return {
    aliquota: efetiva.toFixed(2).replace(".", ",") + "%",
    das: formatBRL(dasAnual / 12),
    faixa: idx + 1,
  };
}

const BASE_URL = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiFetch(path: string) {
  const r = await fetch(`${BASE_URL}${path}`, { headers: { "Content-Type": "application/json" } });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
  return r.json();
}

// ─────────────────────────────────────────────
// REGIME CARD COMPONENT
// ─────────────────────────────────────────────
interface RegimeCardProps {
  id: Regime;
  label: string;
  desc: string;
  icon: React.ReactNode;
  selected: boolean;
  cor: string;
  corRing: string;
  onClick: () => void;
}

function RegimeCard({ id, label, desc, icon, selected, cor, corRing, onClick }: RegimeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 w-full
        ${selected
          ? `${corRing} bg-secondary/60 shadow-lg`
          : "border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40"
        }
      `}
    >
      {selected && (
        <span className="absolute top-2 right-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
        </span>
      )}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? "bg-primary/20" : "bg-secondary/60"}`}>
        <span className={selected ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      </div>
      <div>
        <p className={`font-semibold text-sm ${selected ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION COLLAPSE
// ─────────────────────────────────────────────
function SectionCollapse({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pt-3 pb-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function TabFiscal({ clienteId, cnpj, atividadePrincipal, initialData, onSave, isSaving }: TabFiscalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FiscalData>({
    regimeTributario: initialData.regimeTributario || "",
    faturamentoAnual: initialData.faturamentoAnual || "",
    faturamentoMes: initialData.faturamentoMes || "",
    anexoSimples: initialData.anexoSimples || "",
    dasValorMensal: initialData.dasValorMensal || "",
    optanteSimples: initialData.optanteSimples || "",
    situacaoSimples: initialData.situacaoSimples || "",
    dataOpcaoSimples: initialData.dataOpcaoSimples || "",
    regimeFiscalObs: initialData.regimeFiscalObs || "",
    aliquotaEfetiva: initialData.aliquotaEfetiva || "",
  });

  const [simplesInfo, setSimplesInfo] = useState<SimplesInfo | null>(null);
  const [loadingSimples, setLoadingSimples] = useState(false);

  const regime = (form.regimeTributario || "") as Regime;
  const fat = parseBRL(form.faturamentoAnual);
  const calc = calcularAliquotaEfetiva(fat, form.anexoSimples);

  function setField(key: keyof FiscalData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function consultarSimples() {
    const cnpjLimpo = (cnpj || "").replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      toast({ title: "CNPJ inválido", variant: "destructive" }); return;
    }
    setLoadingSimples(true);
    try {
      const data = await apiFetch(`/api/cnpj/${cnpjLimpo}`);
      if (data.simplesOptante !== undefined || data.meiOptante !== undefined) {
        const info: SimplesInfo = {
          optante: !!data.simplesOptante,
          mei: !!data.meiOptante,
          dataOpcao: data.simplesDataOpcao || null,
          dataExclusao: data.simplesDataExclusao || null,
          dataMei: data.meiDataOpcao || null,
          situacao: data.simplesOptante ? "ativo" : data.simplesDataExclusao ? "excluido" : "nao_optante",
        };
        setSimplesInfo(info);
        setForm(f => ({
          ...f,
          optanteSimples: info.optante ? "Sim" : "Não",
          situacaoSimples: info.situacao === "ativo" ? "Ativo" : info.situacao === "excluido" ? "Excluído" : "Não optante",
          dataOpcaoSimples: info.dataOpcao || "",
        }));
        toast({ title: "Situação Simples Nacional atualizada" });
      } else {
        toast({ title: "Dados do Simples Nacional não disponíveis para este CNPJ", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.message || "Erro ao consultar Receita Federal", variant: "destructive" });
    } finally {
      setLoadingSimples(false);
    }
  }

  async function handleSave() {
    try {
      const efetiva = regime === "simples_nacional" ? calc.aliquota : "";
      await onSave({ ...form, aliquotaEfetiva: efetiva });
      toast({ title: "Dados fiscais salvos com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar dados fiscais", variant: "destructive" });
    }
  }

  const regimes: Array<{ id: Regime; label: string; desc: string; icon: React.ReactNode; cor: string; corRing: string }> = [
    { id: "simples_nacional", label: "Simples Nacional",   desc: "Faturamento até R$ 4,8M/ano",        icon: <TrendingUp className="w-5 h-5" />,   cor: "text-emerald-400", corRing: "border-emerald-500/60" },
    { id: "mei",              label: "MEI",                 desc: "Microempreendedor Individual — R$ 81k/ano", icon: <Building2 className="w-5 h-5" />,   cor: "text-sky-400",     corRing: "border-sky-500/60" },
    { id: "lucro_presumido",  label: "Lucro Presumido",    desc: "Faturamento até R$ 78M/ano",          icon: <BarChart3 className="w-5 h-5" />,    cor: "text-violet-400",  corRing: "border-violet-500/60" },
    { id: "lucro_real",       label: "Lucro Real",          desc: "Apuração pelo lucro contábil",         icon: <Calculator className="w-5 h-5" />,   cor: "text-amber-400",   corRing: "border-amber-500/60" },
    { id: "lucro_arbitrado",  label: "Lucro Arbitrado",    desc: "Apuração arbitrada pela RFB",          icon: <AlertTriangle className="w-5 h-5" />, cor: "text-red-400",     corRing: "border-red-500/60" },
    { id: "imune_isento",     label: "Imune / Isento",     desc: "Entidades sem fins lucrativos",        icon: <BookOpen className="w-5 h-5" />,     cor: "text-slate-400",   corRing: "border-slate-500/60" },
  ];

  // ──── Simples Nacional Panel ────
  const SimplesPanel = () => {
    const pctUsado = fat > 0 ? Math.min((fat / LIMITE_SIMPLES) * 100, 100) : 0;
    const anexoAtual = form.anexoSimples;
    const info = ANEXO_INFO[anexoAtual];

    return (
      <div className="space-y-4">
        {/* Situação Receita Federal */}
        <SectionCollapse title="Situação no Simples Nacional" icon={<CheckCircle className="w-4 h-4" />}>
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={consultarSimples}
              disabled={loadingSimples || !cnpj}
              className="gap-2"
            >
              {loadingSimples ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Consultar na Receita Federal
            </Button>

            {simplesInfo && (
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className={simplesInfo.optante ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}>
                  {simplesInfo.optante ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  {simplesInfo.optante ? "Optante Simples" : "Não Optante"}
                </Badge>
                {simplesInfo.mei && (
                  <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Optante MEI
                  </Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Optante pelo Simples</Label>
                <Input value={form.optanteSimples} onChange={e => setField("optanteSimples", e.target.value)} className="bg-background h-8 text-sm" placeholder="Sim / Não" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Situação</Label>
                <Input value={form.situacaoSimples} onChange={e => setField("situacaoSimples", e.target.value)} className="bg-background h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data da Opção</Label>
                <Input value={form.dataOpcaoSimples} onChange={e => setField("dataOpcaoSimples", e.target.value)} className="bg-background h-8 text-sm font-mono" placeholder="AAAA-MM-DD" />
              </div>
            </div>
          </div>
        </SectionCollapse>

        {/* Faturamento e Cálculo */}
        <SectionCollapse title="Faturamento e Cálculo da Alíquota" icon={<DollarSign className="w-4 h-4" />}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Faturamento Anual (RBT12)</Label>
                <Input
                  value={form.faturamentoAnual}
                  onChange={e => setField("faturamentoAnual", e.target.value)}
                  className="bg-background font-mono"
                  placeholder="R$ 0,00"
                />
                <p className="text-[10px] text-muted-foreground">Receita Bruta Total dos últimos 12 meses</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anexo do Simples Nacional</Label>
                <Select value={form.anexoSimples} onValueChange={v => setField("anexoSimples", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione o Anexo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ANEXO_INFO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>Anexo {k} — {v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barra de limite */}
            {fat > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilização do limite Simples Nacional</span>
                  <span className={`font-semibold ${pctUsado >= 90 ? "text-red-400" : pctUsado >= 70 ? "text-amber-400" : "text-green-400"}`}>
                    {pctUsado.toFixed(1)}% — {formatBRL(fat)}
                  </span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pctUsado >= 90 ? "bg-red-500" : pctUsado >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${pctUsado}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>R$ 0</span>
                  <span>Limite: {formatBRL(LIMITE_SIMPLES)}</span>
                </div>
                {pctUsado >= 90 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Empresa próxima do limite do Simples Nacional. Considere o enquadramento no Lucro Presumido.
                  </div>
                )}
              </div>
            )}

            {/* Resultado do cálculo */}
            {fat > 0 && form.anexoSimples && calc.faixa > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Faixa", valor: `${calc.faixa}ª Faixa`, cor: "text-primary" },
                  { label: "Alíquota Efetiva", valor: calc.aliquota, cor: "text-emerald-400" },
                  { label: "DAS Estimado/mês", valor: calc.das, cor: "text-amber-400" },
                ].map(({ label, valor, cor }) => (
                  <div key={label} className="bg-secondary/30 rounded-xl p-3 text-center border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                    <p className={`font-bold text-base ${cor}`}>{valor}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCollapse>

        {/* Tabela do Anexo */}
        {form.anexoSimples && info && (
          <SectionCollapse title={`Tabela Anexo ${form.anexoSimples} — ${info.nome}`} icon={<FileText className="w-4 h-4" />}>
            <div className="space-y-3">
              <div className={`rounded-lg border px-3 py-2.5 ${info.corBg}`}>
                <p className={`text-xs font-semibold ${info.cor}`}>{info.descricao}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{info.exemplos}</p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/40">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Faixa</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Receita Bruta (12 meses)</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Alíquota Nominal</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Valor a Deduzir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAIXAS_SIMPLES.map((f, idx) => {
                      const key = form.anexoSimples.toLowerCase() as keyof typeof f;
                      const dedKey = form.anexoSimples.toLowerCase() as keyof typeof FAIXAS_DEDUCAO[0];
                      const isCurrent = calc.faixa === idx + 1;
                      return (
                        <tr key={idx} className={`border-b border-border/30 last:border-0 ${isCurrent ? "bg-primary/10" : "hover:bg-secondary/20"}`}>
                          <td className="px-3 py-2.5 font-semibold">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${isCurrent ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono">
                            {formatBRL(f.de)} a {formatBRL(f.ate)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold ${isCurrent ? "text-primary" : ""}`}>
                            {String(f[key] ?? "—")}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground font-mono">
                            {formatBRL(FAIXAS_DEDUCAO[idx][dedKey] as number)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground">
                * Alíquota Efetiva = (RBT12 × Alíquota Nominal − Valor a Deduzir) ÷ RBT12. Fonte: Lei Complementar 123/2006 atualizada.
              </p>
            </div>
          </SectionCollapse>
        )}

        {/* Obrigações Acessórias */}
        <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { nome: "PGDAS-D", desc: "Declaração e Geração do DAS — mensal, até dia 20 do mês seguinte", cor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
              { nome: "DASN", desc: "Declaração Anual do Simples Nacional — até 31/05 do ano seguinte", cor: "bg-green-500/10 text-green-400 border-green-500/20" },
              { nome: "DEFIS", desc: "Informações Socioeconômicas e Fiscais — anual, junto à DASN", cor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
              { nome: "EFD-Reinf", desc: "Escrituração Fiscal Digital — retenções e informações da EFD", cor: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
              { nome: "Livro Caixa", desc: "Livro Caixa digital — obrigatório para PJ Simples com escrituração", cor: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
              { nome: "ISS / ICMS", desc: "Declarações municipais e estaduais conforme regime do estado/município", cor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
            ].map(({ nome, desc, cor }) => (
              <div key={nome} className={`rounded-lg border px-3 py-2.5 ${cor}`}>
                <p className="font-semibold text-xs">{nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCollapse>
      </div>
    );
  };

  // ──── MEI Panel ────
  const MeiPanel = () => {
    const dasMei = SALARIO_MINIMO_2024 * 0.05;
    const totalComercio = dasMei + 1;
    const totalServico = dasMei + 5;
    const totalAmbos = dasMei + 6;

    return (
      <div className="space-y-4">
        {/* Resumo MEI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Comércio / Indústria", valor: formatBRL(totalComercio), desc: "INSS + ICMS R$ 1,00", cor: "text-sky-400" },
            { label: "Serviços", valor: formatBRL(totalServico), desc: "INSS + ISS R$ 5,00", cor: "text-violet-400" },
            { label: "Comércio + Serviços", valor: formatBRL(totalAmbos), desc: "INSS + ICMS + ISS", cor: "text-emerald-400" },
          ].map(({ label, valor, desc, cor }) => (
            <div key={label} className="bg-secondary/30 rounded-xl p-4 text-center border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
              <p className={`font-bold text-xl ${cor}`}>{valor}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>

        <SectionCollapse title="Composição do DAS-MEI (2024)" icon={<DollarSign className="w-4 h-4" />}>
          <div className="space-y-1">
            <InfoRow label="Salário Mínimo" value={formatBRL(SALARIO_MINIMO_2024)} />
            <InfoRow label="INSS (5% do salário mínimo)" value={formatBRL(dasMei)} />
            <InfoRow label="ICMS (Comércio / Indústria)" value="R$ 1,00" />
            <InfoRow label="ISS (Serviços)" value="R$ 5,00" />
            <InfoRow label="Limite de Faturamento Anual" value={formatBRL(LIMITE_MEI)} />
            <InfoRow label="Limite Mensal Proporcional" value={formatBRL(LIMITE_MEI / 12)} />
          </div>
        </SectionCollapse>

        <SectionCollapse title="Restrições do MEI" icon={<AlertTriangle className="w-4 h-4" />} defaultOpen={false}>
          <div className="space-y-2">
            {[
              "Não pode ter sócios — o MEI é uma empresa individual",
              "Pode ter apenas 1 (um) funcionário empregado",
              "Não pode participar como sócio de outra empresa",
              "Não pode exercer atividades vedadas ao MEI (profissões regulamentadas)",
              "Faturamento máximo: R$ 81.000 por ano (ou R$ 6.750/mês)",
              "Ultrapassando o limite: reenquadramento obrigatório no Simples Nacional",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </SectionCollapse>

        <SectionCollapse title="Obrigações Acessórias MEI" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { nome: "DAS-MEI", desc: "Pagamento mensal até dia 20", cor: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
              { nome: "DASN-SIMEI", desc: "Declaração Anual — até 31/05 do ano seguinte", cor: "bg-green-500/10 text-green-400 border-green-500/20" },
              { nome: "Relatório Mensal de Receitas", desc: "Documento simplificado — substituiu o livro caixa", cor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
              { nome: "Nota Fiscal", desc: "Emissão obrigatória para pessoa jurídica; facultativo para PF", cor: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            ].map(({ nome, desc, cor }) => (
              <div key={nome} className={`rounded-lg border px-3 py-2.5 ${cor}`}>
                <p className="font-semibold text-xs">{nome}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCollapse>
      </div>
    );
  };

  // ──── Lucro Presumido Panel ────
  const LucroPresumidoPanel = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-violet-400">Lucro Presumido</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Regime de tributação com base em percentuais de presunção de lucro aplicados sobre a receita bruta.
          Permitido para empresas com faturamento anual de até <strong className="text-foreground">R$ 78.000.000,00</strong>.
        </p>
      </div>

      <SectionCollapse title="Percentuais de Presunção — IRPJ" icon={<Percent className="w-4 h-4" />}>
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/40">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Atividade</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Presunção IRPJ</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Presunção CSLL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Comércio em geral",                        "8%",  "12%"],
                ["Indústria / Fabricação",                   "8%",  "12%"],
                ["Serviços hospitalares / planos de saúde",  "8%",  "12%"],
                ["Transporte de cargas",                     "8%",  "12%"],
                ["Demais transportes de passageiros",        "16%", "12%"],
                ["Serviços de intermediação de negócios",    "32%", "32%"],
                ["Serviços em geral (regra geral)",          "32%", "32%"],
                ["Construção por empreitada c/ materiais",   "8%",  "12%"],
                ["Construção por empreitada s/ materiais",   "32%", "32%"],
                ["Loteamento, incorporação imobiliária",     "8%",  "12%"],
                ["Venda de imóveis (estoque)",               "8%",  "12%"],
                ["Administração, locação de imóveis",        "32%", "32%"],
              ].map(([ativ, irpj, csll], i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                  <td className="px-3 py-2">{ativ}</td>
                  <td className="px-3 py-2 text-right font-bold text-violet-400">{irpj}</td>
                  <td className="px-3 py-2 text-right font-bold text-amber-400">{csll}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCollapse>

      <SectionCollapse title="Alíquotas dos Tributos" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { tributo: "IRPJ",    base: "Lucro Presumido",           aliquota: "15%", obs: "+ Adicional de 10% sobre lucro > R$ 20k/trimestre", cor: "text-violet-400" },
            { tributo: "CSLL",    base: "Lucro Presumido",           aliquota: "9%",  obs: "Contribuição Social sobre o Lucro Líquido", cor: "text-purple-400" },
            { tributo: "PIS",     base: "Faturamento bruto",         aliquota: "0,65%", obs: "Regime cumulativo", cor: "text-blue-400" },
            { tributo: "COFINS",  base: "Faturamento bruto",         aliquota: "3%",  obs: "Regime cumulativo", cor: "text-indigo-400" },
            { tributo: "INSS",    base: "Folha de pagamento",        aliquota: "20%", obs: "Sobre a remuneração dos empregados (RAT + Terceiros)", cor: "text-green-400" },
            { tributo: "ISS",     base: "Serviço prestado",          aliquota: "2% a 5%", obs: "Conforme município e atividade", cor: "text-teal-400" },
            { tributo: "ICMS",    base: "Circulação de mercadorias", aliquota: "Variável", obs: "Conforme Estado e CFOP", cor: "text-orange-400" },
          ].map(({ tributo, base, aliquota, obs, cor }) => (
            <div key={tributo} className="bg-secondary/20 rounded-lg border border-border/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-sm ${cor}`}>{tributo}</span>
                <span className={`text-sm font-semibold ${cor}`}>{aliquota}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Base: {base}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{obs}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Período de Apuração e Prazo" icon={<Clock className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="Apuração IRPJ / CSLL" value="Trimestral (mar, jun, set, dez)" />
          <InfoRow label="Prazo de recolhimento" value="Último dia útil do mês seguinte ao trimestre" />
          <InfoRow label="PIS / COFINS" value="Mensal — até o 25º dia do mês seguinte" />
          <InfoRow label="Opção pelo regime" value="Irretratável para todo o ano-calendário" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { nome: "ECF", desc: "Escrituração Contábil Fiscal — anual, até julho do ano seguinte", cor: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
            { nome: "ECD", desc: "Escrituração Contábil Digital — anual, até junho do ano seguinte", cor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
            { nome: "DCTF", desc: "Declaração de Débitos Tributários Federais — mensal", cor: "bg-green-500/10 text-green-400 border-green-500/20" },
            { nome: "EFD-Contribuições", desc: "PIS/COFINS — mensal (quando cumulativo, semestral)", cor: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            { nome: "SPED Fiscal", desc: "EFD-ICMS/IPI — mensal conforme estado", cor: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
            { nome: "DIRF / eSocial", desc: "Retenções, folha e encargos trabalhistas", cor: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
          ].map(({ nome, desc, cor }) => (
            <div key={nome} className={`rounded-lg border px-3 py-2.5 ${cor}`}>
              <p className="font-semibold text-xs">{nome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>
    </div>
  );

  // ──── Lucro Real Panel ────
  const LucroRealPanel = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-amber-400">Lucro Real</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Tributação com base no lucro líquido contábil ajustado pelas adições, exclusões e compensações.
          <strong className="text-foreground"> Obrigatório</strong> para empresas com faturamento acima de R$ 78M/ano, instituições financeiras e empresas com benefícios fiscais.
        </p>
      </div>

      <SectionCollapse title="Regime de Apuração" icon={<Calculator className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { nome: "Trimestral", desc: "Apuração a cada 3 meses (mar/jun/set/dez). Lucros e prejuízos compensáveis dentro do ano.", cor: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
            { nome: "Anual (Estimativa Mensal)", desc: "Pagamentos mensais por estimativa (IRPJ/CSLL), com ajuste em dezembro. Mais flexível para compensação de prejuízos.", cor: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
          ].map(({ nome, desc, cor }) => (
            <div key={nome} className={`rounded-lg border p-3 ${cor}`}>
              <p className="font-semibold text-xs">{nome}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Alíquotas dos Tributos" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { tributo: "IRPJ",   base: "Lucro Real",       aliquota: "15%", obs: "+ Adicional 10% sobre lucro > R$ 20k/mês (R$ 60k/trim)", cor: "text-amber-400" },
            { tributo: "CSLL",   base: "Lucro Real",       aliquota: "9%",  obs: "Empresas em geral. Financeiras: 15% ou 20%", cor: "text-orange-400" },
            { tributo: "PIS",    base: "Faturamento bruto", aliquota: "1,65%", obs: "Regime NÃO cumulativo — créditos permitidos", cor: "text-blue-400" },
            { tributo: "COFINS", base: "Faturamento bruto", aliquota: "7,6%", obs: "Regime NÃO cumulativo — créditos permitidos", cor: "text-indigo-400" },
            { tributo: "INSS",   base: "Folha de pagamento", aliquota: "20%", obs: "RAT + Terceiros (SENAI, SESI, SEBRAE, etc.)", cor: "text-green-400" },
            { tributo: "ISS",    base: "Serviço prestado", aliquota: "2% a 5%", obs: "Conforme município e atividade", cor: "text-teal-400" },
            { tributo: "ICMS",   base: "Mercadorias",      aliquota: "Variável", obs: "Conforme Estado, operação e produto (NCM)", cor: "text-purple-400" },
          ].map(({ tributo, base, aliquota, obs, cor }) => (
            <div key={tributo} className="bg-secondary/20 rounded-lg border border-border/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-sm ${cor}`}>{tributo}</span>
                <span className={`text-sm font-semibold ${cor}`}>{aliquota}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Base: {base}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{obs}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="LALUR e Controle de Prejuízos" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="Compensação de Prejuízos" value="Até 30% do lucro de cada período" />
          <InfoRow label="Prazo de compensação" value="Sem prazo — prejuízos fiscais não prescrevem" />
          <InfoRow label="LALUR" value="Livro de Apuração do Lucro Real — obrigatório" />
          <InfoRow label="Créditos PIS/COFINS" value="Insumos, ativo imobilizado, aluguéis, energia elétrica, fretes" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { nome: "ECF", desc: "Escrituração Contábil Fiscal — inclui o LALUR digital", cor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
            { nome: "ECD", desc: "Escrituração Contábil Digital — balanço e razão contábil", cor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
            { nome: "DCTF Mensal", desc: "Declaração mensal de débitos tributários federais", cor: "bg-green-500/10 text-green-400 border-green-500/20" },
            { nome: "EFD-Contribuições", desc: "PIS/COFINS — mensal (não cumulativo)", cor: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            { nome: "SPED Fiscal", desc: "EFD-ICMS/IPI e outros módulos conforme estado/atividade", cor: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
            { nome: "eSocial + REINF", desc: "Folha de pagamento, retenções e informações previdenciárias", cor: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
            { nome: "Balancete Mensal", desc: "Necessário no regime de estimativa anual para ajuste", cor: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
          ].map(({ nome, desc, cor }) => (
            <div key={nome} className={`rounded-lg border px-3 py-2.5 ${cor}`}>
              <p className="font-semibold text-xs">{nome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>
    </div>
  );

  // ──── Lucro Arbitrado Panel ────
  const LucroArbitradoPanel = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-red-400">Lucro Arbitrado</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Forma de apuração utilizada pela autoridade tributária ou pelo próprio contribuinte quando não é possível determinar o lucro real ou presumido.
          Aplica percentuais majorados sobre a receita bruta.
        </p>
      </div>

      <SectionCollapse title="Situações de Arbitramento" icon={<AlertTriangle className="w-4 h-4" />}>
        <div className="space-y-2">
          {[
            "Escrituração contábil não mantida ou extraviada",
            "Livros fiscais sem autenticação pelo Fisco",
            "Ausência de balancetes mensais no lucro real (estimativa)",
            "Recusa de exibição de livros e documentos fiscais",
            "Omissão de receitas ou declarações com fraude",
            "Empresa optante pelo lucro presumido sem escrituração de caixa",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              {item}
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Percentuais de Arbitramento — IRPJ" icon={<Percent className="w-4 h-4" />}>
        <p className="text-[11px] text-muted-foreground mb-3">
          Percentuais do Lucro Presumido acrescidos de 20%:
        </p>
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/40">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Atividade</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Arbitramento IRPJ</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Comércio / Indústria",              "9,6%"],
                ["Transporte de cargas",               "9,6%"],
                ["Demais transportes",                 "19,2%"],
                ["Serviços em geral",                  "38,4%"],
                ["Intermediação de negócios",          "38,4%"],
                ["Construção c/ fornecimento materiais","9,6%"],
              ].map(([ativ, pct], i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                  <td className="px-3 py-2">{ativ}</td>
                  <td className="px-3 py-2 text-right font-bold text-red-400">{pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCollapse>
    </div>
  );

  // ──── Imune/Isento Panel ────
  const ImuneIsentoPanel = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-slate-300">Imune / Isento</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Entidades sem fins lucrativos que gozam de imunidade ou isenção tributária por força da Constituição Federal (art. 150, VI) ou de legislação infraconstitucional.
        </p>
      </div>

      <SectionCollapse title="Tipos de Entidades" icon={<BookOpen className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { nome: "Associações e Fundações", desc: "Imunidade nas suas finalidades estatutárias", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
            { nome: "Entidades Religiosas", desc: "Cultos de qualquer crença — imunidade ampla", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
            { nome: "Partidos Políticos", desc: "Imunidade sobre patrimônio, renda e serviços", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
            { nome: "Entidades de Educação / AS", desc: "Sem fins lucrativos com requisitos do art. 14 CTN", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
            { nome: "Sindicatos de Trabalhadores", desc: "Imunidade nas atividades sindicais", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
            { nome: "OSCIP / OS", desc: "Organizações qualificadas pelo Ministério da Justiça", cor: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
          ].map(({ nome, desc, cor }) => (
            <div key={nome} className={`rounded-lg border px-3 py-2.5 ${cor}`}>
              <p className="font-semibold text-xs">{nome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações das Imunes/Isentas" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="IRPJ / CSLL" value="Imunes ou isentas — desde que cumpram requisitos do art. 12/13 da Lei 9.532/97" />
          <InfoRow label="PIS / COFINS" value="Alíquota 0% ou isenção — verificar legislação específica" />
          <InfoRow label="Folha de pagamento" value="INSS normal — sem isenção sobre remunerações" />
          <InfoRow label="EFD-Reinf" value="Obrigatória para retenções sobre serviços prestados/tomados" />
          <InfoRow label="DIRF" value="Declaração de rendimentos pagos — obrigatória" />
          <InfoRow label="Prestação de contas" value="Exigida pelo Tribunal de Contas (se receber recursos públicos)" />
          <InfoRow label="Manutenção da imunidade" value="Art. 14 CTN: sem lucro distribuído, aplicação integral, escrituração regular" />
        </div>
      </SectionCollapse>
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm">Regime Tributário</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Selecione o regime e visualize todas as informações fiscais conforme as normas da Receita Federal.</p>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="shrink-0 gap-2"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Salvar
        </Button>
      </div>

      {/* Regime Picker */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Enquadramento Tributário
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {regimes.map(r => (
              <RegimeCard
                key={r.id}
                {...r}
                selected={regime === r.id}
                onClick={() => setField("regimeTributario", r.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regime-specific content */}
      {regime && (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-5 pb-5 px-5">
            {regime === "simples_nacional" && <SimplesPanel />}
            {regime === "mei" && <MeiPanel />}
            {regime === "lucro_presumido" && <LucroPresumidoPanel />}
            {regime === "lucro_real" && <LucroRealPanel />}
            {regime === "lucro_arbitrado" && <LucroArbitradoPanel />}
            {regime === "imune_isento" && <ImuneIsentoPanel />}
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-5 pb-5 px-5 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Observações Fiscais</span>
          </div>
          <Textarea
            value={form.regimeFiscalObs}
            onChange={e => setField("regimeFiscalObs", e.target.value)}
            className="bg-background min-h-[90px] text-sm"
            placeholder="Observações sobre o regime, particularidades, decisões do escritório..."
          />
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground bg-secondary/20 rounded-xl border border-border/30 p-3.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
        <span>
          Informações baseadas na legislação vigente (LC 123/2006 e atualizações, RIR/2018, Lei 9.430/96).
          As alíquotas e tabelas são referência para 2024. Consulte sempre a legislação atualizada e o contador responsável antes de tomar decisões tributárias.
        </span>
      </div>
    </div>
  );
}
