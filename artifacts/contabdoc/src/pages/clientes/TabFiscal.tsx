import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, RefreshCw, CheckCircle, AlertCircle, Clock, Info,
  BarChart3, FileText, Loader2, ChevronDown, ChevronRight, BookOpen,
  Calculator, AlertTriangle, DollarSign, Building2, Percent, Layers, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface FiscalData {
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
// SIMPLES NACIONAL TABLES (2024)
// ─────────────────────────────────────────────
const LIMITE_SIMPLES = 4_800_000;
const LIMITE_MEI = 81_000;
const SALARIO_MINIMO_2024 = 1_412;

const FAIXAS_SIMPLES = [
  { de: 0,         ate: 180_000,   i: "4,00%",  ii: "4,50%",  iii: "6,00%",  iv: "4,50%",  v: "15,50%" },
  { de: 180_001,   ate: 360_000,   i: "7,30%",  ii: "7,80%",  iii: "11,20%", iv: "9,00%",  v: "18,00%" },
  { de: 360_001,   ate: 720_000,   i: "9,50%",  ii: "10,00%", iii: "13,50%", iv: "10,20%", v: "19,50%" },
  { de: 720_001,   ate: 1_800_000, i: "10,70%", ii: "11,20%", iii: "16,00%", iv: "14,00%", v: "20,50%" },
  { de: 1_800_001, ate: 3_600_000, i: "14,30%", ii: "14,70%", iii: "21,00%", iv: "22,00%", v: "23,00%" },
  { de: 3_600_001, ate: 4_800_000, i: "19,00%", ii: "30,00%", iii: "33,00%", iv: "33,00%", v: "30,50%" },
];

const FAIXAS_DEDUCAO = [
  { i: 0,       ii: 0,       iii: 0,       iv: 0,       v: 0 },
  { i: 5_940,   ii: 5_940,   iii: 9_360,   iv: 8_100,   v: 4_500 },
  { i: 13_860,  ii: 13_860,  iii: 17_640,  iv: 12_420,  v: 9_900 },
  { i: 22_500,  ii: 22_500,  iii: 35_640,  iv: 39_780,  v: 17_100 },
  { i: 87_300,  ii: 85_500,  iii: 125_640, iv: 183_780, v: 62_100 },
  { i: 378_000, ii: 720_000, iii: 648_000, iv: 828_000, v: 540_000 },
];

const ANEXO_INFO: Record<string, { nome: string; descricao: string; exemplos: string; cor: string; corBg: string }> = {
  "I":   { nome: "Comércio",    descricao: "Comércio em geral",                        exemplos: "Lojas, supermercados, pet shops, farmácias, papelarias",                           cor: "text-blue-400",   corBg: "bg-blue-500/10 border-blue-500/30" },
  "II":  { nome: "Indústria",   descricao: "Indústria e fabricação",                   exemplos: "Confecções, gráficas, fábricas, marcenarias, padarias com produção",              cor: "text-purple-400", corBg: "bg-purple-500/10 border-purple-500/30" },
  "III": { nome: "Serviços I",  descricao: "Serviços com menor carga tributária",      exemplos: "Academias, agências de viagem, instalação, manutenção, representação comercial", cor: "text-green-400",  corBg: "bg-green-500/10 border-green-500/30" },
  "IV":  { nome: "Serviços II", descricao: "Serviços de construção e limpeza",         exemplos: "Construção civil, limpeza, vigilância, mão-de-obra sem CPP",                      cor: "text-orange-400", corBg: "bg-orange-500/10 border-orange-500/30" },
  "V":   { nome: "Serviços III",descricao: "Serviços com maior especialização",        exemplos: "TI, medicina, arquitetura, advocacia, engenharia, publicidade",                   cor: "text-red-400",    corBg: "bg-red-500/10 border-red-500/30" },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRLInput(str: string): number {
  if (!str) return 0;
  const digits = str.replace(/\D/g, "");
  return parseFloat(digits) / 100 || 0;
}

function maskBRL(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const num = parseInt(digits, 10);
  const brl = (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "R$ " + brl;
}

function getFaixaIndex(fat: number): number {
  return FAIXAS_SIMPLES.findIndex(f => fat >= f.de && fat <= f.ate);
}

function calcularAliquota(fat: number, anexo: string): { aliquota: string; das: string; faixaIdx: number } {
  if (!fat || !anexo) return { aliquota: "—", das: "—", faixaIdx: -1 };
  const idx = getFaixaIndex(fat);
  if (idx < 0) return { aliquota: "—", das: "—", faixaIdx: -1 };
  const key = anexo.toLowerCase() as keyof typeof FAIXAS_SIMPLES[0];
  const nominalStr = FAIXAS_SIMPLES[idx][key] as string;
  if (!nominalStr) return { aliquota: "—", das: "—", faixaIdx: -1 };
  const nominal = parseFloat(nominalStr.replace(",", ".")) / 100;
  const deducao = FAIXAS_DEDUCAO[idx][key as keyof typeof FAIXAS_DEDUCAO[0]] as number;
  const efetiva = ((fat * nominal - deducao) / fat) * 100;
  return {
    aliquota: efetiva.toFixed(2).replace(".", ",") + "%",
    das: formatBRL((fat * nominal - deducao) / 12),
    faixaIdx: idx,
  };
}

// Normalize legacy string values → slug keys
function normalizeRegime(r?: string): string {
  if (!r) return "";
  const map: Record<string, string> = {
    "simples nacional":  "simples_nacional",
    "mei":               "mei",
    "lucro presumido":   "lucro_presumido",
    "lucro real":        "lucro_real",
    "lucro arbitrado":   "lucro_arbitrado",
    "imune / isento":    "imune_isento",
    "imune":             "imune_isento",
    "isento":            "imune_isento",
    "autônomo / pf":     "autonomo_pf",
    "autônomo":          "autonomo_pf",
  };
  return map[r.toLowerCase()] ?? r;
}

const BASE_URL = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiFetchCnpj(cnpj: string) {
  const r = await fetch(`${BASE_URL}/api/receita/cnpj/${cnpj}`, { headers: { "Content-Type": "application/json" } });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
  return r.json();
}

// ─────────────────────────────────────────────
// CNAE / REGIME PREVIDENCIÁRIO
// ─────────────────────────────────────────────
interface CnaeInfo {
  cnaePrincipalCodigo: string;
  cnaePrincipalDescricao: string;
  cnaesSecundarios: Array<{ codigo: string; descricao: string }>;
  simplesOptante: boolean | null;
  simplesDataOpcao: string | null;
  simplesDataExclusao: string | null;
  meiOptante: boolean | null;
  meiDataOpcao: string | null;
}

// CPRB — Desoneração da Folha (Lei 12.546/2011 e alterações)
// Setores que podem optar por CPRB em vez de 20% CPP
const CPRB_SETORES: Array<{ prefixos: number[]; label: string; aliquota: string }> = [
  { prefixos: [6201,6202,6203,6204,6209,6311,6319,6399], label: "Tecnologia da Informação / TIC", aliquota: "4,5%" },
  { prefixos: [8220],                                      label: "Call Center",                   aliquota: "3,0%" },
  { prefixos: [4110,4120,4211,4212,4213,4221,4222,4223,4291,4292,4299,4311,4312,4313,4319,4321,4322,4329,4330,4391,4392,4399], label: "Construção Civil",   aliquota: "4,5%" },
  { prefixos: [1311,1312,1313,1314,1321,1322,1323,1330,1340,1351,1352,1353,1354,1359,1411,1412,1413,1414,1421,1422],          label: "Têxtil e Vestuário", aliquota: "1,0%" },
  { prefixos: [1521,1529,1531,1532,1533,1539,1541,1542],                                                                       label: "Calçados",           aliquota: "1,0%" },
  { prefixos: [5911,5912,5913,5914,5919,5920],                                                                                  label: "Cinema e Áudio",     aliquota: "1,0%" },
  { prefixos: [4711,4712,4713],                                                                                                  label: "Varejo de Alimentos","aliquota": "1,0%" },
];

function detectarCPRB(cnaeCodigo: string): { elegivel: boolean; setor: string; aliquota: string } {
  const cod = parseInt(cnaeCodigo.replace(/\D/g, ""), 10);
  if (!cod) return { elegivel: false, setor: "", aliquota: "" };
  for (const setor of CPRB_SETORES) {
    if (setor.prefixos.includes(cod)) return { elegivel: true, setor: setor.label, aliquota: setor.aliquota };
  }
  return { elegivel: false, setor: "", aliquota: "" };
}

function PanelCNAE({ cnaeInfo, loadingRF, onConsultar, cnpjValido }: {
  cnaeInfo: CnaeInfo | null; loadingRF: boolean; onConsultar: () => void; cnpjValido: boolean;
}) {
  const cprb = cnaeInfo ? detectarCPRB(cnaeInfo.cnaePrincipalCodigo) : null;

  return (
    <div className="space-y-4">
      {/* CNAE Principal */}
      <SectionCollapse title="CNAE — Classificação Nacional de Atividades Econômicas" icon={<Layers className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-secondary/20 rounded-xl border border-border/30 p-3.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
            <span className="text-[11px] text-muted-foreground">
              O CNAE é obtido diretamente da Receita Federal via CNPJ. Clique em "Consultar Receita Federal" para atualizar.
            </span>
          </div>

          {cnaeInfo ? (
            <div className="space-y-3">
              {/* CNAE Principal */}
              <div className="rounded-lg border border-border/40 bg-secondary/20 p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">CNAE Principal</p>
                <p className="text-sm font-bold font-mono text-primary">{cnaeInfo.cnaePrincipalCodigo}</p>
                <p className="text-sm mt-0.5">{cnaeInfo.cnaePrincipalDescricao}</p>
              </div>

              {/* CNAEs Secundários */}
              {cnaeInfo.cnaesSecundarios.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">CNAEs Secundários</p>
                  {cnaeInfo.cnaesSecundarios.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border/30 bg-secondary/10 px-3 py-2 flex items-start gap-2">
                      <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5">{c.codigo}</span>
                      <span className="text-xs">{c.descricao}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">CNAE não carregado</p>
              <p className="text-xs">Consulte a Receita Federal para obter o CNAE atualizado</p>
            </div>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={onConsultar} disabled={loadingRF || !cnpjValido} className="gap-2">
            {loadingRF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Consultar Receita Federal
          </Button>
        </div>
      </SectionCollapse>

      {/* Regime Previdenciário */}
      <SectionCollapse title="Regime Previdenciário Patronal" icon={<Shield className="w-4 h-4" />}>
        <div className="space-y-3">
          {/* CPP Padrão */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <p className="text-sm font-semibold text-blue-300">CPP — Contribuição Patronal Previdenciária (Regime Padrão)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-background/60 rounded-lg border border-border/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">INSS Patronal</p>
                <p className="font-bold text-base text-blue-300">20%</p>
                <p className="text-[10px] text-muted-foreground">sobre folha</p>
              </div>
              <div className="bg-background/60 rounded-lg border border-border/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">RAT (acidente)</p>
                <p className="font-bold text-base text-amber-300">1%–3%</p>
                <p className="text-[10px] text-muted-foreground">grau de risco</p>
              </div>
              <div className="bg-background/60 rounded-lg border border-border/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Terceiros (SESI/SESC…)</p>
                <p className="font-bold text-base text-violet-300">~5,8%</p>
                <p className="text-[10px] text-muted-foreground">varia por setor</p>
              </div>
              <div className="bg-background/60 rounded-lg border border-border/30 p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Total Estimado</p>
                <p className="font-bold text-base text-red-300">~27%</p>
                <p className="text-[10px] text-muted-foreground">sobre a folha</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Além do INSS do empregado (7,5% a 14%), FGTS (8%) e 13º/férias proporcionais.
            </p>
          </div>

          {/* CPRB — se elegível */}
          {cprb?.elegivel && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">CPRB — Desoneração da Folha (possível opção)</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                O CNAE principal <strong>{cnaeInfo?.cnaePrincipalCodigo}</strong> pertence ao setor de <strong>{cprb.setor}</strong>,
                que pode ser elegível à CPRB (Contribuição Previdenciária sobre Receita Bruta) em substituição ao CPP de 20%.
              </p>
              <div className="flex items-center gap-3">
                <div className="bg-background/60 rounded-lg border border-emerald-500/30 px-4 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Alíquota CPRB</p>
                  <p className="font-bold text-xl text-emerald-300">{cprb.aliquota}</p>
                  <p className="text-[10px] text-muted-foreground">sobre receita bruta</p>
                </div>
                <p className="text-[11px] text-muted-foreground flex-1">
                  A CPRB substitui os 20% CPP mas mantém RAT e contribuições de terceiros.
                  Verifique com o contador a conveniência da opção. Lei 12.546/2011 e alterações.
                </p>
              </div>
            </div>
          )}

          {/* Regimes especiais */}
          <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
            <p className="text-xs font-semibold mb-2">Isenções e Regimes Especiais</p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <p><span className="text-sky-300 font-medium">MEI:</span> Contribuição fixa DAS mensal (INSS incluso). Sem CPP adicional se sem empregado.</p>
              <p><span className="text-emerald-300 font-medium">Simples Nacional:</span> INSS patronal incluído na guia DAS para maioria dos anexos (exceto Anexo IV).</p>
              <p><span className="text-slate-300 font-medium">Imune/Isento:</span> Entidades sem fins lucrativos podem ter redução ou isenção (verificar cada caso).</p>
            </div>
          </div>
        </div>
      </SectionCollapse>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function SectionCollapse({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pt-3 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function StatCard({ label, value, sub, cor }: { label: string; value: string; sub?: string; cor: string }) {
  return (
    <div className="bg-secondary/30 rounded-xl p-4 text-center border border-border/30">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-xl ${cor}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function TributoCard({ tributo, aliquota, base, obs, cor }: {
  tributo: string; aliquota: string; base: string; obs: string; cor: string;
}) {
  return (
    <div className="bg-secondary/20 rounded-lg border border-border/30 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-bold text-sm ${cor}`}>{tributo}</span>
        <span className={`text-sm font-semibold ${cor}`}>{aliquota}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Base: {base}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{obs}</p>
    </div>
  );
}

function ObrigacaoCard({ nome, desc, cor }: { nome: string; desc: string; cor: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cor}`}>
      <p className="font-semibold text-xs">{nome}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// REGIME PANELS
// ─────────────────────────────────────────────

function PanelSimples({ form, setField, cnpj, loadingSimples, onConsultar }: {
  form: FiscalData; setField: (k: keyof FiscalData, v: string) => void;
  cnpj: string; loadingSimples: boolean; onConsultar: () => void;
}) {
  const fat = parseBRLInput(form.faturamentoAnual);
  const calc = calcularAliquota(fat, form.anexoSimples);
  const pctUsado = fat > 0 ? Math.min((fat / LIMITE_SIMPLES) * 100, 100) : 0;
  const anexoInfo = ANEXO_INFO[form.anexoSimples];

  return (
    <div className="space-y-4">
      {/* Situação RF */}
      <SectionCollapse title="Situação no Simples Nacional" icon={<CheckCircle className="w-4 h-4" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Optante pelo Simples</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-secondary/50 border border-border/40">
                {form.optanteSimples
                  ? <><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /><span className="text-sm font-medium">{form.optanteSimples}</span></>
                  : <span className="text-sm text-muted-foreground">—</span>
                }
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-secondary/50 border border-border/40">
                <span className="text-sm">{form.situacaoSimples || "—"}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data da Opção</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-secondary/50 border border-border/40 font-mono">
                <span className="text-sm">{form.dataOpcaoSimples || "—"}</span>
              </div>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onConsultar}
            disabled={loadingSimples || !cnpj} className="gap-2">
            {loadingSimples
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar da Receita Federal
          </Button>
        </div>
      </SectionCollapse>

      {/* Faturamento */}
      <SectionCollapse title="Faturamento e Cálculo da Alíquota" icon={<DollarSign className="w-4 h-4" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Faturamento Anual — RBT12</Label>
              <Input
                value={form.faturamentoAnual}
                onChange={e => setField("faturamentoAnual", maskBRL(e.target.value))}
                className="bg-background font-mono"
                placeholder="R$ 0,00"
                inputMode="numeric"
              />
              <p className="text-[10px] text-muted-foreground">Receita bruta total dos últimos 12 meses</p>
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

          {fat > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Utilização do limite Simples Nacional</span>
                <span className={`font-semibold ${pctUsado >= 90 ? "text-red-400" : pctUsado >= 70 ? "text-amber-400" : "text-green-400"}`}>
                  {pctUsado.toFixed(1)}% — {formatBRL(fat)}
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pctUsado >= 90 ? "bg-red-500" : pctUsado >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${pctUsado}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>R$ 0</span>
                <span>Limite: {formatBRL(LIMITE_SIMPLES)}</span>
              </div>
              {pctUsado >= 90 && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Empresa próxima do limite. Avalie o enquadramento no Lucro Presumido.
                </div>
              )}
            </div>
          )}

          {fat > 0 && form.anexoSimples && calc.faixaIdx >= 0 && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Faixa" value={`${calc.faixaIdx + 1}ª`} cor="text-primary" />
              <StatCard label="Alíquota Efetiva" value={calc.aliquota} cor="text-emerald-400" />
              <StatCard label="DAS Estimado/mês" value={calc.das} cor="text-amber-400" />
            </div>
          )}
        </div>
      </SectionCollapse>

      {/* Tabela do Anexo */}
      {anexoInfo && (
        <SectionCollapse title={`Tabela Anexo ${form.anexoSimples} — ${anexoInfo.nome}`} icon={<FileText className="w-4 h-4" />}>
          <div className="space-y-3">
            <div className={`rounded-lg border px-3 py-2.5 ${anexoInfo.corBg}`}>
              <p className={`text-xs font-semibold ${anexoInfo.cor}`}>{anexoInfo.descricao}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{anexoInfo.exemplos}</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40">
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Faixa</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Receita Bruta (12 meses)</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Alíquota Nominal</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Valor a Deduzir</th>
                  </tr>
                </thead>
                <tbody>
                  {FAIXAS_SIMPLES.map((f, idx) => {
                    const key = form.anexoSimples.toLowerCase() as keyof typeof f;
                    const dedKey = form.anexoSimples.toLowerCase() as keyof typeof FAIXAS_DEDUCAO[0];
                    const isCurrent = calc.faixaIdx === idx;
                    return (
                      <tr key={idx} className={`border-b border-border/30 last:border-0 ${isCurrent ? "bg-primary/10" : "hover:bg-secondary/20"}`}>
                        <td className="px-3 py-2.5 font-semibold">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${isCurrent ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{formatBRL(f.de)} — {formatBRL(f.ate)}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${isCurrent ? "text-primary" : ""}`}>{String(f[key] ?? "—")}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono">{formatBRL(FAIXAS_DEDUCAO[idx][dedKey] as number)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * Alíquota Efetiva = (RBT12 × Alíquota Nominal − Valor a Deduzir) ÷ RBT12 · Fonte: LC 123/2006
            </p>
          </div>
        </SectionCollapse>
      )}

      {/* Obrigações */}
      <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObrigacaoCard nome="PGDAS-D" desc="Geração do DAS — mensal, até o dia 20 do mês seguinte" cor="bg-blue-500/10 text-blue-400 border-blue-500/20" />
          <ObrigacaoCard nome="DASN" desc="Declaração Anual do Simples Nacional — até 31/05 do ano seguinte" cor="bg-green-500/10 text-green-400 border-green-500/20" />
          <ObrigacaoCard nome="DEFIS" desc="Informações Socioeconômicas e Fiscais — anual, junto à DASN" cor="bg-purple-500/10 text-purple-400 border-purple-500/20" />
          <ObrigacaoCard nome="EFD-Reinf" desc="Retenções e informações previdenciárias — mensal" cor="bg-orange-500/10 text-orange-400 border-orange-500/20" />
          <ObrigacaoCard nome="Livro Caixa" desc="Escrituração simplificada obrigatória para Simples Nacional" cor="bg-teal-500/10 text-teal-400 border-teal-500/20" />
          <ObrigacaoCard nome="ISS / ICMS" desc="Declarações municipais e estaduais conforme regime do estado" cor="bg-yellow-500/10 text-yellow-400 border-yellow-500/20" />
        </div>
      </SectionCollapse>
    </div>
  );
}

function PanelMei({ form, setField, cnpj, loadingSimples, onConsultar }: {
  form: FiscalData; setField: (k: keyof FiscalData, v: string) => void;
  cnpj: string; loadingSimples: boolean; onConsultar: () => void;
}) {
  const dasMei = SALARIO_MINIMO_2024 * 0.05;

  return (
    <div className="space-y-4">
      <SectionCollapse title="Situação no Simples Nacional (MEI)" icon={<CheckCircle className="w-4 h-4" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Optante pelo MEI</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-secondary/50 border border-border/40">
                {form.optanteSimples
                  ? <><CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" /><span className="text-sm font-medium">{form.optanteSimples}</span></>
                  : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <div className="flex items-center h-9 px-3 rounded-md bg-secondary/50 border border-border/40">
                <span className="text-sm">{form.situacaoSimples || "—"}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data da Opção</Label>
              <div className="flex items-center h-9 px-3 rounded-md bg-secondary/50 border border-border/40 font-mono">
                <span className="text-sm">{form.dataOpcaoSimples || "—"}</span>
              </div>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onConsultar}
            disabled={loadingSimples || !cnpj} className="gap-2">
            {loadingSimples ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar da Receita Federal
          </Button>
        </div>
      </SectionCollapse>

      <SectionCollapse title="DAS-MEI (2024)" icon={<DollarSign className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <StatCard label="Comércio / Indústria" value={formatBRL(dasMei + 1)}   sub="INSS + ICMS R$ 1,00"     cor="text-sky-400" />
          <StatCard label="Serviços"              value={formatBRL(dasMei + 5)}   sub="INSS + ISS R$ 5,00"      cor="text-violet-400" />
          <StatCard label="Comércio + Serviços"   value={formatBRL(dasMei + 6)}   sub="INSS + ICMS + ISS"       cor="text-emerald-400" />
        </div>
        <div className="space-y-1">
          <InfoRow label="Salário Mínimo 2024"          value={formatBRL(SALARIO_MINIMO_2024)} />
          <InfoRow label="INSS (5% do salário mínimo)"  value={formatBRL(dasMei)} />
          <InfoRow label="ICMS — Comércio / Indústria"  value="R$ 1,00" />
          <InfoRow label="ISS — Serviços"               value="R$ 5,00" />
          <InfoRow label="Limite Anual"                 value={formatBRL(LIMITE_MEI)} />
          <InfoRow label="Limite Mensal"                value={formatBRL(LIMITE_MEI / 12)} />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Restrições do MEI" icon={<AlertTriangle className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-2">
          {[
            "Não pode ter sócios — empresa individual",
            "Apenas 1 funcionário empregado",
            "Não pode participar como sócio de outra empresa",
            "Não pode exercer profissões regulamentadas",
            "Faturamento máximo: R$ 81.000/ano (R$ 6.750/mês)",
            "Ultrapassando o limite: enquadramento obrigatório no Simples Nacional",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />{item}
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Acessórias MEI" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObrigacaoCard nome="DAS-MEI"                 desc="Pagamento mensal até o dia 20"                          cor="bg-sky-500/10 text-sky-400 border-sky-500/20" />
          <ObrigacaoCard nome="DASN-SIMEI"              desc="Declaração Anual — até 31/05 do ano seguinte"           cor="bg-green-500/10 text-green-400 border-green-500/20" />
          <ObrigacaoCard nome="Relatório Mensal"        desc="Relatório simplificado de receitas — substitui livro caixa" cor="bg-purple-500/10 text-purple-400 border-purple-500/20" />
          <ObrigacaoCard nome="Nota Fiscal"             desc="Obrigatória para pessoa jurídica; facultativa para PF"  cor="bg-orange-500/10 text-orange-400 border-orange-500/20" />
        </div>
      </SectionCollapse>
    </div>
  );
}

function PanelLucroPresumido() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-violet-400">Lucro Presumido</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Tributação baseada em percentuais de presunção aplicados sobre a receita bruta.
          Permitido para empresas com faturamento anual até <strong className="text-foreground">R$ 78.000.000</strong>.
        </p>
      </div>

      <SectionCollapse title="Percentuais de Presunção — IRPJ e CSLL" icon={<Percent className="w-4 h-4" />}>
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/40">
                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Atividade</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-semibold">IRPJ</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-semibold">CSLL</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Comércio em geral / Indústria",             "8%",  "12%"],
                ["Serviços hospitalares / planos de saúde",   "8%",  "12%"],
                ["Transporte de cargas",                      "8%",  "12%"],
                ["Demais transportes de passageiros",         "16%", "12%"],
                ["Serviços em geral (regra geral)",           "32%", "32%"],
                ["Intermediação de negócios",                 "32%", "32%"],
                ["Construção por empreitada c/ materiais",    "8%",  "12%"],
                ["Construção por empreitada s/ materiais",    "32%", "32%"],
                ["Loteamento, incorporação imobiliária",      "8%",  "12%"],
                ["Administração, locação de imóveis",         "32%", "32%"],
              ].map(([a, i, c], n) => (
                <tr key={n} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                  <td className="px-3 py-2">{a}</td>
                  <td className="px-3 py-2 text-right font-bold text-violet-400">{i}</td>
                  <td className="px-3 py-2 text-right font-bold text-amber-400">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCollapse>

      <SectionCollapse title="Alíquotas dos Tributos" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TributoCard tributo="IRPJ"   aliquota="15%"      base="Lucro Presumido"     obs="+ Adicional 10% sobre lucro > R$ 60k/trimestre"    cor="text-violet-400" />
          <TributoCard tributo="CSLL"   aliquota="9%"       base="Lucro Presumido"     obs="Contribuição Social sobre o Lucro Líquido"           cor="text-purple-400" />
          <TributoCard tributo="PIS"    aliquota="0,65%"    base="Faturamento bruto"   obs="Regime cumulativo"                                   cor="text-blue-400" />
          <TributoCard tributo="COFINS" aliquota="3%"       base="Faturamento bruto"   obs="Regime cumulativo"                                   cor="text-indigo-400" />
          <TributoCard tributo="INSS"   aliquota="20%"      base="Folha de pagamento"  obs="RAT + Terceiros (SENAI, SESI, SEBRAE...)"            cor="text-green-400" />
          <TributoCard tributo="ISS"    aliquota="2% a 5%"  base="Serviço prestado"    obs="Conforme município e atividade"                      cor="text-teal-400" />
          <TributoCard tributo="ICMS"   aliquota="Variável" base="Mercadorias"          obs="Conforme estado e CFOP"                             cor="text-orange-400" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Período e Prazos" icon={<Clock className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="Apuração IRPJ / CSLL" value="Trimestral (mar, jun, set, dez)" />
          <InfoRow label="Prazo de recolhimento" value="Último dia útil do mês seguinte ao trimestre" />
          <InfoRow label="PIS / COFINS"          value="Mensal — até o 25º dia do mês seguinte" />
          <InfoRow label="Limite de faturamento" value="Até R$ 78.000.000/ano" />
          <InfoRow label="Opção pelo regime"     value="Irretratável para todo o ano-calendário" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObrigacaoCard nome="ECF"              desc="Escrituração Contábil Fiscal — anual, até julho"       cor="bg-violet-500/10 text-violet-400 border-violet-500/20" />
          <ObrigacaoCard nome="ECD"              desc="Escrituração Contábil Digital — anual, até junho"      cor="bg-blue-500/10 text-blue-400 border-blue-500/20" />
          <ObrigacaoCard nome="DCTF"             desc="Declaração de débitos tributários federais — mensal"   cor="bg-green-500/10 text-green-400 border-green-500/20" />
          <ObrigacaoCard nome="EFD-Contribuições"desc="PIS/COFINS cumulativo — semestral (ou mensal)"         cor="bg-orange-500/10 text-orange-400 border-orange-500/20" />
          <ObrigacaoCard nome="SPED Fiscal"      desc="EFD-ICMS/IPI — mensal, conforme o estado"             cor="bg-teal-500/10 text-teal-400 border-teal-500/20" />
          <ObrigacaoCard nome="eSocial / REINF"  desc="Folha, retenções e informações previdenciárias"        cor="bg-pink-500/10 text-pink-400 border-pink-500/20" />
        </div>
      </SectionCollapse>
    </div>
  );
}

function PanelLucroReal() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-amber-400">Lucro Real</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Tributação com base no lucro líquido contábil ajustado. <strong className="text-foreground">Obrigatório</strong> para empresas
          com faturamento acima de R$ 78M/ano, instituições financeiras e empresas com benefícios fiscais.
        </p>
      </div>

      <SectionCollapse title="Regime de Apuração" icon={<Calculator className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="font-semibold text-xs text-amber-400">Trimestral</p>
            <p className="text-[11px] text-muted-foreground mt-1">Apuração a cada 3 meses. Lucros e prejuízos compensáveis dentro do ano.</p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="font-semibold text-xs text-blue-400">Anual (Estimativa Mensal)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Pagamentos mensais por estimativa com ajuste em dezembro. Mais flexível para compensação de prejuízos.</p>
          </div>
        </div>
      </SectionCollapse>

      <SectionCollapse title="Alíquotas dos Tributos" icon={<BarChart3 className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TributoCard tributo="IRPJ"   aliquota="15%"      base="Lucro Real"          obs="+ Adicional 10% sobre lucro > R$ 20k/mês (R$ 60k/trim)"  cor="text-amber-400" />
          <TributoCard tributo="CSLL"   aliquota="9%"       base="Lucro Real"          obs="Financeiras: 15% ou 20%"                                   cor="text-orange-400" />
          <TributoCard tributo="PIS"    aliquota="1,65%"    base="Faturamento bruto"   obs="Regime NÃO cumulativo — créditos permitidos"               cor="text-blue-400" />
          <TributoCard tributo="COFINS" aliquota="7,6%"     base="Faturamento bruto"   obs="Regime NÃO cumulativo — créditos permitidos"               cor="text-indigo-400" />
          <TributoCard tributo="INSS"   aliquota="20%"      base="Folha de pagamento"  obs="RAT + Terceiros"                                           cor="text-green-400" />
          <TributoCard tributo="ISS"    aliquota="2% a 5%"  base="Serviço prestado"    obs="Conforme município e atividade"                            cor="text-teal-400" />
          <TributoCard tributo="ICMS"   aliquota="Variável" base="Mercadorias"          obs="Conforme estado, operação e produto (NCM)"                cor="text-purple-400" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="LALUR e Controle de Prejuízos" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="Compensação de Prejuízos"  value="Até 30% do lucro de cada período" />
          <InfoRow label="Prazo de compensação"      value="Sem prazo — prejuízos fiscais não prescrevem" />
          <InfoRow label="LALUR"                     value="Livro de Apuração do Lucro Real — obrigatório" />
          <InfoRow label="Créditos PIS/COFINS"       value="Insumos, ativo imobilizado, aluguéis, energia, fretes" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Acessórias" icon={<BookOpen className="w-4 h-4" />} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObrigacaoCard nome="ECF"               desc="Escrituração Contábil Fiscal — inclui LALUR digital"     cor="bg-amber-500/10 text-amber-400 border-amber-500/20" />
          <ObrigacaoCard nome="ECD"               desc="Escrituração Contábil Digital — balanço e razão"         cor="bg-blue-500/10 text-blue-400 border-blue-500/20" />
          <ObrigacaoCard nome="DCTF Mensal"       desc="Declaração mensal de débitos tributários federais"       cor="bg-green-500/10 text-green-400 border-green-500/20" />
          <ObrigacaoCard nome="EFD-Contribuições" desc="PIS/COFINS não-cumulativo — mensal"                      cor="bg-orange-500/10 text-orange-400 border-orange-500/20" />
          <ObrigacaoCard nome="SPED Fiscal"       desc="EFD-ICMS/IPI e outros módulos — mensal"                 cor="bg-teal-500/10 text-teal-400 border-teal-500/20" />
          <ObrigacaoCard nome="eSocial + REINF"   desc="Folha, retenções e informações previdenciárias"          cor="bg-pink-500/10 text-pink-400 border-pink-500/20" />
          <ObrigacaoCard nome="Balancete Mensal"  desc="Obrigatório no regime de estimativa anual (ajuste dez)"  cor="bg-violet-500/10 text-violet-400 border-violet-500/20" />
        </div>
      </SectionCollapse>
    </div>
  );
}

function PanelLucroArbitrado() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-red-400">Lucro Arbitrado</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Forma de apuração aplicada quando não é possível determinar o lucro real ou presumido. Percentuais majorados sobre a receita bruta.
        </p>
      </div>

      <SectionCollapse title="Situações de Arbitramento" icon={<AlertTriangle className="w-4 h-4" />}>
        <div className="space-y-2">
          {[
            "Escrituração contábil não mantida ou extraviada",
            "Livros fiscais sem autenticação pelo Fisco",
            "Ausência de balancetes mensais no lucro real por estimativa",
            "Recusa de exibição de livros e documentos fiscais",
            "Omissão de receitas ou declarações com fraude",
            "Empresa optante pelo lucro presumido sem escrituração de caixa",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />{item}
            </div>
          ))}
        </div>
      </SectionCollapse>

      <SectionCollapse title="Percentuais de Arbitramento — IRPJ" icon={<Percent className="w-4 h-4" />}>
        <p className="text-[11px] text-muted-foreground mb-3">Percentuais do Lucro Presumido acrescidos de 20%:</p>
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/40">
                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Atividade</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-semibold">IRPJ Arbitrado</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Comércio / Indústria",                "9,6%"],
                ["Transporte de cargas",                "9,6%"],
                ["Demais transportes",                  "19,2%"],
                ["Serviços em geral",                   "38,4%"],
                ["Intermediação de negócios",           "38,4%"],
                ["Construção c/ fornecimento materiais","9,6%"],
              ].map(([a, p], i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                  <td className="px-3 py-2">{a}</td>
                  <td className="px-3 py-2 text-right font-bold text-red-400">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCollapse>
    </div>
  );
}

function PanelImuneIsento() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-3">
        <p className="text-xs font-semibold text-slate-300">Imune / Isento</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Entidades sem fins lucrativos com imunidade tributária por força da Constituição Federal (art. 150, VI) ou legislação infraconstitucional.
        </p>
      </div>

      <SectionCollapse title="Tipos de Entidades" icon={<BookOpen className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObrigacaoCard nome="Associações e Fundações"    desc="Imunidade nas finalidades estatutárias"                          cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          <ObrigacaoCard nome="Entidades Religiosas"       desc="Cultos de qualquer crença — imunidade ampla"                     cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          <ObrigacaoCard nome="Partidos Políticos"         desc="Imunidade sobre patrimônio, renda e serviços"                    cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          <ObrigacaoCard nome="Educação / Assistência Social" desc="Sem fins lucrativos com requisitos do art. 14 CTN"             cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          <ObrigacaoCard nome="Sindicatos de Trabalhadores"desc="Imunidade nas atividades sindicais"                              cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
          <ObrigacaoCard nome="OSCIP / OS"                 desc="Organizações qualificadas pelo Ministério da Justiça"            cor="bg-slate-500/10 text-slate-300 border-slate-500/20" />
        </div>
      </SectionCollapse>

      <SectionCollapse title="Obrigações Mantidas" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
        <div className="space-y-1">
          <InfoRow label="IRPJ / CSLL"          value="Imunes ou isentas conforme art. 12/13 da Lei 9.532/97" />
          <InfoRow label="PIS / COFINS"          value="Alíquota 0% ou isenção — verificar legislação específica" />
          <InfoRow label="Folha de pagamento"    value="INSS normal — sem isenção sobre remunerações" />
          <InfoRow label="EFD-Reinf"             value="Obrigatória para retenções sobre serviços" />
          <InfoRow label="DIRF"                  value="Declaração de rendimentos pagos — obrigatória" />
          <InfoRow label="Escrituração contábil" value="Exigida mesmo sendo imune — art. 14 CTN" />
        </div>
      </SectionCollapse>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const REGIME_META: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  simples_nacional: { label: "Simples Nacional",  cor: "text-emerald-400", icon: <TrendingUp className="w-4 h-4" /> },
  mei:              { label: "MEI",               cor: "text-sky-400",     icon: <Building2 className="w-4 h-4" /> },
  lucro_presumido:  { label: "Lucro Presumido",   cor: "text-violet-400",  icon: <BarChart3 className="w-4 h-4" /> },
  lucro_real:       { label: "Lucro Real",        cor: "text-amber-400",   icon: <Calculator className="w-4 h-4" /> },
  lucro_arbitrado:  { label: "Lucro Arbitrado",   cor: "text-red-400",     icon: <AlertTriangle className="w-4 h-4" /> },
  imune_isento:     { label: "Imune / Isento",    cor: "text-slate-300",   icon: <BookOpen className="w-4 h-4" /> },
};

export function TabFiscal({ clienteId, cnpj, atividadePrincipal, initialData, onSave, isSaving }: TabFiscalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<FiscalData>({
    regimeTributario: normalizeRegime(initialData.regimeTributario),
    faturamentoAnual:  initialData.faturamentoAnual  || "",
    faturamentoMes:    initialData.faturamentoMes    || "",
    anexoSimples:      initialData.anexoSimples      || "",
    dasValorMensal:    initialData.dasValorMensal    || "",
    optanteSimples:    initialData.optanteSimples    || "",
    situacaoSimples:   initialData.situacaoSimples   || "",
    dataOpcaoSimples:  initialData.dataOpcaoSimples  || "",
    regimeFiscalObs:   initialData.regimeFiscalObs   || "",
    aliquotaEfetiva:   initialData.aliquotaEfetiva   || "",
  });

  const [loadingRF, setLoadingRF] = useState(false);
  const [cnaeInfo, setCnaeInfo] = useState<CnaeInfo | null>(null);
  const hasAutoFetched = useRef(false);

  const regime = form.regimeTributario;
  const isSimples = regime === "simples_nacional";
  const isMei = regime === "mei";
  const cnpjLimpo = (cnpj || "").replace(/\D/g, "");
  const cnpjValido = cnpjLimpo.length === 14;

  function setField(key: keyof FiscalData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Auto-fetch on mount whenever CNPJ is available
  useEffect(() => {
    if (!cnpjValido || hasAutoFetched.current) return;
    hasAutoFetched.current = true;
    consultarRF();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpjValido]);

  async function consultarRF() {
    if (!cnpjValido) { toast({ title: "CNPJ não informado ou inválido", variant: "destructive" }); return; }
    setLoadingRF(true);
    try {
      const data = await apiFetchCnpj(cnpjLimpo);

      // --- CNAE ---
      setCnaeInfo({
        cnaePrincipalCodigo:  String(data.cnaePrincipalCodigo || ""),
        cnaePrincipalDescricao: String(data.cnaePrincipalDescricao || ""),
        cnaesSecundarios: Array.isArray(data.cnaesSecundarios) ? data.cnaesSecundarios : [],
        simplesOptante:     data.simplesOptante ?? null,
        simplesDataOpcao:   data.simplesDataOpcao ?? null,
        simplesDataExclusao: data.simplesDataExclusao ?? null,
        meiOptante:         data.meiOptante ?? null,
        meiDataOpcao:       data.meiDataOpcao ?? null,
      });

      // --- Simples / MEI ---
      const optante = data.simplesOptante;
      const meiOpt  = data.meiOptante;
      if (isSimples && optante !== null && optante !== undefined) {
        const opt = optante ? "Sim" : "Não";
        const situacao = optante ? "Ativo" : (data.simplesDataExclusao ? "Excluído" : "Não optante");
        const dataOpcao = String(data.simplesDataOpcao || "").split("T")[0];
        setForm(f => ({ ...f, optanteSimples: opt, situacaoSimples: situacao, dataOpcaoSimples: dataOpcao }));
      } else if (isMei && meiOpt !== null && meiOpt !== undefined) {
        const opt = meiOpt ? "Sim" : "Não";
        const situacao = meiOpt ? "Ativo" : "Não optante MEI";
        const dataOpcao = String(data.meiDataOpcao || data.simplesDataOpcao || "").split("T")[0];
        setForm(f => ({ ...f, optanteSimples: opt, situacaoSimples: situacao, dataOpcaoSimples: dataOpcao }));
      }

      toast({ title: "Dados atualizados da Receita Federal" });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao consultar Receita Federal", variant: "destructive" });
    } finally {
      setLoadingRF(false);
    }
  }

  async function handleSave() {
    try {
      const fat = parseBRLInput(form.faturamentoAnual);
      const calc = calcularAliquota(fat, form.anexoSimples);
      await onSave({ ...form, aliquotaEfetiva: isSimples ? calc.aliquota : "" });
      toast({ title: "Dados fiscais salvos" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  }

  const meta = regime ? REGIME_META[regime] : null;

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* Regime badge (read-only — set in Dados tab) */}
      <Card className="bg-card border-border/50">
        <CardContent className="px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {meta ? (
                <>
                  <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center">
                    <span className={meta.cor}>{meta.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Regime Tributário</p>
                    <p className={`font-bold text-base ${meta.cor}`}>{meta.label}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-medium">Regime tributário não definido</p>
                    <p className="text-xs">Acesse a aba <strong>Dados</strong> e selecione o regime tributário.</p>
                  </div>
                </div>
              )}
            </div>

            {meta && (
              <Button type="button" onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Salvar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CNAE + Regime Previdenciário — visible for all regimes when CNPJ is set */}
      {(cnpjValido || cnaeInfo) && (
        <PanelCNAE cnaeInfo={cnaeInfo} loadingRF={loadingRF} onConsultar={consultarRF} cnpjValido={cnpjValido} />
      )}

      {/* Regime-specific panel */}
      {regime === "simples_nacional" && (
        <PanelSimples form={form} setField={setField} cnpj={cnpj} loadingSimples={loadingRF} onConsultar={consultarRF} />
      )}
      {regime === "mei" && (
        <PanelMei form={form} setField={setField} cnpj={cnpj} loadingSimples={loadingRF} onConsultar={consultarRF} />
      )}
      {regime === "lucro_presumido"  && <PanelLucroPresumido />}
      {regime === "lucro_real"       && <PanelLucroReal />}
      {regime === "lucro_arbitrado"  && <PanelLucroArbitrado />}
      {regime === "imune_isento"     && <PanelImuneIsento />}

      {/* Observações — only when regime is set */}
      {meta && (
        <Card className="bg-card border-border/50">
          <CardContent className="px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Observações Fiscais</span>
            </div>
            <Textarea
              value={form.regimeFiscalObs}
              onChange={e => setField("regimeFiscalObs", e.target.value)}
              className="bg-background min-h-[80px] text-sm"
              placeholder="Observações específicas sobre este cliente, regime, particularidades..."
            />
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      {meta && (
        <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground bg-secondary/20 rounded-xl border border-border/30 p-3.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
          <span>
            Informações baseadas na legislação vigente (LC 123/2006, RIR/2018, Lei 9.430/96). Tabelas de referência para 2024.
            Consulte sempre a legislação atualizada antes de tomar decisões tributárias.
          </span>
        </div>
      )}
    </div>
  );
}
