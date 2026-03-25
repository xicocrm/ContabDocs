import { useState, useEffect, useRef } from "react";
import { formatters } from "@/lib/formatters";
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
  Calculator, AlertTriangle, DollarSign, Building2, Percent, Layers,
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

const RAT_GRAU: Record<string, { grau: number; rat: number; desc: string }> = {
  "01":{grau:3,rat:3,desc:"Grau 3 – Agricultura"}, "02":{grau:3,rat:3,desc:"Grau 3 – Silvicultura"}, "03":{grau:3,rat:3,desc:"Grau 3 – Pesca"},
  "05":{grau:3,rat:3,desc:"Grau 3 – Extração"}, "06":{grau:3,rat:3,desc:"Grau 3 – Petróleo"}, "07":{grau:3,rat:3,desc:"Grau 3 – Mineração"},
  "08":{grau:3,rat:3,desc:"Grau 3 – Ext. minerais"}, "09":{grau:3,rat:3,desc:"Grau 3 – Apoio extração"},
  "10":{grau:2,rat:2,desc:"Grau 2 – Alimentos"}, "11":{grau:2,rat:2,desc:"Grau 2 – Bebidas"}, "12":{grau:3,rat:3,desc:"Grau 3 – Tabaco"},
  "13":{grau:2,rat:2,desc:"Grau 2 – Têxtil"}, "14":{grau:2,rat:2,desc:"Grau 2 – Confecções"}, "15":{grau:2,rat:2,desc:"Grau 2 – Couros"},
  "16":{grau:2,rat:2,desc:"Grau 2 – Madeira"}, "17":{grau:2,rat:2,desc:"Grau 2 – Papel"}, "18":{grau:2,rat:2,desc:"Grau 2 – Gráfica"},
  "19":{grau:3,rat:3,desc:"Grau 3 – Petróleo/Coque"}, "20":{grau:3,rat:3,desc:"Grau 3 – Químicos"}, "21":{grau:2,rat:2,desc:"Grau 2 – Farmacêuticos"},
  "22":{grau:2,rat:2,desc:"Grau 2 – Borracha/Plástico"}, "23":{grau:3,rat:3,desc:"Grau 3 – Min. não-metálicos"}, "24":{grau:3,rat:3,desc:"Grau 3 – Metalurgia"},
  "25":{grau:3,rat:3,desc:"Grau 3 – Produtos de metal"}, "26":{grau:2,rat:2,desc:"Grau 2 – Eletrônicos"}, "27":{grau:2,rat:2,desc:"Grau 2 – Equip. elétricos"},
  "28":{grau:3,rat:3,desc:"Grau 3 – Máquinas"}, "29":{grau:3,rat:3,desc:"Grau 3 – Veículos"}, "30":{grau:3,rat:3,desc:"Grau 3 – Transportes"},
  "31":{grau:2,rat:2,desc:"Grau 2 – Móveis"}, "32":{grau:2,rat:2,desc:"Grau 2 – Diversos"}, "33":{grau:3,rat:3,desc:"Grau 3 – Manutenção de máq."},
  "35":{grau:3,rat:3,desc:"Grau 3 – Elet/gás/vapor"}, "36":{grau:2,rat:2,desc:"Grau 2 – Água"}, "37":{grau:3,rat:3,desc:"Grau 3 – Esgoto"},
  "38":{grau:3,rat:3,desc:"Grau 3 – Resíduos"}, "39":{grau:3,rat:3,desc:"Grau 3 – Descontaminação"},
  "41":{grau:3,rat:3,desc:"Grau 3 – Construção"}, "42":{grau:3,rat:3,desc:"Grau 3 – Infraestrutura"}, "43":{grau:3,rat:3,desc:"Grau 3 – Serv. construção"},
  "45":{grau:1,rat:1,desc:"Grau 1 – Comércio veículos"}, "46":{grau:1,rat:1,desc:"Grau 1 – Atacado"}, "47":{grau:1,rat:1,desc:"Grau 1 – Varejo"},
  "49":{grau:2,rat:2,desc:"Grau 2 – Transp. terrestre"}, "50":{grau:2,rat:2,desc:"Grau 2 – Transp. aquaviário"}, "51":{grau:1,rat:1,desc:"Grau 1 – Transp. aéreo"},
  "52":{grau:2,rat:2,desc:"Grau 2 – Armazenamento"}, "53":{grau:1,rat:1,desc:"Grau 1 – Correios"},
  "55":{grau:1,rat:1,desc:"Grau 1 – Alojamento"}, "56":{grau:1,rat:1,desc:"Grau 1 – Alimentação"},
  "58":{grau:1,rat:1,desc:"Grau 1 – Edição"}, "59":{grau:1,rat:1,desc:"Grau 1 – Cinema/Áudio"}, "60":{grau:1,rat:1,desc:"Grau 1 – Rádio/TV"},
  "61":{grau:1,rat:1,desc:"Grau 1 – Telecom"}, "62":{grau:1,rat:1,desc:"Grau 1 – TI/Software"}, "63":{grau:1,rat:1,desc:"Grau 1 – Informação"},
  "64":{grau:1,rat:1,desc:"Grau 1 – Financeiro"}, "65":{grau:1,rat:1,desc:"Grau 1 – Seguros"}, "66":{grau:1,rat:1,desc:"Grau 1 – Aux. financeiro"},
  "68":{grau:1,rat:1,desc:"Grau 1 – Imóveis"},
  "69":{grau:1,rat:1,desc:"Grau 1 – Jurídico/Contab."}, "70":{grau:1,rat:1,desc:"Grau 1 – Gestão"}, "71":{grau:1,rat:1,desc:"Grau 1 – Engenharia"},
  "72":{grau:1,rat:1,desc:"Grau 1 – P&D"}, "73":{grau:1,rat:1,desc:"Grau 1 – Publicidade"}, "74":{grau:1,rat:1,desc:"Grau 1 – Profissional"},
  "75":{grau:1,rat:1,desc:"Grau 1 – Veterinária"},
  "77":{grau:1,rat:1,desc:"Grau 1 – Locação"}, "78":{grau:1,rat:1,desc:"Grau 1 – RH"}, "79":{grau:1,rat:1,desc:"Grau 1 – Viagens"},
  "80":{grau:1,rat:1,desc:"Grau 1 – Vigilância"}, "81":{grau:2,rat:2,desc:"Grau 2 – Limpeza"}, "82":{grau:1,rat:1,desc:"Grau 1 – Administrativos"},
  "84":{grau:1,rat:1,desc:"Grau 1 – Adm. pública"}, "85":{grau:1,rat:1,desc:"Grau 1 – Educação"},
  "86":{grau:1,rat:1,desc:"Grau 1 – Saúde"}, "87":{grau:2,rat:2,desc:"Grau 2 – Resid. saúde"}, "88":{grau:1,rat:1,desc:"Grau 1 – Serv. sociais"},
  "90":{grau:1,rat:1,desc:"Grau 1 – Artes"}, "91":{grau:1,rat:1,desc:"Grau 1 – Museus"}, "92":{grau:1,rat:1,desc:"Grau 1 – Jogos"}, "93":{grau:1,rat:1,desc:"Grau 1 – Esporte"},
  "94":{grau:1,rat:1,desc:"Grau 1 – Associações"}, "95":{grau:1,rat:1,desc:"Grau 1 – Manutenção pessoal"}, "96":{grau:1,rat:1,desc:"Grau 1 – Serv. pessoais"},
};
interface FpasEntry { fpas: string; descricao: string; entidades: { entidade: string; aliquota: number }[] }
const FPAS_TABLE: { prefixes: string[]; entry: FpasEntry }[] = [
  { prefixes:["41","42","43"], entry:{ fpas:"655", descricao:"Construção civil", entidades:[{entidade:"SESI",aliquota:1.5},{entidade:"SENAI",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Sal. Educação",aliquota:2.5}] } },
  { prefixes:["49","50","52","53"], entry:{ fpas:"868", descricao:"Transporte", entidades:[{entidade:"SEST",aliquota:1.5},{entidade:"SENAT",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Sal. Educação",aliquota:2.5}] } },
  { prefixes:["01","02","03"], entry:{ fpas:"604", descricao:"Agropecuária", entidades:[{entidade:"SENAR",aliquota:2.5},{entidade:"INCRA",aliquota:0.2},{entidade:"Sal. Educação",aliquota:2.5}] } },
  { prefixes:["64","65","66"], entry:{ fpas:"574", descricao:"Financeiro", entidades:[{entidade:"INCRA",aliquota:0.2},{entidade:"Sal. Educação",aliquota:2.5},{entidade:"SEBRAE",aliquota:0.6}] } },
  { prefixes:["10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","05","06","07","08","09","35","36","37","38","39"],
    entry:{ fpas:"507", descricao:"Indústria", entidades:[{entidade:"SESI",aliquota:1.5},{entidade:"SENAI",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Sal. Educação",aliquota:2.5}] } },
];
const FPAS_DEFAULT: FpasEntry = { fpas:"515", descricao:"Comércio e serviços", entidades:[{entidade:"SESC",aliquota:1.5},{entidade:"SENAC",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Sal. Educação",aliquota:2.5}] };
const CPRB_SETORES_RICH: { ids: string[]; descricao: string; aliquota: number; exemplo: string }[] = [
  { ids:["6201","6202","6203","6204","6209","6311","6319","6399"], descricao:"TI / Tecnologia da Informação", aliquota:4.5, exemplo:"Desenvolvimento de software, consultorias de TI" },
  { ids:["1811","1812","1813","1821","1822"], descricao:"Serviços gráficos", aliquota:2.5, exemplo:"Edição, impressão, acabamento gráfico" },
  { ids:["1412","1421","1422","1531","1532","1533"], descricao:"Confecção/calçados", aliquota:1.0, exemplo:"Confecção de roupas e calçados" },
  { ids:["4110","4120","4211","4212","4213","4221","4222","4223","4291","4292","4299","4311","4312","4313","4319","4321","4322","4329","4330","4391","4392","4399"], descricao:"Construção Civil", aliquota:4.5, exemplo:"Edifícios, obras de infraestrutura" },
  { ids:["5611","5612","5620"], descricao:"Restaurantes e alimentação", aliquota:2.5, exemplo:"Restaurantes, bares, serviços de alimentação" },
  { ids:["5911","5912","5913","5914","5920"], descricao:"Audiovisual/Cinema", aliquota:1.0, exemplo:"Produção, distribuição de filmes" },
  { ids:["7311","7312","7319","7320"], descricao:"Publicidade e propaganda", aliquota:2.5, exemplo:"Agências de publicidade" },
  { ids:["8220"], descricao:"Call Center", aliquota:3.0, exemplo:"Centrais de atendimento" },
  { ids:["8511","8512","8513","8520","8531","8532","8541","8542","8550"], descricao:"Educação", aliquota:2.5, exemplo:"Ensino pré-escolar até superior" },
];
function getRatEntry(cnae: string) {
  const prefix = String(cnae).replace(/\D/g,"").substring(0,2);
  return RAT_GRAU[prefix] || { grau:1, rat:1, desc:"Grau 1 – Baixo risco" };
}
function getFpasEntry(cnae: string): FpasEntry {
  const prefix = String(cnae).replace(/\D/g,"").substring(0,2);
  for (const row of FPAS_TABLE) { if (row.prefixes.includes(prefix)) return row.entry; }
  return FPAS_DEFAULT;
}
function getSimplexAnexo(cnae: string): { anexo: string; descricao: string; sujetoFatorR: boolean; aliquotaInicial: string } | null {
  const p = parseInt(String(cnae).replace(/\D/g,"").substring(0,2));
  if (p >= 45 && p <= 47) return { anexo:"I",   descricao:"Comércio",                                          sujetoFatorR:false, aliquotaInicial:"4,00%" };
  if (p >= 10 && p <= 33) return { anexo:"II",  descricao:"Indústria de transformação",                        sujetoFatorR:false, aliquotaInicial:"4,50%" };
  if (p === 41 || p === 42 || p === 43) return { anexo:"IV", descricao:"Construção civil (INSS patronal separado)", sujetoFatorR:false, aliquotaInicial:"4,50%" };
  if (p === 62 || p === 63) return { anexo:"V",  descricao:"TI e desenvolvimento de software",                 sujetoFatorR:true,  aliquotaInicial:"15,50%" };
  if (p === 71) return         { anexo:"IV", descricao:"Engenharia e arquitetura (INSS separado)",              sujetoFatorR:false, aliquotaInicial:"4,50%" };
  if (p === 85) return         { anexo:"III", descricao:"Educação",                                            sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  if (p === 86 || p === 87 || p === 88) return { anexo:"III", descricao:"Saúde e assistência social",          sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  if (p === 69 || p === 70) return { anexo:"IV", descricao:"Jurídico, contabilidade (INSS separado)",          sujetoFatorR:false, aliquotaInicial:"4,50%" };
  if (p >= 55 && p <= 56) return { anexo:"III", descricao:"Alojamento e alimentação",                          sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  if (p >= 58 && p <= 61) return { anexo:"III", descricao:"Comunicação e informação",                          sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  if (p >= 64 && p <= 66) return null;
  if (p >= 49 && p <= 53) return { anexo:"III", descricao:"Transporte",                                        sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  if (p >= 73 && p <= 74) return { anexo:"V",   descricao:"Publicidade e consultoria",                         sujetoFatorR:true,  aliquotaInicial:"15,50%" };
  if (p >= 78 && p <= 82) return { anexo:"III", descricao:"Serviços administrativos",                          sujetoFatorR:true,  aliquotaInicial:"6,00%" };
  return { anexo:"III", descricao:"Serviços em geral",                                                          sujetoFatorR:true,  aliquotaInicial:"6,00%" };
}
function getCprbSetor(cnae: string) {
  const cod = String(cnae).replace(/\D/g,"").substring(0,4);
  return CPRB_SETORES_RICH.find(s => s.ids.includes(cod)) || null;
}
function getIssInfo(cnae: string): { sujeito: boolean; item: string; descricao: string } {
  const p = parseInt(String(cnae).replace(/\D/g,"").substring(0,2));
  if ((p >= 10 && p <= 33) || (p >= 45 && p <= 47) || p === 35 || p === 36)
    return { sujeito:false, item:"—", descricao:"Atividade sujeita ao ICMS (mercadoria/produto), não ao ISS municipal" };
  const map: Record<string, {item:string;descricao:string}> = {
    "62":{ item:"1.07",  descricao:"Suporte técnico em TI, incluindo instalação, configuração e manutenção de software e bancos de dados" },
    "63":{ item:"1.07",  descricao:"Serviços de informação em TI" },
    "41":{ item:"7.02",  descricao:"Execução por administração, empreitada ou subempreitada de obras de construção civil" },
    "42":{ item:"7.02",  descricao:"Obras de infraestrutura urbana" },
    "43":{ item:"7.02",  descricao:"Serviços especializados de construção" },
    "71":{ item:"7.01",  descricao:"Engenharia, agronomia, agrimensura, arquitetura, geologia, urbanismo" },
    "69":{ item:"17.01", descricao:"Serviços jurídicos (advocacia, assessoria jurídica)" },
    "70":{ item:"17.19", descricao:"Assessoria e consultoria empresarial" },
    "73":{ item:"17.06", descricao:"Propaganda e publicidade, inclusive promoção de vendas" },
    "74":{ item:"17.19", descricao:"Serviços de consultoria e assessoria profissional" },
    "85":{ item:"8.01",  descricao:"Ensino pré-escolar, fundamental, médio e superior" },
    "86":{ item:"4.01",  descricao:"Medicina e biomedicina (planos de saúde, pronto-socorro, hospitais)" },
    "80":{ item:"11.02", descricao:"Vigilância, segurança ou monitoramento de bens, pessoas e semoventes" },
    "81":{ item:"7.10",  descricao:"Limpeza, manutenção e conservação de imóveis, logradouros e piscinas" },
    "49":{ item:"16.01", descricao:"Serviços de transporte de natureza municipal" },
  };
  const key = String(p).padStart(2,"0");
  const info = map[key] || { item:"LC 116/03", descricao:"Atividade de prestação de serviço sujeita ao ISS municipal" };
  return { sujeito:true, ...info };
}
const ANEXO_CORES: Record<string, string> = {
  I:"bg-blue-500/20 text-blue-300 border-blue-500/30",
  II:"bg-purple-500/20 text-purple-300 border-purple-500/30",
  III:"bg-green-500/20 text-green-300 border-green-500/30",
  IV:"bg-orange-500/20 text-orange-300 border-orange-500/30",
  V:"bg-red-500/20 text-red-300 border-red-500/30",
};
type CnaeTab = "simples"|"previdencia"|"iss"|"desoneracao";

function PanelCNAE({ cnaeInfo, loadingRF, onConsultar, cnpjValido, regime }: {
  cnaeInfo: CnaeInfo | null; loadingRF: boolean; onConsultar: () => void; cnpjValido: boolean; regime?: string;
}) {
  const [tab, setTab] = useState<CnaeTab>("simples");
  const cnae = cnaeInfo?.cnaePrincipalCodigo || "";
  const rat = cnae ? getRatEntry(cnae) : null;
  const fpas = cnae ? getFpasEntry(cnae) : null;
  const simplesAnexo = cnae ? getSimplexAnexo(cnae) : null;
  const cprb = cnae ? getCprbSetor(cnae) : null;
  const iss = cnae ? getIssInfo(cnae) : null;
  const fpasTotal = fpas ? fpas.entidades.reduce((s,e) => s+e.aliquota, 0) : 0;

  return (
    <div className="space-y-4">
      <SectionCollapse title="CNAE — Classificação Nacional de Atividades Econômicas" icon={<Layers className="w-4 h-4" />}>
        <div className="space-y-4">
          {cnaeInfo ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-base font-bold text-primary">{cnaeInfo.cnaePrincipalCodigo}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/40 bg-emerald-500/10">Principal</Badge>
                      {rat && <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40 bg-amber-500/10">RAT {rat.rat}%</Badge>}
                      {simplesAnexo && <Badge variant="outline" className={`text-[10px] border ${ANEXO_CORES[simplesAnexo.anexo] || ""}`}>Anexo {simplesAnexo.anexo}</Badge>}
                    </div>
                    <p className="text-sm">{cnaeInfo.cnaePrincipalDescricao}</p>
                  </div>
                </div>
              </div>
              {cnaeInfo.cnaesSecundarios.length > 0 && (
                <div className="space-y-1.5">
                  {cnaeInfo.cnaesSecundarios.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border/30 bg-secondary/10 px-3 py-2 flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{c.codigo}</span>
                      <span className="text-xs text-muted-foreground flex-1">{c.descricao}</span>
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-500/30 shrink-0">Secundária</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">CNAE não carregado ainda</p>
              <p className="text-xs">Clique em "Consultar Receita Federal" para obter os dados</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={onConsultar} disabled={loadingRF || !cnpjValido} className="gap-2">
              {loadingRF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Consultar Receita Federal
            </Button>
            <div className="flex flex-wrap gap-3">
              {[{l:"IBGE CNAE",url:"https://cnae.ibge.gov.br"},{l:"Simples Nacional",url:"https://www8.receita.fazenda.gov.br/SimplesNacional"},{l:"MEI",url:"https://mei.receita.economia.gov.br"},{l:"LC 116/ISS",url:"https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm"}].map(f => (
                <a key={f.l} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                  <Info className="w-3 h-3" />{f.l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </SectionCollapse>

      {cnaeInfo && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary/30 border-b border-border/40">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Informações Tributárias</span>
            <span className="font-mono text-xs text-muted-foreground ml-1">{cnaeInfo.cnaePrincipalCodigo} — {cnaeInfo.cnaePrincipalDescricao.slice(0,45)}{cnaeInfo.cnaePrincipalDescricao.length>45?"…":""}</span>
          </div>
          <div className="flex border-b border-border/40 bg-secondary/10 overflow-x-auto">
            {([["simples","Simples/MEI"],["previdencia","Previdência"],["iss","ISS"],["desoneracao","Desoneração"]] as [CnaeTab,string][]).map(([id,label]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${tab===id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">

            {tab === "simples" && (
              <div className="space-y-3">
                {simplesAnexo ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Simples Nacional</span>
                      <Badge className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30">Permitido</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Anexo</p>
                        <p className={`font-bold text-2xl ${ANEXO_CORES[simplesAnexo.anexo]?.split(" ")[1] || "text-primary"}`}>{simplesAnexo.anexo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{simplesAnexo.descricao}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">Alíquota Inicial</p>
                        <p className="font-bold text-2xl text-emerald-300">{simplesAnexo.aliquotaInicial}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">RBT12 até R$ 180.000</p>
                      </div>
                    </div>
                    {simplesAnexo.sujetoFatorR && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-300">Fator R Aplicável</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Se <strong>Folha de Salários ≥ 28%</strong> do faturamento, a empresa pode tributar pelo <strong>Anexo III</strong> (menor alíquota).
                          Fator R = Folha 12 meses ÷ Receita Bruta 12 meses.
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">Fonte: LC 123/2006, Resolução CGSN 140/2018</p>
                  </>
                ) : (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs font-semibold text-red-300">Vedado ao Simples Nacional</span></div>
                    <p className="text-[11px] text-muted-foreground">Este CNAE pertence ao setor financeiro (divisão 64–66) ou outra atividade vedada ao Simples Nacional.</p>
                  </div>
                )}
                <div className="border-t border-border/30 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">MEI — Microempreendedor Individual</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>• Limite de faturamento: <strong>R$ 81.000/ano</strong></p>
                    <p>• Pode ter 1 empregado (salário mínimo ou piso da categoria)</p>
                    <p>• DAS mensal fixo com INSS, ISS ou ICMS incluídos</p>
                    <p>• Algumas atividades são vedadas ao MEI — consulte a lista no Portal do Empreendedor</p>
                  </div>
                </div>
              </div>
            )}

            {tab === "previdencia" && (
              <div className="space-y-3">
                {/* MEI — sem CPP */}
                {regime === "mei" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Regime Previdenciário — MEI</span>
                      <Badge className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">Sem CPP patronal</Badge>
                    </div>
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 space-y-2 text-[11px] text-muted-foreground">
                      <p>• O MEI <strong>não recolhe</strong> Contribuição Patronal Previdenciária (CPP 20%).</p>
                      <p>• O DAS mensal fixo inclui o <strong>INSS do segurado</strong> (5% sobre salário mínimo) para o próprio empreendedor.</p>
                      <p>• Se o MEI contratar <strong>1 empregado</strong> (permitido por lei): recolhe 8% sobre o salário do empregado (CPP simplificado).</p>
                      <p>• <strong>Sem RAT e sem contribuições de terceiros</strong> (SESI, SESC, SENAC, etc.).</p>
                    </div>
                  </div>
                )}
                {/* Simples Nacional Anexo I / II / III / V — CPP incluso no DAS */}
                {regime === "simples_nacional" && simplesAnexo && simplesAnexo.anexo !== "IV" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Regime Previdenciário — Simples Nacional</span>
                      <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CPP incluso no DAS</Badge>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-[11px] text-muted-foreground">
                      <p>• INSS patronal (CPP) está <strong>incluso na guia DAS</strong> — não há recolhimento separado de 20%.</p>
                      <p>• RAT/FAP e contribuições de terceiros também estão <strong>inclusos no DAS</strong>.</p>
                      <p>• <strong>Exceção: Anexo IV</strong> — as atividades deste Anexo recolhem INSS patronal separado via GPS.</p>
                      <p>• INSS do empregado (7,5% a 14%): recolhido via FGTS e GPS normalmente.</p>
                    </div>
                    {rat && fpas && (
                      <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
                        <p className="text-xs font-semibold mb-2">FPAS de Referência — {fpas.fpas} ({fpas.descricao})</p>
                        <div className="space-y-1.5">
                          {fpas.entidades.map((e,i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">{e.entidade}</span>
                              <span className="font-medium text-muted-foreground/60">incluso no DAS</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Simples Nacional Anexo IV — CPP separado */}
                {regime === "simples_nacional" && simplesAnexo && simplesAnexo.anexo === "IV" && rat && fpas && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Regime Previdenciário — Simples Anexo IV</span>
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">CPP separado (GPS)</Badge>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-muted-foreground mb-1">
                      <p>Anexo IV (construção civil, engenharia, advocacia, contabilidade): o <strong>INSS patronal é recolhido separado via GPS</strong>, não está incluso no DAS.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">INSS Patronal</p>
                        <p className="font-bold text-lg text-blue-300">20%</p>
                        <p className="text-[10px] text-muted-foreground">sobre a folha</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">RAT — {rat.desc.split("–")[0].trim()}</p>
                        <p className="font-bold text-lg text-amber-300">{rat.rat}%</p>
                        <p className="text-[10px] text-muted-foreground">{(rat.desc.split("–")[1]||"").trim()}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Total GPS</p>
                        <p className="font-bold text-lg text-red-300">~{(20+rat.rat).toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground">sem terceiros</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
                      <p className="text-xs font-semibold mb-2">FPAS {fpas.fpas} — {fpas.descricao}</p>
                      <div className="space-y-1.5">
                        {fpas.entidades.map((e,i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{e.entidade}</span>
                            <span className="font-medium">{e.aliquota.toFixed(1)}%</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold pt-1 border-t border-border/30">
                          <span>Total Terceiros</span><span>{fpasTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* LP / LR / LA / Imune / Isento — CPP padrão completo */}
                {(regime === "lucro_presumido" || regime === "lucro_real" || regime === "lucro_arbitrado" || regime === "imune_isento" || regime === "autonomo_pf" || (!regime?.startsWith("simples") && regime !== "mei")) && rat && fpas && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">CPP — Contribuição Patronal Previdenciária</span>
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">Regime Padrão</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">INSS Patronal</p>
                        <p className="font-bold text-lg text-blue-300">20%</p>
                        <p className="text-[10px] text-muted-foreground">sobre a folha</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">RAT — {rat.desc.split("–")[0].trim()}</p>
                        <p className="font-bold text-lg text-amber-300">{rat.rat}%</p>
                        <p className="text-[10px] text-muted-foreground">{(rat.desc.split("–")[1]||"").trim()}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Terceiros (FPAS {fpas.fpas})</p>
                        <p className="font-bold text-lg text-violet-300">{fpasTotal.toFixed(1)}%</p>
                        <p className="text-[10px] text-muted-foreground">{fpas.descricao}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Total Estimado</p>
                        <p className="font-bold text-lg text-red-300">{(20+rat.rat+fpasTotal).toFixed(1)}%</p>
                        <p className="text-[10px] text-muted-foreground">sobre a folha</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/10 p-3">
                      <p className="text-xs font-semibold mb-2">Contribuições de Terceiros — FPAS {fpas.fpas} ({fpas.descricao})</p>
                      <div className="space-y-1.5">
                        {fpas.entidades.map((e,i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{e.entidade}</span>
                            <span className="font-medium">{e.aliquota.toFixed(1)}%</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold pt-1 border-t border-border/30">
                          <span>Total Terceiros</span><span>{fpasTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>• <strong>FAP</strong>: multiplica o RAT entre 0,5× e 2× conforme histórico de acidentes da empresa</p>
                      <p>• <strong>INSS do empregado</strong>: 7,5% a 14% (tabela progressiva 2024)</p>
                      <p>• <strong>FGTS</strong>: 8% sobre o salário bruto</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "iss" && iss && (
              <div className="space-y-3">
                {iss.sujeito ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">ISS — Imposto Sobre Serviços</span>
                      <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">Sujeito ao ISS</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Item LC 116/2003</p>
                        <p className="font-bold text-base text-blue-300">{iss.item}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Alíquota Mínima</p>
                        <p className="font-bold text-base text-green-300">2%</p>
                        <p className="text-[10px] text-muted-foreground">por lei</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">Alíquota Máxima</p>
                        <p className="font-bold text-base text-red-300">5%</p>
                        <p className="text-[10px] text-muted-foreground">por lei</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/10 p-3 text-[11px] text-muted-foreground">
                      <p className="font-semibold text-foreground text-xs mb-1">{iss.descricao}</p>
                      <p>A alíquota exata depende do município onde o serviço é prestado. Simples Nacional inclui ISS na guia DAS (exceto Anexo IV).</p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span className="text-xs font-semibold text-amber-300">Não sujeito ao ISS</span></div>
                    <p className="text-[11px] text-muted-foreground">{iss.descricao}</p>
                  </div>
                )}
              </div>
            )}

            {tab === "desoneracao" && (
              <div className="space-y-3">
                {cprb ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">CPRB — Desoneração da Folha</span>
                      <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Elegível</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Alíquota CPRB</p>
                        <p className="font-bold text-2xl text-emerald-300">{cprb.aliquota}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">sobre receita bruta</p>
                      </div>
                      <div className="bg-secondary/30 rounded-xl border border-border/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Substitui</p>
                        <p className="font-bold text-2xl text-red-300">20%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">CPP sobre folha</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-muted-foreground">
                      <p className="font-semibold text-emerald-300 text-xs mb-1">Setor: {cprb.descricao}</p>
                      <p>{cprb.exemplo}</p>
                      <p className="mt-1.5">A CPRB <strong>substitui</strong> os 20% CPP, mas <strong>mantém</strong> RAT/FAP e contribuições de terceiros. Lei 12.546/2011.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">CPRB — Desoneração da Folha</span>
                      <Badge className="text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/30">Não elegível</Badge>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/10 p-3 text-[11px] text-muted-foreground">
                      <p>O CNAE <strong>{cnaeInfo?.cnaePrincipalCodigo}</strong> não está entre os setores elegíveis à Contribuição Previdenciária sobre Receita Bruta (CPRB) conforme Lei 12.546/2011 e alterações.</p>
                      <p className="mt-1.5">A empresa permanece no regime padrão de <strong>20% CPP sobre a folha de salários</strong>.</p>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}
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
                <span className="text-sm">{formatters.displayDate(form.dataOpcaoSimples)}</span>
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
              <div className="flex items-center justify-between">
                <Label className="text-xs">Faturamento Anual — RBT12</Label>
                <a
                  href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgdas.app/"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
                  title="Acessar PGDAS-D na Receita Federal"
                >
                  <Info className="w-3 h-3" /> Consultar na RF (PGDAS-D)
                </a>
              </div>
              <Input
                value={form.faturamentoAnual}
                onChange={e => setField("faturamentoAnual", maskBRL(e.target.value))}
                className="bg-background font-mono"
                placeholder="R$ 0,00"
                inputMode="numeric"
              />
              <p className="text-[10px] text-muted-foreground">Receita bruta total dos últimos 12 meses — informe conforme PGDAS-D ou e-CAC</p>
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
                <span className="text-sm">{formatters.displayDate(form.dataOpcaoSimples)}</span>
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
        <PanelCNAE cnaeInfo={cnaeInfo} loadingRF={loadingRF} onConsultar={consultarRF} cnpjValido={cnpjValido} regime={regime} />
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
