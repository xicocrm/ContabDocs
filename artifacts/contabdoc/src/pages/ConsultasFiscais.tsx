import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEscritorio } from "@/contexts/EscritorioContext";
import { API } from "@/lib/api";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import {
  Loader2, Plus, Edit, Trash2, Search, Receipt, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Calculator, Building2, Users, Package, MapPin, ExternalLink,
  FileText, ChevronRight, Info, BarChart3
} from "lucide-react";

interface ConsultaFiscal {
  id: number; escritorioId: number; clienteId?: number; tipo: string;
  descricao?: string; resultado?: string; status: string; dataConsulta?: string;
  dataRetorno?: string; responsavel?: string; observacoes?: string;
}

interface Cliente { id: number; razaoSocial: string; nomeFantasia?: string; cnpj?: string; regimeTributario?: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:      { label: "Pendente",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  em_analise:    { label: "Em Análise",    color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  concluida:     { label: "Concluída",     color: "bg-green-500/20 text-green-400 border-green-500/30" },
  com_pendencia: { label: "Com Pendência", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  arquivada:     { label: "Arquivada",     color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const TIPOS = [
  "Situação CNPJ","Situação CPF","Simples Nacional","Débitos Federais",
  "Débitos Estaduais","Débitos Municipais","Certidão Negativa",
  "Parcelamento PERT","REFIS","Declaração IRPF","Declaração IRPJ",
  "Declaração SPED","Outro",
];

const REGIMES_INFO: Record<string, { label: string; cor: string; aliquotas: string[]; contribuicoes: string[] }> = {
  "Simples Nacional": {
    label: "Simples Nacional",
    cor: "text-green-400",
    aliquotas: ["Anexo I: Comércio 4% a 19%","Anexo II: Indústria 4,5% a 30%","Anexo III: Serviços 6% a 33%","Anexo IV: Serviços 4,5% a 33%","Anexo V: Serviços 15,5% a 30,5%"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: Incluso no DAS","FGTS: 8% sobre salário","RAT/FAP: Incluso no DAS"],
  },
  "Lucro Presumido": {
    label: "Lucro Presumido",
    cor: "text-blue-400",
    aliquotas: ["IRPJ: 15% sobre lucro presumido","CSLL: 9% sobre lucro presumido","PIS: 0,65%","COFINS: 3%"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: 20% sobre folha","FGTS: 8% sobre salário","RAT/FAP: 1% a 3%"],
  },
  "Lucro Real": {
    label: "Lucro Real",
    cor: "text-purple-400",
    aliquotas: ["IRPJ: 15% sobre lucro real (+ 10% adicional acima de R$20k/mês)","CSLL: 9%","PIS: 1,65% (não-cumulativo)","COFINS: 7,6% (não-cumulativo)"],
    contribuicoes: ["INSS Empregado: 7,5% a 14%","INSS Patronal: 20% sobre folha","FGTS: 8% sobre salário","RAT/FAP: 1% a 3%"],
  },
  "MEI": {
    label: "MEI – Microempreendedor Individual",
    cor: "text-orange-400",
    aliquotas: ["DAS fixo: R$ 75,90/mês (comércio/indústria) + ICMS","DAS fixo: R$ 84,90/mês (serviços) + ISS","DAS fixo: R$ 85,90/mês (comércio + serviços)"],
    contribuicoes: ["INSS: 5% sobre salário mínimo","CPP: Incluso no DAS","Sem empregados ou 1 empregado"],
  },
};

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const ICMS_RATES: Record<string, number> = {
  AC:17, AL:17, AP:18, AM:20, BA:19, CE:18, DF:18, ES:17, GO:17, MA:20, MT:17, MS:17,
  MG:18, PA:19, PB:18, PR:19, PE:18, PI:21, RJ:20, RN:18, RS:17, RO:17.5, RR:17, SC:17, SP:18, SE:19, TO:17,
};

// ── Regime Previdenciário ──────────────────────────────────────────────────────
// Grau de risco por prefixo CNAE (2 dígitos) → RAT básico (%)
const RAT_GRAU: Record<string, { grau: number; rat: number; desc: string }> = {
  "01":{grau:3,rat:3,desc:"Graus de risco 3 – Agricultura"}, "02":{grau:3,rat:3,desc:"Grau 3 – Silvicultura"}, "03":{grau:3,rat:3,desc:"Grau 3 – Pesca"},
  "05":{grau:3,rat:3,desc:"Grau 3 – Extração de carvão"}, "06":{grau:3,rat:3,desc:"Grau 3 – Ext. petróleo"}, "07":{grau:3,rat:3,desc:"Grau 3 – Mineração"}, "08":{grau:3,rat:3,desc:"Grau 3 – Ext. minerais não-metálicos"}, "09":{grau:3,rat:3,desc:"Grau 3 – Serviços de apoio à extração"},
  "10":{grau:2,rat:2,desc:"Grau 2 – Ind. de alimentos"}, "11":{grau:2,rat:2,desc:"Grau 2 – Bebidas"}, "12":{grau:3,rat:3,desc:"Grau 3 – Tabaco"}, "13":{grau:2,rat:2,desc:"Grau 2 – Têxtil"}, "14":{grau:2,rat:2,desc:"Grau 2 – Confecções"}, "15":{grau:2,rat:2,desc:"Grau 2 – Couros"}, "16":{grau:2,rat:2,desc:"Grau 2 – Madeira"}, "17":{grau:2,rat:2,desc:"Grau 2 – Celulose/Papel"}, "18":{grau:2,rat:2,desc:"Grau 2 – Gráfica"}, "19":{grau:3,rat:3,desc:"Grau 3 – Petróleo/Coque"},
  "20":{grau:3,rat:3,desc:"Grau 3 – Produtos químicos"}, "21":{grau:2,rat:2,desc:"Grau 2 – Farmacêuticos"}, "22":{grau:2,rat:2,desc:"Grau 2 – Borracha/Plástico"}, "23":{grau:3,rat:3,desc:"Grau 3 – Min. não-metálicos"}, "24":{grau:3,rat:3,desc:"Grau 3 – Metalurgia"}, "25":{grau:3,rat:3,desc:"Grau 3 – Prod. de metal"}, "26":{grau:2,rat:2,desc:"Grau 2 – Informática/eletrônicos"}, "27":{grau:2,rat:2,desc:"Grau 2 – Equipamentos elétricos"}, "28":{grau:3,rat:3,desc:"Grau 3 – Máquinas e equipamentos"}, "29":{grau:3,rat:3,desc:"Grau 3 – Veículos"}, "30":{grau:3,rat:3,desc:"Grau 3 – Outros transportes"},
  "31":{grau:2,rat:2,desc:"Grau 2 – Móveis"}, "32":{grau:2,rat:2,desc:"Grau 2 – Produtos diversos"}, "33":{grau:3,rat:3,desc:"Grau 3 – Manutenção de máquinas"},
  "35":{grau:3,rat:3,desc:"Grau 3 – Elet/gás/vapor"}, "36":{grau:2,rat:2,desc:"Grau 2 – Água/saneamento"}, "37":{grau:3,rat:3,desc:"Grau 3 – Esgoto"}, "38":{grau:3,rat:3,desc:"Grau 3 – Resíduos"}, "39":{grau:3,rat:3,desc:"Grau 3 – Descontaminação"},
  "41":{grau:3,rat:3,desc:"Grau 3 – Construção de edifícios"}, "42":{grau:3,rat:3,desc:"Grau 3 – Obras de infraestrutura"}, "43":{grau:3,rat:3,desc:"Grau 3 – Serviços especializados de construção"},
  "45":{grau:1,rat:1,desc:"Grau 1 – Comércio de veículos"}, "46":{grau:1,rat:1,desc:"Grau 1 – Comércio atacadista"}, "47":{grau:1,rat:1,desc:"Grau 1 – Comércio varejista"},
  "49":{grau:2,rat:2,desc:"Grau 2 – Transp. terrestre"}, "50":{grau:2,rat:2,desc:"Grau 2 – Transp. aquaviário"}, "51":{grau:1,rat:1,desc:"Grau 1 – Transp. aéreo"}, "52":{grau:2,rat:2,desc:"Grau 2 – Armazenamento/logística"}, "53":{grau:1,rat:1,desc:"Grau 1 – Correios"},
  "55":{grau:1,rat:1,desc:"Grau 1 – Alojamento"}, "56":{grau:1,rat:1,desc:"Grau 1 – Alimentação"},
  "58":{grau:1,rat:1,desc:"Grau 1 – Edição"}, "59":{grau:1,rat:1,desc:"Grau 1 – Cinema/som/vídeo"}, "60":{grau:1,rat:1,desc:"Grau 1 – Rádio/TV"}, "61":{grau:1,rat:1,desc:"Grau 1 – Telecomunicações"}, "62":{grau:1,rat:1,desc:"Grau 1 – TI / Software"}, "63":{grau:1,rat:1,desc:"Grau 1 – Serviços de informação"},
  "64":{grau:1,rat:1,desc:"Grau 1 – Financeiro"}, "65":{grau:1,rat:1,desc:"Grau 1 – Seguros"}, "66":{grau:1,rat:1,desc:"Grau 1 – Aux. financeiro"},
  "68":{grau:1,rat:1,desc:"Grau 1 – Imóveis"},
  "69":{grau:1,rat:1,desc:"Grau 1 – Jurídico/Contabilidade"}, "70":{grau:1,rat:1,desc:"Grau 1 – Gestão empresarial"}, "71":{grau:1,rat:1,desc:"Grau 1 – Arquitetura/Engenharia"}, "72":{grau:1,rat:1,desc:"Grau 1 – P&D"}, "73":{grau:1,rat:1,desc:"Grau 1 – Publicidade"}, "74":{grau:1,rat:1,desc:"Grau 1 – Profissional especializado"}, "75":{grau:1,rat:1,desc:"Grau 1 – Veterinária"},
  "77":{grau:1,rat:1,desc:"Grau 1 – Locação e leasing"}, "78":{grau:1,rat:1,desc:"Grau 1 – Seleção de pessoal"}, "79":{grau:1,rat:1,desc:"Grau 1 – Agências de viagem"}, "80":{grau:1,rat:1,desc:"Grau 1 – Vigilância/segurança"}, "81":{grau:2,rat:2,desc:"Grau 2 – Serviços de limpeza"}, "82":{grau:1,rat:1,desc:"Grau 1 – Serviços administrativos"},
  "84":{grau:1,rat:1,desc:"Grau 1 – Administração pública"},
  "85":{grau:1,rat:1,desc:"Grau 1 – Educação"},
  "86":{grau:1,rat:1,desc:"Grau 1 – Saúde humana"}, "87":{grau:2,rat:2,desc:"Grau 2 – Residenciais de saúde"}, "88":{grau:1,rat:1,desc:"Grau 1 – Serviços sociais"},
  "90":{grau:1,rat:1,desc:"Grau 1 – Artes/espetáculos"}, "91":{grau:1,rat:1,desc:"Grau 1 – Bibliotecas/museus"}, "92":{grau:1,rat:1,desc:"Grau 1 – Jogos/apostas"}, "93":{grau:1,rat:1,desc:"Grau 1 – Esporte/recreação"},
  "94":{grau:1,rat:1,desc:"Grau 1 – Atividades associativas"}, "95":{grau:1,rat:1,desc:"Grau 1 – Manutenção pessoal"}, "96":{grau:1,rat:1,desc:"Grau 1 – Serviços pessoais"}, "97":{grau:1,rat:1,desc:"Grau 1 – Domésticos"}, "99":{grau:1,rat:1,desc:"Grau 1 – Org. internacionais"},
};

interface FpasEntry { fpas: string; descricao: string; entidades: { entidade: string; aliquota: number }[] }

const FPAS_TABLE: { prefixes: string[]; entry: FpasEntry }[] = [
  { prefixes:["41","42","43"], entry:{ fpas:"655", descricao:"Construção civil", entidades:[{entidade:"SESI",aliquota:1.5},{entidade:"SENAI",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Salário Educação",aliquota:2.5}] } },
  { prefixes:["49","50","52","53"], entry:{ fpas:"868", descricao:"Transporte rodoviário e afins", entidades:[{entidade:"SEST",aliquota:1.5},{entidade:"SENAT",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Salário Educação",aliquota:2.5}] } },
  { prefixes:["01","02","03"], entry:{ fpas:"604", descricao:"Agropecuária", entidades:[{entidade:"SENAR",aliquota:2.5},{entidade:"INCRA",aliquota:0.2},{entidade:"Salário Educação",aliquota:2.5}] } },
  { prefixes:["64","65","66"], entry:{ fpas:"574", descricao:"Financeiro/Seguros", entidades:[{entidade:"INCRA",aliquota:0.2},{entidade:"Salário Educação",aliquota:2.5},{entidade:"SEBRAE",aliquota:0.6}] } },
  { prefixes:["10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","05","06","07","08","09","35","36","37","38","39"],
    entry:{ fpas:"507", descricao:"Indústria em geral", entidades:[{entidade:"SESI",aliquota:1.5},{entidade:"SENAI",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Salário Educação",aliquota:2.5}] } },
];

const FPAS_DEFAULT: FpasEntry = { fpas:"515", descricao:"Comércio e serviços em geral", entidades:[{entidade:"SESC",aliquota:1.5},{entidade:"SENAC",aliquota:1.0},{entidade:"INCRA",aliquota:0.2},{entidade:"SEBRAE",aliquota:0.6},{entidade:"Salário Educação",aliquota:2.5}] };

function getFpasEntry(cnae4: string): FpasEntry {
  const prefix = cnae4.substring(0,2);
  for (const row of FPAS_TABLE) {
    if (row.prefixes.includes(prefix)) return row.entry;
  }
  return FPAS_DEFAULT;
}

function getRatEntry(cnae4: string) {
  const prefix = cnae4.substring(0,2);
  return RAT_GRAU[prefix] || { grau:1, rat:1, desc:"Grau 1 – Baixo risco" };
}

function getSimplexAnexo(cnae4: string): { anexo: string; descricao: string; sujetoFatorR: boolean } | null {
  const p = parseInt(cnae4.substring(0,2));
  if (p >= 47 && p <= 47) return { anexo:"I", descricao:"Comércio varejista", sujetoFatorR:false };
  if (p >= 45 && p <= 46) return { anexo:"I", descricao:"Comércio atacadista/veículos", sujetoFatorR:false };
  if (p >= 10 && p <= 33) return { anexo:"II", descricao:"Indústria de transformação", sujetoFatorR:false };
  if (p === 41 || p === 42 || p === 43) return { anexo:"IV", descricao:"Construção civil", sujetoFatorR:false };
  if (p === 62 || p === 63) return { anexo:"V", descricao:"TI e desenvolvimento de software", sujetoFatorR:true };
  if (p === 85) return { anexo:"III", descricao:"Educação", sujetoFatorR:true };
  if (p === 86 || p === 87 || p === 88) return { anexo:"III", descricao:"Serviços de saúde", sujetoFatorR:true };
  if (p === 69 || p === 70 || p === 71) return { anexo:"IV", descricao:"Serviços profissionais (INSS patronal separado)", sujetoFatorR:false };
  if (p >= 55 && p <= 56) return { anexo:"III", descricao:"Alojamento e alimentação", sujetoFatorR:true };
  if (p >= 58 && p <= 61) return { anexo:"III", descricao:"Comunicação e informação", sujetoFatorR:true };
  if (p >= 64 && p <= 66) return null;
  if (p >= 49 && p <= 53) return { anexo:"III", descricao:"Transporte", sujetoFatorR:true };
  if (p >= 73 && p <= 74) return { anexo:"V", descricao:"Publicidade e consultoria", sujetoFatorR:true };
  if (p >= 78 && p <= 79) return { anexo:"III", descricao:"Serviços administrativos", sujetoFatorR:true };
  return { anexo:"III", descricao:"Serviços em geral", sujetoFatorR:true };
}

// CPRB (Desoneração da folha) por setor – Lei 12.546/2011 e alterações
const CPRB_SETORES: { ids: string[]; descricao: string; aliquota: number; exemplo: string }[] = [
  { ids:["6201","6202","6203","6204","6209"], descricao:"TI / Tecnologia da Informação", aliquota:4.5, exemplo:"Desenvolvimento de software, consultorias de TI" },
  { ids:["1811","1812","1813","1821","1822"], descricao:"Serviços gráficos", aliquota:2.5, exemplo:"Edição, impressão, acabamento gráfico" },
  { ids:["1412","1421","1422","1531","1532","1533"], descricao:"Confecção/calçados", aliquota:1.0, exemplo:"Confecção de roupas e calçados" },
  { ids:["1711","1721","1722","1731","1732"], descricao:"Celulose e papel", aliquota:2.5, exemplo:"Fabricação de celulose, papel e papelão" },
  { ids:["2391","2392","2399"], descricao:"Pedras e materiais de construção", aliquota:1.0, exemplo:"Beneficiamento de pedras ornamentais" },
  { ids:["3211","3212","3299"], descricao:"Bijuterias e instrumentos musicais", aliquota:2.5, exemplo:"Joias, bijuterias, instrumentos musicais" },
  { ids:["4711","4712","4713","4721","4722","4723","4731","4741","4742","4744","4754","4755","4761","4762","4763","4771","4772","4773","4774","4781","4782","4789"],
    descricao:"Comércio varejista (seletivo)", aliquota:1.0, exemplo:"Lojas varejistas em geral" },
  { ids:["5611","5612","5620"], descricao:"Restaurantes e similares", aliquota:2.5, exemplo:"Restaurantes, bares, serviços de alimentação" },
  { ids:["5911","5912","5913","5914","5920"], descricao:"Audiovisual / Cinema", aliquota:1.0, exemplo:"Produção, distribuição de filmes e programas" },
  { ids:["7311","7312","7319","7320"], descricao:"Publicidade e propaganda", aliquota:2.5, exemplo:"Agências de publicidade, promoção de vendas" },
  { ids:["8599","8511","8512","8513","8520","8531","8532","8541","8542","8543","8550"], descricao:"Educação", aliquota:2.5, exemplo:"Ensino pré-escolar até superior" },
];

const TABS = [
  { id: "faturamento",     label: "Faturamento",          icon: TrendingUp,  cor: "bg-green-500",   corText: "text-green-400"  },
  { id: "memoria",         label: "Memória de Cálculos",  icon: Calculator,  cor: "bg-blue-500",    corText: "text-blue-400"   },
  { id: "cnae",            label: "Consulta CNAE",        icon: Building2,   cor: "bg-purple-500",  corText: "text-purple-400" },
  { id: "previdenciario",  label: "Regime Previdenciário",icon: Users,       cor: "bg-orange-500",  corText: "text-orange-400" },
  { id: "ncm",             label: "Tributação NCM/CFOP",  icon: Package,     cor: "bg-red-500",     corText: "text-red-400"    },
  { id: "difal",           label: "DIFAL / ICMS UF",      icon: MapPin,      cor: "bg-sky-500",     corText: "text-sky-400"    },
];

const empty: Partial<ConsultaFiscal> = { status: "pendente", tipo: "" };

export default function ConsultasFiscaisPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("cnae");

  // Memoria CRUD state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<ConsultaFiscal>>(empty);

  // CNAE state
  const [cnaeMode, setCnaeMode] = useState<"empresa"|"codigo"|"descricao">("empresa");
  const [cnaeEmpresa, setCnaeEmpresa] = useState("");
  const [cnaeCodigo, setCnaeCodigo] = useState("");
  const [cnaeDescricao, setCnaeDescricao] = useState("");
  const [cnaeResult, setCnaeResult] = useState<any>(null);
  const [cnaeLoading, setCnaeLoading] = useState(false);
  const [cnaeError, setCnaeError] = useState("");

  // Regime Previdenciário state
  const [prevSubTab, setPrevSubTab] = useState<"ratfap"|"deso">("ratfap");
  const [prevEmpresa, setPrevEmpresa] = useState("");
  const [prevCnae4, setPrevCnae4] = useState("");
  const [prevFap, setPrevFap] = useState("1.00");
  const [prevResult, setPrevResult] = useState<any>(null);
  const [prevLoading, setPrevLoading] = useState(false);
  const [prevError, setPrevError] = useState("");
  const [prevAtividades, setPrevAtividades] = useState<any[]>([]);
  const [desoNcm, setDesoNcm] = useState("");
  const [desoResult, setDesoResult] = useState<any>(null);
  const [desoLoading, setDesoLoading] = useState(false);
  const [desoError, setDesoError] = useState("");
  // (legacy – kept for compatibility)
  const [regimeEmpresa, setRegimeEmpresa] = useState("");

  // NCM state
  const [ncmCodigo, setNcmCodigo] = useState("");
  const [ncmResult, setNcmResult] = useState<any>(null);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [ncmError, setNcmError] = useState("");

  // DIFAL state
  const [difalOrigem, setDifalOrigem] = useState("");
  const [difalDestino, setDifalDestino] = useState("");
  const [difalValor, setDifalValor] = useState("");
  const [difalResult, setDifalResult] = useState<any>(null);

  // Faturamento state
  const [fatEmpresa, setFatEmpresa] = useState("");
  const [fatPeriodo, setFatPeriodo] = useState(new Date().getFullYear().toString());

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: consultas = [], isLoading } = useQuery<ConsultaFiscal[]>({
    queryKey: ["consultas-fiscais", escritorioId],
    queryFn: () => API.get(`/consultas-fiscais?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<ConsultaFiscal>) =>
      editId ? API.put(`/consultas-fiscais/${editId}`, data) : API.post("/consultas-fiscais", { ...data, escritorioId }),
    onMutate: async (data) => {
      setOpen(false);
      await qc.cancelQueries({ queryKey: ["consultas-fiscais", escritorioId] });
      const previous = qc.getQueryData<ConsultaFiscal[]>(["consultas-fiscais", escritorioId]);
      qc.setQueryData<ConsultaFiscal[]>(["consultas-fiscais", escritorioId], (old = []) =>
        editId ? old.map(i => i.id === editId ? { ...i, ...data } : i)
               : [...old, { id: Date.now(), escritorioId: escritorioId!, ...data } as ConsultaFiscal]
      );
      return { previous };
    },
    onError: (e: Error, _d, ctx: any) => {
      if (ctx?.previous) qc.setQueryData(["consultas-fiscais", escritorioId], ctx.previous);
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "✓ Consulta salva!" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/consultas-fiscais/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultas-fiscais", escritorioId] }); toast({ title: "Excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    consultas.filter(c =>
      (statusFilter === "todos" || c.status === statusFilter) &&
      (c.tipo.toLowerCase().includes(search.toLowerCase()) || (c.descricao||"").toLowerCase().includes(search.toLowerCase()))
    ), [consultas, statusFilter, search]);

  const openNew = () => { setForm({ ...empty }); setEditId(null); setOpen(true); };
  const openEdit = (c: ConsultaFiscal) => { setForm(c); setEditId(c.id); setOpen(true); };

  const clienteById = (id: string) => clientes.find(c => String(c.id) === id);

  const buscarCnae = async () => {
    setCnaeResult(null); setCnaeError(""); setCnaeLoading(true);
    try {
      let url = "";
      if (cnaeMode === "empresa") {
        const cli = clienteById(cnaeEmpresa);
        if (!cli?.cnpj) { setCnaeError("Empresa sem CNPJ cadastrado."); return; }
        const cnpj = cli.cnpj.replace(/\D/g, "");
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!r.ok) throw new Error("CNPJ não encontrado");
        const d = await r.json();
        setCnaeResult({ tipo: "empresa", data: d });
        return;
      } else if (cnaeMode === "codigo") {
        if (!cnaeCodigo.trim()) { setCnaeError("Informe o código CNAE."); return; }
        url = `https://brasilapi.com.br/api/cnae/v1/${cnaeCodigo.replace(/\D/g,"").padStart(7,"0")}`;
      } else {
        if (!cnaeDescricao.trim()) { setCnaeError("Informe a descrição para busca."); return; }
        url = `https://brasilapi.com.br/api/cnae/v1?search=${encodeURIComponent(cnaeDescricao)}`;
      }
      const r = await fetch(url);
      if (!r.ok) throw new Error("CNAE não encontrado");
      const d = await r.json();
      setCnaeResult({ tipo: cnaeMode, data: d });
    } catch (e: any) {
      setCnaeError(e.message || "Erro ao consultar CNAE.");
    } finally {
      setCnaeLoading(false);
    }
  };

  const buscarNcm = async () => {
    setNcmResult(null); setNcmError(""); setNcmLoading(true);
    try {
      if (!ncmCodigo.trim()) { setNcmError("Informe o código NCM."); return; }
      const cod = ncmCodigo.replace(/\D/g,"");
      const r = await fetch(`https://brasilapi.com.br/api/ncm/v1/${cod}`);
      if (!r.ok) throw new Error("NCM não encontrado");
      const d = await r.json();
      setNcmResult(d);
    } catch (e: any) {
      setNcmError(e.message || "Erro ao consultar NCM.");
    } finally {
      setNcmLoading(false);
    }
  };

  const calcularDifal = () => {
    if (!difalOrigem || !difalDestino || !difalValor) return;
    const valor = parseFloat(difalValor.replace(",","."));
    if (isNaN(valor) || valor <= 0) return;
    const icmsOrigem = ICMS_RATES[difalOrigem] || 17;
    const icmsDestino = ICMS_RATES[difalDestino] || 17;
    const aliqInterna = icmsDestino / 100;
    const aliqInterestadual = icmsOrigem <= 17.5 ? 0.12 : 0.12;
    const difal = valor * (aliqInterna - aliqInterestadual);
    const fecp = valor * 0.02;
    setDifalResult({ valor, icmsOrigem, icmsDestino, aliqInterestadual: aliqInterestadual * 100, difal: Math.max(0, difal), fecp, total: Math.max(0, difal) + fecp });
  };

  const consultarRAT = async () => {
    setPrevResult(null); setPrevError(""); setPrevLoading(true);
    try {
      let cnae4 = prevCnae4.replace(/\D/g, "").substring(0,4);
      if (!cnae4 && prevEmpresa) {
        const cli = clienteById(prevEmpresa);
        if (!cli?.cnpj) { setPrevError("Empresa sem CNPJ cadastrado."); return; }
        const cnpj = cli.cnpj.replace(/\D/g,"");
        const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!r.ok) throw new Error("CNPJ não encontrado na Receita Federal");
        const d = await r.json();
        cnae4 = String(d.cnae_fiscal || "").replace(/\D/g,"").substring(0,4);
        setPrevCnae4(cnae4);
        const ativs: any[] = [];
        if (d.cnae_fiscal) ativs.push({ codigo: d.cnae_fiscal, descricao: d.cnae_fiscal_descricao, principal: true });
        if (d.cnae_fiscais_secundarios) ativs.push(...d.cnae_fiscais_secundarios.slice(0,6).map((s: any) => ({ codigo: s.codigo, descricao: s.descricao, principal: false })));
        setPrevAtividades(ativs);
      }
      if (!cnae4 || cnae4.length < 4) { setPrevError("Informe o CNAE (4 primeiros dígitos) ou selecione uma empresa."); return; }
      let cnaeDesc = "";
      try {
        const r2 = await fetch(`https://brasilapi.com.br/api/cnae/v1/${cnae4.padEnd(7,"0")}`);
        if (r2.ok) { const d2 = await r2.json(); cnaeDesc = d2.descricao || ""; }
      } catch {}
      const ratEntry = getRatEntry(cnae4);
      const fpasEntry = getFpasEntry(cnae4);
      const fap = Math.max(0.5, Math.min(3.0, parseFloat(prevFap) || 1.0));
      const ratAjustado = ratEntry.rat * fap;
      const totalTerceiros = fpasEntry.entidades.reduce((s, e) => s + e.aliquota, 0);
      const inssPatronal = 20;
      const totalPatronal = inssPatronal + ratAjustado + totalTerceiros;
      const simplesAnexo = getSimplexAnexo(cnae4);
      setPrevResult({ cnae4, cnaeDesc, ratEntry, fpasEntry, fap, ratAjustado, totalTerceiros, inssPatronal, totalPatronal, simplesAnexo });
    } catch (e: any) {
      setPrevError(e.message || "Erro ao consultar.");
    } finally {
      setPrevLoading(false);
    }
  };

  const onPrevEmpresaChange = async (id: string) => {
    setPrevEmpresa(id); setPrevCnae4(""); setPrevAtividades([]); setPrevResult(null); setPrevError("");
    if (!id) return;
    const cli = clienteById(id);
    if (!cli?.cnpj) return;
    try {
      const cnpj = cli.cnpj.replace(/\D/g,"");
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!r.ok) return;
      const d = await r.json();
      const cnae4 = String(d.cnae_fiscal || "").replace(/\D/g,"").substring(0,4);
      setPrevCnae4(cnae4);
      const ativs: any[] = [];
      if (d.cnae_fiscal) ativs.push({ codigo: d.cnae_fiscal, descricao: d.cnae_fiscal_descricao, principal: true });
      if (d.cnae_fiscais_secundarios) ativs.push(...d.cnae_fiscais_secundarios.slice(0,5).map((s: any) => ({ codigo: s.codigo, descricao: s.descricao, principal: false })));
      setPrevAtividades(ativs);
    } catch {}
  };

  const consultarDesoneração = async () => {
    setDesoResult(null); setDesoError(""); setDesoLoading(true);
    try {
      const ncm = desoNcm.replace(/\D/g,"");
      if (ncm.length < 4) { setDesoError("Informe pelo menos 4 dígitos do NCM."); return; }
      const r = await fetch(`https://brasilapi.com.br/api/ncm/v1/${ncm}`);
      if (!r.ok) throw new Error("NCM não encontrado");
      const d = await r.json();
      const ncm8 = String(d.codigo || ncm);
      const setor = CPRB_SETORES.find(s => s.ids.some(id => ncm8.startsWith(id.substring(0,4))));
      setDesoResult({ ncm: d, setor });
    } catch (e: any) {
      setDesoError(e.message || "Erro ao consultar NCM.");
    } finally {
      setDesoLoading(false);
    }
  };

  const regimeCliente = clienteById(regimeEmpresa);
  const regimeInfo = regimeCliente?.regimeTributario ? REGIMES_INFO[regimeCliente.regimeTributario] : null;

  const fatCliente = clienteById(fatEmpresa);
  const fatConsultas = consultas.filter(c => fatEmpresa ? String(c.clienteId) === fatEmpresa : true)
    .filter(c => c.dataConsulta?.includes(fatPeriodo));

  if (!escritorioId) return <AppLayout title="Consultas Fiscais"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Consultas Fiscais">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Central de Consultas Fiscais</h1>
          <p className="text-sm text-muted-foreground">Ferramentas inteligentes para gestão tributária e fiscal</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? `${tab.cor} text-white shadow-lg`
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── FATURAMENTO ── */}
      {activeTab === "faturamento" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold text-foreground">Faturamento por Empresa</h2>
              </div>
              <p className="text-sm text-muted-foreground">Selecione a empresa e o período para visualizar</p>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={fatEmpresa} onValueChange={setFatEmpresa}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as empresas</SelectItem>
                    {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período (ano)</Label>
                <Input
                  value={fatPeriodo}
                  onChange={e => setFatPeriodo(e.target.value)}
                  className="bg-background"
                  placeholder="Ex: 2025"
                  maxLength={4}
                />
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {["Receita Federal","SPED","eSocial","DCTF"].map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                      <ExternalLink className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Resumo de Faturamento</h2>
              {!fatEmpresa ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione uma empresa para ver o resumo</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Os dados virão das consultas cadastradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fatCliente && (
                    <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                      <p className="font-medium text-foreground">{fatCliente.nomeFantasia || fatCliente.razaoSocial}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fatCliente.cnpj} · {fatCliente.regimeTributario || "Regime não informado"}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Consultas no período", value: String(fatConsultas.length), color: "text-blue-400" },
                      { label: "Concluídas", value: String(fatConsultas.filter(c=>c.status==="concluida").length), color: "text-green-400" },
                      { label: "Pendentes", value: String(fatConsultas.filter(c=>c.status==="pendente").length), color: "text-yellow-400" },
                      { label: "Com pendência", value: String(fatConsultas.filter(c=>c.status==="com_pendencia").length), color: "text-red-400" },
                    ].map(k => (
                      <div key={k.label} className="p-3 rounded-lg bg-secondary/30 text-center">
                        <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                      </div>
                    ))}
                  </div>
                  {fatConsultas.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhuma consulta registrada no período {fatPeriodo}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MEMÓRIA DE CÁLCULOS ── */}
      {activeTab === "memoria" && (
        <Card className="bg-card border-border/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-foreground text-lg">Memória de Cálculos Fiscais</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Tipo / descrição..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-background w-48" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={openNew} className="bg-primary shrink-0"><Plus className="w-4 h-4 mr-2" />Nova Consulta</Button>
              </div>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Calculator className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Consulta" para registrar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Consulta</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="border-border/50 hover:bg-secondary/40">
                      <TableCell className="font-medium text-foreground">{c.tipo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.descricao || "—"}</TableCell>
                      <TableCell className="text-sm">{c.dataConsulta || "—"}</TableCell>
                      <TableCell className="text-sm">{c.dataRetorno || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.responsavel || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${STATUS_MAP[c.status]?.color || ""}`}>{STATUS_MAP[c.status]?.label || c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => confirm("Excluir?") && del.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONSULTA CNAE ── */}
      {activeTab === "cnae" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-foreground">Consulta CNAE – Informações Tributárias</h2>
              </div>
              <p className="text-sm text-muted-foreground">Selecione uma empresa cadastrada ou pesquise manualmente</p>

              <div className="flex gap-2">
                {[{k:"empresa",l:"Por Empresa"},{k:"codigo",l:"Por Código"},{k:"descricao",l:"Por Descrição"}].map(m => (
                  <button
                    key={m.k}
                    onClick={() => { setCnaeMode(m.k as any); setCnaeResult(null); setCnaeError(""); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cnaeMode === m.k ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              {cnaeMode === "empresa" && (
                <div className="space-y-2">
                  <Label>Selecione a empresa</Label>
                  <Select value={cnaeEmpresa} onValueChange={setCnaeEmpresa}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione uma empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cliente cadastrado</SelectItem>}
                      {clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cnaeMode === "codigo" && (
                <div className="space-y-2">
                  <Label>Código CNAE</Label>
                  <Input value={cnaeCodigo} onChange={e=>setCnaeCodigo(e.target.value)} className="bg-background font-mono" placeholder="Ex: 6201-5/00" maxLength={10} />
                </div>
              )}

              {cnaeMode === "descricao" && (
                <div className="space-y-2">
                  <Label>Descrição da atividade</Label>
                  <Input value={cnaeDescricao} onChange={e=>setCnaeDescricao(e.target.value)} className="bg-background" placeholder="Ex: desenvolvimento de software" />
                </div>
              )}

              <Button onClick={buscarCnae} disabled={cnaeLoading} className="w-full bg-purple-600 hover:bg-purple-700">
                {cnaeLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Consultando...</> : <><Search className="w-4 h-4 mr-2" />Consultar CNAE</>}
              </Button>

              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { l:"IBGE", url:"https://cnae.ibge.gov.br" },
                    { l:"Simples Nacional", url:"https://www8.receita.fazenda.gov.br/SimplesNacional" },
                    { l:"MEI", url:"https://mei.receita.economia.gov.br" },
                    { l:"LC 116/ISS", url:"https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm" },
                  ].map(f => (
                    <a key={f.l} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                      <ExternalLink className="w-3 h-3" />{f.l}
                    </a>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Informações Tributárias</h2>
              </div>
              {cnaeError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{cnaeError}</div>
              )}
              {!cnaeResult && !cnaeError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione um CNAE para ver as informações tributárias</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Use a busca por empresa ou digite o código manualmente</p>
                </div>
              )}
              {cnaeResult?.tipo === "empresa" && cnaeResult.data && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                    <p className="font-semibold text-foreground">{cnaeResult.data.razao_social}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {cnaeResult.data.cnpj}</p>
                    <Badge variant="outline" className={`mt-2 text-xs ${cnaeResult.data.situacao_cadastral === "ATIVA" ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}`}>{cnaeResult.data.situacao_cadastral}</Badge>
                  </div>
                  {cnaeResult.data.cnae_fiscal && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">CNAE Fiscal Principal</p>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <p className="text-sm font-mono text-purple-300">{cnaeResult.data.cnae_fiscal}</p>
                        <p className="text-sm text-foreground mt-1">{cnaeResult.data.cnae_fiscal_descricao}</p>
                      </div>
                    </div>
                  )}
                  {cnaeResult.data.cnae_fiscais_secundarios?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">CNAEs Secundários ({cnaeResult.data.cnae_fiscais_secundarios.length})</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {cnaeResult.data.cnae_fiscais_secundarios.map((s: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-secondary/40 text-xs">
                            <span className="font-mono text-purple-300 mr-2">{s.codigo}</span>
                            <span className="text-muted-foreground">{s.descricao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cnaeResult.data.natureza_juridica && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-secondary/30">
                        <p className="text-muted-foreground">Natureza Jurídica</p>
                        <p className="text-foreground mt-0.5">{cnaeResult.data.natureza_juridica}</p>
                      </div>
                      <div className="p-2 rounded bg-secondary/30">
                        <p className="text-muted-foreground">Porte</p>
                        <p className="text-foreground mt-0.5">{cnaeResult.data.porte || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {cnaeResult?.tipo === "codigo" && cnaeResult.data && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">Código CNAE</p>
                    <p className="font-mono text-lg text-purple-300">{cnaeResult.data.id || cnaeResult.data.codigo}</p>
                    <p className="text-foreground font-medium mt-1">{cnaeResult.data.descricao}</p>
                  </div>
                  {cnaeResult.data.observacoes && <p className="text-xs text-muted-foreground p-2 bg-secondary/30 rounded">{cnaeResult.data.observacoes}</p>}
                </div>
              )}
              {cnaeResult?.tipo === "descricao" && Array.isArray(cnaeResult.data) && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cnaeResult.data.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">Nenhum CNAE encontrado para essa descrição</p>
                  ) : cnaeResult.data.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/40 border border-border/50 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-purple-300">{item.id || item.codigo}</p>
                        <p className="text-sm text-foreground mt-0.5">{item.descricao}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REGIME PREVIDENCIÁRIO ── */}
      {activeTab === "previdenciario" && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 border-b border-border/50 pb-0">
            {[
              { k:"ratfap", l:"RAT/FAP por CNAE" },
              { k:"deso",   l:"Desoneração por NCM" },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setPrevSubTab(t.k as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${prevSubTab === t.k ? "border-orange-500 text-orange-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* ── RAT/FAP por CNAE ── */}
          {prevSubTab === "ratfap" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-2 text-sm text-orange-200">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-orange-400" />
                <span>Consulta às alíquotas RAT (Risco Ambiental do Trabalho), FPAS e contribuições de terceiros pelo CNAE da empresa. FAP (Fator Acidentário de Prevenção) varia de 0,5 a 3,0 conforme o histórico da empresa.</span>
              </div>

              <Card className="bg-card border-border/50">
                <CardContent className="p-6 space-y-4">
                  {/* Row 1: empresa + CNAE */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-1.5">
                      <Label>Selecionar Empresa</Label>
                      <Select value={prevEmpresa} onValueChange={onPrevEmpresaChange}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione uma empresa cadastrada..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cliente cadastrado</SelectItem>}
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nomeFantasia || c.razaoSocial}{c.cnpj ? ` – CNPJ: ${c.cnpj.slice(-4)}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>CNAE (4 primeiros dígitos)</Label>
                      <Input
                        value={prevCnae4}
                        onChange={e => setPrevCnae4(e.target.value.replace(/\D/g,"").substring(0,4))}
                        className="bg-background font-mono"
                        placeholder="Ex: 6201"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  {/* Row 2: FAP + Atividades */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>FAP (Fator Acidentário) <span className="text-muted-foreground text-xs">0,5 a 3,0</span></Label>
                      <Input
                        type="number"
                        value={prevFap}
                        onChange={e => setPrevFap(e.target.value)}
                        step="0.01" min="0.5" max="3.0"
                        className="bg-background font-mono"
                        placeholder="Ex: 1.00"
                      />
                    </div>
                    <div className="lg:col-span-2 space-y-1.5">
                      <Label>Atividades consolidadas da empresa</Label>
                      <div className="flex flex-wrap gap-2 min-h-[38px] items-center">
                        {prevAtividades.length === 0 && (
                          <span className="text-xs text-muted-foreground">Selecione uma empresa com CNPJ para carregar as atividades</span>
                        )}
                        {prevAtividades.map((a, i) => (
                          <span
                            key={i}
                            onClick={() => setPrevCnae4(String(a.codigo).replace(/\D/g,"").substring(0,4))}
                            className={`px-2.5 py-1 rounded-full text-xs font-mono cursor-pointer transition-colors ${a.principal ? "bg-orange-600 text-white" : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground"}`}
                            title={a.descricao}
                          >
                            {String(a.codigo).substring(0,4)}
                            {a.principal && " ★"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Consultar button */}
                  <Button
                    onClick={consultarRAT}
                    disabled={prevLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {prevLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Consultando CNAE...</> : <><Search className="w-4 h-4 mr-2" />Consultar CNAE</>}
                  </Button>

                  {prevError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{prevError}</div>
                  )}
                </CardContent>
              </Card>

              {/* Resultado */}
              {prevResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Resultado da Consulta
                    </h3>
                    <a
                      href={`https://www.previdencia.gov.br/a-previdencia/politicas-de-previdencia-social/saude-e-seguranca-do-trabalhador/`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />Relatório / Referência
                    </a>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* CNAE */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">CNAE</p>
                        <p className="text-2xl font-bold text-orange-400 font-mono">{prevResult.cnae4}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-tight">{prevResult.cnaeDesc || "Descrição não disponível"}</p>
                      </CardContent>
                    </Card>

                    {/* RAT Básico */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">RAT Básico</p>
                        <p className="text-2xl font-bold text-foreground">{prevResult.ratEntry.rat}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Risco Ambiental do Trabalho</p>
                        <Badge className={`mt-2 text-xs ${prevResult.ratEntry.grau === 1 ? "bg-green-500/20 text-green-400" : prevResult.ratEntry.grau === 2 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`} variant="outline">
                          Grau {prevResult.ratEntry.grau} – {prevResult.ratEntry.grau === 1 ? "Baixo Risco" : prevResult.ratEntry.grau === 2 ? "Médio Risco" : "Alto Risco"}
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* FAP */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">FAP</p>
                        <p className="text-2xl font-bold text-foreground">{prevResult.fap.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Fator Acidentário de Prevenção</p>
                        <Badge className={`mt-2 text-xs ${prevResult.fap < 1 ? "bg-green-500/20 text-green-400" : prevResult.fap === 1 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`} variant="outline">
                          {prevResult.fap < 1 ? "Bônus" : prevResult.fap === 1 ? "Neutro" : "Agravo"}
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* RAT Ajustado */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">RAT Ajustado (RAT × FAP)</p>
                        <p className="text-2xl font-bold text-orange-400">{prevResult.ratAjustado.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{prevResult.ratEntry.rat}% × {prevResult.fap.toFixed(2)}</p>
                      </CardContent>
                    </Card>

                    {/* FPAS */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">FPAS</p>
                        <p className="text-2xl font-bold text-foreground font-mono">{prevResult.fpasEntry.fpas}</p>
                        <p className="text-xs text-muted-foreground mt-1">{prevResult.fpasEntry.descricao}</p>
                      </CardContent>
                    </Card>

                    {/* Terceiros */}
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Terceiros (Sistema S)</p>
                        <p className="text-2xl font-bold text-foreground">{prevResult.totalTerceiros.toFixed(1)}%</p>
                        <div className="mt-2 space-y-0.5">
                          {prevResult.fpasEntry.entidades.map((e: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{e.entidade}:</span>
                              <span className="text-foreground font-mono">{e.aliquota.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Simples Nacional Anexo */}
                  {prevResult.simplesAnexo && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            Anexo do Simples Nacional
                            {prevResult.simplesAnexo.sujetoFatorR && (
                              <Badge className="ml-1 text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30" variant="outline">Sujeito ao Fator R</Badge>
                            )}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            Anexo <span className="text-orange-400">{prevResult.simplesAnexo.anexo}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{prevResult.simplesAnexo.descricao}</p>
                          {prevResult.simplesAnexo.sujetoFatorR && (
                            <p className="text-xs text-yellow-400/80 mt-1">
                              ℹ Se Fator R ≥ 28%: tributado no Anexo III · Se Fator R &lt; 28%: Anexo V
                            </p>
                          )}
                        </div>
                        <FileText className="w-8 h-8 text-muted-foreground/30 shrink-0" />
                      </CardContent>
                    </Card>
                  )}

                  {/* Total Patronal */}
                  <Card className="bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          Total Patronal sobre a folha
                          <span className="text-[10px] text-orange-400/70">(INSS 20% + RAT {prevResult.ratAjustado.toFixed(2)}% + Terceiros {prevResult.totalTerceiros.toFixed(1)}%)</span>
                        </p>
                        <p className="text-3xl font-bold text-orange-400">{prevResult.totalPatronal.toFixed(2)}%</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-end items-center gap-2"><span>INSS Patronal:</span><span className="font-mono text-foreground">20,00%</span></div>
                        <div className="flex justify-end items-center gap-2"><span>RAT Ajustado:</span><span className="font-mono text-foreground">{prevResult.ratAjustado.toFixed(2)}%</span></div>
                        <div className="flex justify-end items-center gap-2"><span>Sistema S:</span><span className="font-mono text-foreground">{prevResult.totalTerceiros.toFixed(1)}%</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* ── DESONERAÇÃO POR NCM ── */}
          {prevSubTab === "deso" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2 text-sm text-blue-200">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                <span>A Desoneração da Folha (CPRB – Lei 12.546/2011) permite substituir a contribuição patronal de 20% sobre a folha por uma alíquota sobre a Receita Bruta (1% a 4,5%), para empresas de determinados setores. Consulte pelo código NCM ou CNAE da atividade.</span>
              </div>

              <Card className="bg-card border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Código NCM ou CNAE da atividade</Label>
                    <div className="flex gap-2">
                      <Input
                        value={desoNcm}
                        onChange={e => setDesoNcm(e.target.value)}
                        className="bg-background font-mono"
                        placeholder="Ex: 6201 (CNAE) ou 8471.30 (NCM)"
                        maxLength={12}
                      />
                      <Button onClick={consultarDesoneração} disabled={desoLoading} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                        {desoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {desoError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{desoError}</div>
                  )}

                  {/* Tabela de setores desonerados */}
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Setores com CPRB (Lei 12.546/2011)</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {CPRB_SETORES.map((s, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer"
                          onClick={() => setDesoNcm(s.ids[0])}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.exemplo}</p>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 shrink-0" variant="outline">
                            {s.aliquota}% CPRB
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resultado da Desoneração */}
              {desoResult && (
                <div className="space-y-3">
                  {desoResult.ncm && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-2">NCM Consultado</p>
                        <p className="font-mono text-lg text-foreground">{desoResult.ncm.codigo}</p>
                        <p className="text-sm text-muted-foreground mt-1">{desoResult.ncm.descricao}</p>
                      </CardContent>
                    </Card>
                  )}

                  {desoResult.setor ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card className="bg-green-500/5 border-green-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <p className="font-semibold text-green-400">Atividade Desonerada</p>
                          </div>
                          <p className="text-sm text-foreground">{desoResult.setor.descricao}</p>
                          <p className="text-3xl font-bold text-green-400 mt-3">{desoResult.setor.aliquota}%</p>
                          <p className="text-xs text-muted-foreground">CPRB sobre Receita Bruta</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-border/50">
                        <CardContent className="p-4">
                          <p className="text-sm font-semibold text-foreground mb-3">Comparativo de Custo</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center p-2 rounded bg-red-500/10">
                              <span className="text-muted-foreground">Regime Normal (INSS Patronal):</span>
                              <span className="font-bold text-red-400">20% folha</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-green-500/10">
                              <span className="text-muted-foreground">CPRB (Desoneração):</span>
                              <span className="font-bold text-green-400">{desoResult.setor.aliquota}% receita</span>
                            </div>
                            <div className="p-2 rounded bg-secondary/40 text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Quando vale a pena?</p>
                              <p>Folha &gt; {((desoResult.setor.aliquota / 20) * 100).toFixed(0)}% da receita bruta → CPRB é mais vantajosa</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="bg-yellow-500/5 border-yellow-500/30">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-400">Atividade não desonerada</p>
                          <p className="text-sm text-muted-foreground mt-1">Esta atividade não consta na lista de setores beneficiados pela CPRB (Lei 12.546/2011). Contribuição patronal normal: 20% sobre a folha de pagamento.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TRIBUTAÇÃO NCM/CFOP ── */}
      {activeTab === "ncm" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-red-400" />
                <h2 className="font-semibold text-foreground">Tributação NCM / CFOP</h2>
              </div>
              <p className="text-sm text-muted-foreground">Consulte a tributação por código NCM ou CFOP</p>
              <div className="space-y-2">
                <Label>Código NCM</Label>
                <div className="flex gap-2">
                  <Input
                    value={ncmCodigo}
                    onChange={e => setNcmCodigo(e.target.value)}
                    className="bg-background font-mono"
                    placeholder="Ex: 8471.30.19"
                    maxLength={12}
                  />
                  <Button onClick={buscarNcm} disabled={ncmLoading} className="bg-red-600 hover:bg-red-700 shrink-0">
                    {ncmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">CFOP Comuns – Referência Rápida</p>
                <div className="space-y-1">
                  {[
                    ["1.101","Compra para industrialização"],
                    ["1.102","Compra para comercialização"],
                    ["5.101","Venda de produção do estabelecimento"],
                    ["5.102","Venda de mercadoria adquirida"],
                    ["5.405","Venda de mercadoria sujeita a ST"],
                    ["6.101","Venda interestadual de produção"],
                  ].map(([cod,desc]) => (
                    <div key={cod} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-red-300 w-12 shrink-0">{cod}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Fontes Oficiais:</p>
                <div className="flex flex-wrap gap-3">
                  {["TIPI","Receita Federal","SEFAZ","CEST"].map(f => (
                    <span key={f} className="flex items-center gap-1 text-xs text-blue-400 cursor-pointer hover:underline">
                      <ExternalLink className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Informações do NCM</h2>
              </div>
              {ncmError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">{ncmError}</div>
              )}
              {!ncmResult && !ncmError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Informe o código NCM para consultar</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Você verá a descrição e tributação associada</p>
                </div>
              )}
              {ncmResult && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Código NCM</p>
                    <p className="font-mono text-lg text-red-300">{ncmResult.codigo}</p>
                    <p className="text-foreground font-medium mt-1">{ncmResult.descricao}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l:"II (Imp. Importação)", v: ncmResult.aliquota_ii ? `${ncmResult.aliquota_ii}%` : "—" },
                      { l:"IPI", v: ncmResult.aliquota_ipi ? `${ncmResult.aliquota_ipi}%` : "—" },
                      { l:"PIS/PASEP", v: "0,65% / 1,65%" },
                      { l:"COFINS", v: "3% / 7,6%" },
                    ].map(k => (
                      <div key={k.l} className="p-3 rounded-lg bg-secondary/30 text-center">
                        <p className="text-xs text-muted-foreground">{k.l}</p>
                        <p className="text-lg font-bold text-foreground mt-1">{k.v}</p>
                      </div>
                    ))}
                  </div>
                  {ncmResult.data_inicio && (
                    <p className="text-xs text-muted-foreground">Vigência desde: {ncmResult.data_inicio}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DIFAL / ICMS UF ── */}
      {activeTab === "difal" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <h2 className="font-semibold text-foreground">DIFAL – Diferencial de Alíquota ICMS</h2>
              </div>
              <p className="text-sm text-muted-foreground">Calcule o diferencial de alíquota entre estados (EC 87/2015)</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>UF Origem (remetente)</Label>
                  <Select value={difalOrigem} onValueChange={setDifalOrigem}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf} ({ICMS_RATES[uf]}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>UF Destino (destinatário)</Label>
                  <Select value={difalDestino} onValueChange={setDifalDestino}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf} ({ICMS_RATES[uf]}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da Operação (R$)</Label>
                <Input
                  value={difalValor}
                  onChange={e => setDifalValor(e.target.value)}
                  className="bg-background font-mono"
                  placeholder="Ex: 10000,00"
                />
              </div>

              <Button onClick={calcularDifal} disabled={!difalOrigem || !difalDestino || !difalValor} className="w-full bg-sky-600 hover:bg-sky-700">
                <Calculator className="w-4 h-4 mr-2" />Calcular DIFAL
              </Button>

              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground mb-2">Alíquotas Interestaduais (EC 87/2015)</p>
                <p className="text-muted-foreground">• 12% — Operações entre estados do Sul e Sudeste</p>
                <p className="text-muted-foreground">• 7% — Operações para estados do Norte, Nordeste, CO e ES</p>
                <p className="text-muted-foreground">• FECP: 2% (varia por estado)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Resultado do Cálculo</h2>
              </div>
              {!difalResult ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">Preencha os campos e clique em calcular</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Base: EC 87/2015 e Convênio ICMS 93/2015</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">UF Origem</p>
                      <p className="text-xl font-bold text-foreground">{difalOrigem}</p>
                      <p className="text-xs text-sky-400">{difalResult.icmsOrigem}% ICMS</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">UF Destino</p>
                      <p className="text-xl font-bold text-foreground">{difalDestino}</p>
                      <p className="text-xs text-sky-400">{difalResult.icmsDestino}% ICMS</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { l:"Valor da Operação",       v: `R$ ${difalResult.valor.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, cor:"text-foreground" },
                      { l:"Alíq. Interestadual",     v: `${difalResult.aliqInterestadual}%`,                                          cor:"text-muted-foreground" },
                      { l:"DIFAL (ICMS Diferencial)",v: `R$ ${difalResult.difal.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, cor:"text-sky-400" },
                      { l:"FECP (2%)",               v: `R$ ${difalResult.fecp.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,  cor:"text-yellow-400" },
                    ].map(k => (
                      <div key={k.l} className="flex items-center justify-between p-2.5 rounded bg-secondary/30">
                        <p className="text-sm text-muted-foreground">{k.l}</p>
                        <p className={`text-sm font-semibold ${k.cor}`}>{k.v}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      <p className="text-sm font-semibold text-foreground">Total a Recolher</p>
                      <p className="text-lg font-bold text-sky-400">R$ {difalResult.total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    * Cálculo estimado. Confirme com a legislação estadual vigente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DIALOG NOVA/EDITAR CONSULTA ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Editar Consulta" : "Nova Consulta Fiscal"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v=>setForm(p=>({...p,tipo:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_MAP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao||""} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="bg-background resize-none" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Consulta</Label><Input value={form.dataConsulta||""} onChange={e=>setForm(p=>({...p,dataConsulta:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
              <div className="space-y-2"><Label>Data Retorno</Label><Input value={form.dataRetorno||""} onChange={e=>setForm(p=>({...p,dataRetorno:formatters.date(e.target.value)}))} className="bg-background font-mono" placeholder="DD/MM/AAAA" maxLength={10} /></div>
            </div>
            <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel||""} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="bg-background" /></div>
            <div className="space-y-2"><Label>Resultado</Label><Textarea value={form.resultado||""} onChange={e=>setForm(p=>({...p,resultado:e.target.value}))} className="bg-background resize-none" rows={3} placeholder="Registre o resultado da consulta..." /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes||""} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="bg-background resize-none" rows={2} /></div>
            <Button onClick={() => save.mutate(form)} disabled={!form.tipo} className="w-full bg-primary">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
