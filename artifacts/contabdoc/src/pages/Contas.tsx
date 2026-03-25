import { useState, useMemo, useRef, useCallback } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { SemEscritorio } from "@/components/SemEscritorio";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Loader2, Plus, Edit, Trash2, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Search, DollarSign, Filter,
  Calendar, FileText, CreditCard, Receipt, Download,
  Bell, LayoutGrid, List, ArrowUpDown, Clock, XCircle,
  Building2, Eye, Send, X, ChevronDown, Sparkles, User,
  Tag, Upload, Paperclip, Percent, FileDown, Barcode,
  QrCode, Store
} from "lucide-react";

interface Conta {
  id: number;
  escritorioId: number;
  clienteId?: number;
  tipo: string;
  descricao: string;
  valor?: string;
  categoria?: string;
  competencia?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  dataEmissao?: string;
  status: string;
  formaPagamento?: string;
  numeroDocumento?: string;
  parcela?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Cliente {
  id: number;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cpf?: string;
}

interface ServicoItem {
  id: string;
  descricao: string;
  valor: string;
}

interface HonorariosForm {
  clienteId: string;
  mes: string;
  ano: string;
  dataEmissao: string;
  dataVencimento: string;
  numeroRecibo: string;
  servicos: ServicoItem[];
  formaPagamento: string;
  descontoValor: string;
  descontoTipo: "fixo" | "percentual";
  descontoPrazo: string;
  observacoes: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const BANCOS_PAGAMENTO = [
  "Pix", "Boleto Bancário", "Transferência Bancária",
  "Cartão de Crédito", "Cartão de Débito",
  "Asaas", "Efí Pay (Gerencianet)", "Banco Inter", "Mercado Pago",
  "Débito Automático", "Depósito", "Dinheiro", "Cheque",
];

const emptyHonorarios = (): HonorariosForm => {
  const now = new Date();
  return {
    clienteId: "",
    mes: MESES[now.getMonth()],
    ano: String(now.getFullYear()),
    dataEmissao: now.toLocaleDateString("pt-BR"),
    dataVencimento: "",
    numeroRecibo: "",
    servicos: [{ id: crypto.randomUUID(), descricao: "", valor: "" }],
    formaPagamento: "",
    descontoValor: "",
    descontoTipo: "fixo",
    descontoPrazo: "",
    observacoes: "",
  };
};


const STATUS_MAP: Record<string, { label: string; color: string; dotColor: string; icon: any }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dotColor: "bg-yellow-400", icon: Clock },
  pago:      { label: "Pago",      color: "bg-green-500/20 text-green-400 border-green-500/30",   dotColor: "bg-green-400",  icon: CheckCircle2 },
  vencido:   { label: "Vencido",   color: "bg-red-500/20 text-red-400 border-red-500/30",         dotColor: "bg-red-400",    icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30",      dotColor: "bg-gray-400",   icon: XCircle },
  parcial:   { label: "Parcial",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30",      dotColor: "bg-blue-400",   icon: CreditCard },
};

const CATEGORIAS = [
  "Honorários", "Mensalidade", "Consultoria", "Certidão", "Alvará",
  "Imposto", "Taxa", "Folha de Pagamento", "Aluguel", "Energia",
  "Internet", "Telefone", "Material", "Software", "Marketing", "Outros",
];

const PERIODOS = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
];

function parseCurrency(v?: string): number {
  if (!v) return 0;
  const n = v.replace(/[^\d]/g, "");
  return parseFloat(n) / 100 || 0;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isVencido(c: Conta): boolean {
  if (c.status === "pago" || c.status === "cancelado") return false;
  if (!c.dataVencimento) return false;
  const digits = c.dataVencimento.replace(/\D/g, "");
  let dt: Date;
  if (digits.length === 8) {
    dt = new Date(parseInt(digits.slice(4, 8)), parseInt(digits.slice(2, 4)) - 1, parseInt(digits.slice(0, 2)));
  } else {
    dt = new Date(c.dataVencimento);
  }
  return dt < new Date(new Date().toDateString());
}

type ViewMode = "tabela" | "cards";

export default function ContasPage() {
  const { escritorioId } = useEscritorio();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"receber" | "pagar">("receber");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [periodoFilter, setPeriodoFilter] = useState("mes");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewMode>("tabela");
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [honorariosOpen, setHonorariosOpen] = useState(false);
  const [honorariosForm, setHonorariosForm] = useState<HonorariosForm>(emptyHonorarios());
  const [honorariosEditId, setHonorariosEditId] = useState<number | null>(null);
  const [anexo, setAnexo] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contaPagarOpen, setContaPagarOpen] = useState(false);
  const [contaPagarForm, setContaPagarForm] = useState({
    fornecedor: "", valor: "", categoria: "", dataVencimento: "",
    linhaDigitavel: "", pixCopiaCola: "", observacoes: "",
  });
  const [contaPagarAnexo, setContaPagarAnexo] = useState<File | null>(null);
  const [contaPagarDragOver, setContaPagarDragOver] = useState(false);
  const contaPagarFileRef = useRef<HTMLInputElement>(null);
  const [contaPagarEditId, setContaPagarEditId] = useState<number | null>(null);
  const [pagarOpen, setPagarOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [pagarTarget, setPagarTarget] = useState<Conta | null>(null);
  const [pagarForm, setPagarForm] = useState({ dataPagamento: "", formaPagamento: "", observacoes: "" });

  const { data: contas = [], isLoading } = useQuery<Conta[]>({
    queryKey: ["contas", escritorioId],
    queryFn: () => API.get(`/contas?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", escritorioId],
    queryFn: () => API.get(`/clientes?escritorioId=${escritorioId}`),
    enabled: !!escritorioId,
  });

  const save = useMutation({
    mutationFn: (data: Partial<Conta>) =>
      editId ? API.put(`/contas/${editId}`, data) : API.post("/contas", { ...data, escritorioId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas", escritorioId] });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => API.del(`/contas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas", escritorioId] });
      toast({ title: "Fatura excluída" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    contas.filter(c => {
      if (c.tipo !== tab) return false;
      const effectiveStatus = (c.status === "pendente" && isVencido(c)) ? "vencido" : c.status;
      if (statusFilter !== "todos" && statusFilter === "vencido" && effectiveStatus !== "vencido") return false;
      if (statusFilter !== "todos" && statusFilter !== "vencido" && c.status !== statusFilter) return false;
      if (categoriaFilter !== "todas" && c.categoria !== categoriaFilter) return false;
      if (clienteFilter !== "todos" && String(c.clienteId || "") !== clienteFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cn = clientes.find(x => x.id === c.clienteId);
        const nome = (cn?.razaoSocial || cn?.nomeFantasia || "").toLowerCase();
        if (!c.descricao.toLowerCase().includes(q) && !nome.includes(q) && !(c.numeroDocumento || "").toLowerCase().includes(q) && !(c.categoria || "").toLowerCase().includes(q)) return false;
      }
      return true;
    }), [contas, tab, statusFilter, categoriaFilter, clienteFilter, search, clientes]);

  const soma = (tipo: string, status?: string | string[]) =>
    contas.filter(c => c.tipo === tipo && (!status || (Array.isArray(status) ? status.includes(c.status) : c.status === status)))
      .reduce((acc, c) => acc + parseCurrency(c.valor), 0);

  const somaVencidos = (tipo: string) =>
    contas.filter(c => c.tipo === tipo && isVencido(c)).reduce((acc, c) => acc + parseCurrency(c.valor), 0);

  const nomeCliente = (id?: number) => {
    if (!id) return "—";
    const c = clientes.find(x => x.id === id);
    return c ? (c.razaoSocial || c.nomeFantasia || `#${id}`) : `#${id}`;
  };

  const openEdit = (c: Conta) => {
    if (c.tipo === "receber") {
      setHonorariosEditId(c.id);
      const obsLines = (c.observacoes || "").split("\n");
      const servicos: ServicoItem[] = [];
      let formaPag = c.formaPagamento || "";
      let descontoVal = "";
      let descontoTip: "fixo" | "percentual" = "fixo";
      let obsFinal = "";
      for (const line of obsLines) {
        const match = line.match(/^(.+):\s*(R\$\s*[\d.,]+)$/);
        if (match && !line.startsWith("Desconto:") && !line.startsWith("Pagamento:") && !line.startsWith("Arquivo anexo:") && !line.startsWith("Obs:")) {
          servicos.push({ id: crypto.randomUUID(), descricao: match[1].trim(), valor: match[2].trim() });
        } else if (line.startsWith("Desconto:")) {
          const dMatch = line.match(/Desconto:\s*-?(R\$\s*[\d.,]+)\s*\((.+)\)/);
          if (dMatch) {
            descontoVal = dMatch[1].trim();
            descontoTip = dMatch[2].includes("percentual") || dMatch[2].includes("%") ? "percentual" : "fixo";
            if (descontoTip === "percentual") {
              const pctMatch = dMatch[2].match(/([\d.,]+)%/);
              if (pctMatch) descontoVal = pctMatch[1];
            }
          }
        } else if (line.startsWith("Pagamento:")) {
          formaPag = line.replace("Pagamento:", "").trim();
        } else if (line.startsWith("Obs:")) {
          obsFinal = line.replace("Obs:", "").trim();
        }
      }
      if (servicos.length === 0) {
        servicos.push({ id: crypto.randomUUID(), descricao: c.descricao.replace(/^Honorários\s*-\s*/, ""), valor: c.valor || "" });
      }
      const compParts = (c.competencia || "").split("/");
      const mesIdx = compParts[0] ? parseInt(compParts[0]) - 1 : new Date().getMonth();
      setHonorariosForm({
        clienteId: c.clienteId ? String(c.clienteId) : "",
        mes: MESES[mesIdx] || MESES[0],
        ano: compParts[1] || String(new Date().getFullYear()),
        dataEmissao: c.dataEmissao || new Date().toLocaleDateString("pt-BR"),
        dataVencimento: c.dataVencimento || "",
        numeroRecibo: c.numeroDocumento || "",
        servicos,
        formaPagamento: formaPag,
        descontoValor: descontoVal,
        descontoTipo: descontoTip,
        descontoPrazo: "",
        observacoes: obsFinal,
      });
      setAnexo(null);
      setHonorariosOpen(true);
    } else {
      setContaPagarEditId(c.id);
      const obsLines = (c.observacoes || "").split("\n");
      let linha = "", pix = "", obs = "";
      for (const line of obsLines) {
        if (line.startsWith("Linha Digitável:")) linha = line.replace("Linha Digitável:", "").trim();
        else if (line.startsWith("PIX:")) pix = line.replace("PIX:", "").trim();
        else if (line.startsWith("Arquivo:")) { /* skip */ }
        else if (line.trim()) obs += (obs ? "\n" : "") + line;
      }
      setContaPagarForm({
        fornecedor: c.descricao || "",
        valor: c.valor || "",
        categoria: c.categoria || "",
        dataVencimento: c.dataVencimento || "",
        linhaDigitavel: linha,
        pixCopiaCola: pix,
        observacoes: obs,
      });
      setContaPagarAnexo(null);
      setContaPagarOpen(true);
    }
  };

  const openHonorarios = () => {
    setHonorariosEditId(null);
    setHonorariosForm(emptyHonorarios());
    setAnexo(null);
    setHonorariosOpen(true);
  };

  const openContaPagar = () => {
    setContaPagarEditId(null);
    setContaPagarForm({ fornecedor: "", valor: "", categoria: "", dataVencimento: "", linhaDigitavel: "", pixCopiaCola: "", observacoes: "" });
    setContaPagarAnexo(null);
    setContaPagarOpen(true);
  };

  const handleContaPagarSave = () => {
    if (!contaPagarForm.fornecedor.trim()) {
      toast({ title: "Informe o nome do fornecedor", variant: "destructive" });
      return;
    }
    if (!contaPagarForm.dataVencimento) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }
    const obsLines: string[] = [];
    if (contaPagarForm.linhaDigitavel) obsLines.push(`Linha Digitável: ${contaPagarForm.linhaDigitavel}`);
    if (contaPagarForm.pixCopiaCola) obsLines.push(`PIX: ${contaPagarForm.pixCopiaCola}`);
    if (contaPagarAnexo) obsLines.push(`Arquivo: ${contaPagarAnexo.name}`);
    if (contaPagarForm.observacoes) obsLines.push(contaPagarForm.observacoes);

    const payload: Partial<Conta> = {
      tipo: "pagar",
      status: "pendente",
      descricao: contaPagarForm.fornecedor,
      valor: contaPagarForm.valor,
      categoria: contaPagarForm.categoria,
      dataVencimento: contaPagarForm.dataVencimento,
      observacoes: obsLines.join("\n"),
    };

    if (contaPagarEditId) {
      setEditId(contaPagarEditId);
      save.mutate(payload, {
        onSuccess: () => {
          setContaPagarOpen(false);
          setContaPagarEditId(null);
          setEditId(null);
        },
      });
    } else {
      setEditId(null);
      save.mutate(payload, {
        onSuccess: () => {
          setContaPagarOpen(false);
        },
      });
    }
  };

  const openPagar = (c: Conta) => {
    setPagarTarget(c);
    setPagarForm({
      dataPagamento: new Date().toLocaleDateString("pt-BR"),
      formaPagamento: c.formaPagamento || "",
      observacoes: "",
    });
    setPagarOpen(true);
  };

  const handleConfirmarPagamento = () => {
    if (!pagarTarget) return;
    if (!pagarForm.dataPagamento) {
      toast({ title: "Informe a data do pagamento", variant: "destructive" });
      return;
    }
    setEditId(pagarTarget.id);
    const obsUpdate = pagarTarget.observacoes
      ? pagarTarget.observacoes + (pagarForm.observacoes ? `\nPago: ${pagarForm.observacoes}` : "")
      : pagarForm.observacoes || "";

    save.mutate({
      ...pagarTarget,
      status: "pago",
      dataPagamento: pagarForm.dataPagamento,
      formaPagamento: pagarForm.formaPagamento || pagarTarget.formaPagamento,
      observacoes: obsUpdate,
    }, {
      onSuccess: () => {
        setPagarOpen(false);
        setPagarTarget(null);
        setEditId(null);
      },
    });
  };

  const selectedClienteHon = clientes.find(c => String(c.id) === honorariosForm.clienteId);
  const clienteCnpjCpf = selectedClienteHon?.cnpj || selectedClienteHon?.cpf || "";

  const updateServico = (id: string, field: keyof ServicoItem, value: string) => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: prev.servicos.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  };

  const addServico = () => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: [...prev.servicos, { id: crypto.randomUUID(), descricao: "", valor: "" }],
    }));
  };

  const removeServico = (id: string) => {
    setHonorariosForm(prev => ({
      ...prev,
      servicos: prev.servicos.length > 1 ? prev.servicos.filter(s => s.id !== id) : prev.servicos,
    }));
  };

  const subtotalHonorarios = honorariosForm.servicos.reduce((acc, s) => acc + parseCurrency(s.valor), 0);

  const descontoCalculado = (() => {
    const dv = parseCurrency(honorariosForm.descontoValor);
    if (dv <= 0) return 0;
    if (honorariosForm.descontoTipo === "percentual") return subtotalHonorarios * (dv / 100);
    return dv;
  })();

  const totalHonorarios = Math.max(0, subtotalHonorarios - descontoCalculado);

  const openFilePreview = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewFile({ url, name: file.name, type: file.type });
  }, []);

  const closeFilePreview = useCallback(() => {
    if (previewFile) URL.revokeObjectURL(previewFile.url);
    setPreviewFile(null);
  }, [previewFile]);

  const extractFileData = useCallback(async (file: File, target: "honorarios" | "pagar") => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;

    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await API.post<{ dados: Record<string, string> }>("/extrair-fatura", {
        base64,
        mimeType: file.type,
        contexto: target === "honorarios" ? "cobrança de honorários" : "conta a pagar",
      });

      const d = result.dados;

      if (target === "pagar") {
        setContaPagarForm(prev => ({
          ...prev,
          ...(d.fornecedor && !prev.fornecedor ? { fornecedor: d.fornecedor } : {}),
          ...(d.valor && !prev.valor ? { valor: d.valor } : {}),
          ...(d.categoria && !prev.categoria ? { categoria: d.categoria } : {}),
          ...(d.dataVencimento && !prev.dataVencimento ? { dataVencimento: d.dataVencimento } : {}),
          ...(d.linhaDigitavel && !prev.linhaDigitavel ? { linhaDigitavel: d.linhaDigitavel } : {}),
          ...(d.pixCopiaCola && !prev.pixCopiaCola ? { pixCopiaCola: d.pixCopiaCola } : {}),
          ...(d.observacoes && !prev.observacoes ? { observacoes: d.observacoes } : {}),
        }));
      } else {
        setHonorariosForm(prev => {
          const updated = { ...prev };
          if (d.clienteNome && !prev.clienteId) {
            const match = clientes.find(c =>
              c.razaoSocial?.toLowerCase().includes(d.clienteNome.toLowerCase()) ||
              c.nomeFantasia?.toLowerCase().includes(d.clienteNome.toLowerCase())
            );
            if (match) updated.clienteId = String(match.id);
          }
          if (d.dataVencimento && !prev.dataVencimento) updated.dataVencimento = d.dataVencimento;
          if (d.competencia && !prev.competencia) updated.competencia = d.competencia;
          if (d.descricao && prev.servicos.length === 1 && !prev.servicos[0].descricao) {
            updated.servicos = [{ descricao: d.descricao, valor: d.valor || "" }];
          }
          if (d.observacoes && !prev.observacoes) updated.observacoes = d.observacoes;
          return updated;
        });
      }

      toast({ title: "Dados extraídos do documento!", description: "Verifique os campos preenchidos." });
    } catch (err: any) {
      toast({ title: "Não foi possível extrair dados", description: err.message || "Erro ao processar", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }, [clientes, toast]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setAnexo(file);
      extractFileData(file, "honorarios");
    }
  }, [extractFileData]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnexo(file);
      extractFileData(file, "honorarios");
    }
  }, [extractFileData]);

  const handleGerarCobranca = () => {
    if (!honorariosForm.clienteId) {
      toast({ title: "Selecione o cliente", variant: "destructive" });
      return;
    }
    if (!honorariosForm.dataVencimento) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }
    const servicosValidos = honorariosForm.servicos.filter(s => s.descricao.trim() && s.valor);
    if (servicosValidos.length === 0) {
      toast({ title: "Adicione pelo menos um serviço", variant: "destructive" });
      return;
    }

    const mesIdx = MESES.indexOf(honorariosForm.mes) + 1;
    const competencia = `${String(mesIdx).padStart(2, "0")}/${honorariosForm.ano}`;
    const descricaoServicos = servicosValidos.map(s => s.descricao).join(", ");

    const obsLines: string[] = [];
    servicosValidos.forEach(s => obsLines.push(`${s.descricao}: ${s.valor}`));
    if (descontoCalculado > 0) {
      obsLines.push(`Desconto: -${fmtCurrency(descontoCalculado)} (${honorariosForm.descontoTipo === "percentual" ? honorariosForm.descontoValor + "%" : "valor fixo"})`);
    }
    if (honorariosForm.formaPagamento) obsLines.push(`Pagamento: ${honorariosForm.formaPagamento}`);
    if (anexo) obsLines.push(`Arquivo anexo: ${anexo.name}`);
    if (honorariosForm.observacoes) obsLines.push(`Obs: ${honorariosForm.observacoes}`);

    if (honorariosEditId) {
      setEditId(honorariosEditId);
    } else {
      setEditId(null);
    }

    save.mutate({
      tipo: "receber",
      status: "pendente",
      descricao: `Honorários - ${descricaoServicos}`,
      valor: fmtCurrency(totalHonorarios),
      categoria: "Honorários",
      clienteId: parseInt(honorariosForm.clienteId),
      competencia,
      dataEmissao: honorariosForm.dataEmissao,
      dataVencimento: honorariosForm.dataVencimento,
      formaPagamento: honorariosForm.formaPagamento || undefined,
      numeroDocumento: honorariosForm.numeroRecibo || undefined,
      observacoes: obsLines.join("\n"),
    }, {
      onSuccess: () => {
        setHonorariosOpen(false);
        setHonorariosEditId(null);
        setAnexo(null);
        setEditId(null);
        toast({ title: honorariosEditId ? "Honorários atualizado!" : "Cobrança de honorários gerada!" });
      },
    });
  };

  const handleGerarRelatorio = () => {
    const servicosValidos = honorariosForm.servicos.filter(s => s.descricao.trim() && s.valor);
    if (!honorariosForm.clienteId || servicosValidos.length === 0) {
      toast({ title: "Preencha os dados do cliente e serviços para gerar o relatório", variant: "destructive" });
      return;
    }

    const cli = clientes.find(c => String(c.id) === honorariosForm.clienteId);
    const docNum = clienteCnpjCpf
      ? (clienteCnpjCpf.length > 11 ? formatters.cnpj(clienteCnpjCpf) : formatters.cpf(clienteCnpjCpf))
      : "N/A";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cobrança de Honorários</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1a2e;max-width:800px;margin:0 auto}
.header{text-align:center;border-bottom:3px solid #1a1a2e;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:24px;color:#1a1a2e} .header p{color:#666;font-size:14px;margin-top:4px}
.section{margin-bottom:24px} .section h2{font-size:16px;color:#1a1a2e;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px}
.row{display:flex;gap:20px;margin-bottom:8px} .row .label{font-weight:600;min-width:160px;color:#555;font-size:13px}
.row .value{color:#1a1a2e;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{background:#1a1a2e;color:white;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase}
td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
.total-row{background:#f0f7ff;font-weight:700}
.discount-row{color:#e74c3c}
.footer{margin-top:40px;text-align:center;color:#999;font-size:11px;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="header"><h1>COBRANÇA DE HONORÁRIOS</h1><p>Ref: ${honorariosForm.mes}/${honorariosForm.ano}</p></div>
<div class="section"><h2>Dados do Cliente</h2>
<div class="row"><span class="label">Razão Social:</span><span class="value">${cli?.razaoSocial || cli?.nomeFantasia || ""}</span></div>
<div class="row"><span class="label">CNPJ/CPF:</span><span class="value">${docNum}</span></div>
<div class="row"><span class="label">Competência:</span><span class="value">${honorariosForm.mes}/${honorariosForm.ano}</span></div>
<div class="row"><span class="label">Emissão:</span><span class="value">${honorariosForm.dataEmissao}</span></div>
<div class="row"><span class="label">Vencimento:</span><span class="value">${honorariosForm.dataVencimento || "—"}</span></div>
${honorariosForm.numeroRecibo ? `<div class="row"><span class="label">Nº Recibo:</span><span class="value">${honorariosForm.numeroRecibo}</span></div>` : ""}
${honorariosForm.formaPagamento ? `<div class="row"><span class="label">Forma de Pagamento:</span><span class="value">${honorariosForm.formaPagamento}</span></div>` : ""}
</div>
<div class="section"><h2>Serviços</h2>
<table><thead><tr><th>#</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead><tbody>
${servicosValidos.map((s, i) => `<tr><td>${i + 1}</td><td>${s.descricao}</td><td style="text-align:right">${s.valor}</td></tr>`).join("")}
${descontoCalculado > 0 ? `<tr class="discount-row"><td></td><td>Desconto ${honorariosForm.descontoTipo === "percentual" ? `(${honorariosForm.descontoValor}%)` : "(valor fixo)"}</td><td style="text-align:right">-${fmtCurrency(descontoCalculado)}</td></tr>` : ""}
<tr class="total-row"><td></td><td>TOTAL</td><td style="text-align:right">${fmtCurrency(totalHonorarios)}</td></tr>
</tbody></table></div>
${honorariosForm.observacoes ? `<div class="section"><h2>Observações</h2><p style="font-size:13px;color:#555">${honorariosForm.observacoes}</p></div>` : ""}
<div class="footer">Documento gerado pelo ContabDOC em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  if (!escritorioId) return <AppLayout title="Contas a Receber/Pagar"><SemEscritorio /></AppLayout>;

  return (
    <AppLayout title="Contas a Receber / Pagar">
      <div className="space-y-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total a Receber",
              value: fmtCurrency(soma("receber", "pendente")),
              sub: `${contas.filter(c => c.tipo === "receber" && c.status === "pendente").length} faturas`,
              icon: TrendingUp, color: "text-green-400", bg: "from-green-500/15 to-green-600/5", border: "border-green-500/20"
            },
            {
              label: "Total a Pagar",
              value: fmtCurrency(soma("pagar", "pendente")),
              sub: `${contas.filter(c => c.tipo === "pagar" && c.status === "pendente").length} faturas`,
              icon: TrendingDown, color: "text-red-400", bg: "from-red-500/15 to-red-600/5", border: "border-red-500/20"
            },
            {
              label: "Vencidos",
              value: fmtCurrency(somaVencidos("receber") + somaVencidos("pagar")),
              sub: `${contas.filter(c => isVencido(c)).length} faturas vencidas`,
              icon: AlertCircle, color: "text-yellow-400", bg: "from-yellow-500/15 to-yellow-600/5", border: "border-yellow-500/20"
            },
            {
              label: "Recebido (Mês)",
              value: fmtCurrency(soma("receber", "pago")),
              sub: `${contas.filter(c => c.tipo === "receber" && c.status === "pago").length} pagas`,
              icon: CheckCircle2, color: "text-primary", bg: "from-primary/15 to-primary/5", border: "border-primary/20"
            },
          ].map(k => (
            <Card key={k.label} className={`bg-gradient-to-br ${k.bg} border ${k.border} shadow-lg`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{k.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center`}>
                    <k.icon className={`w-5 h-5 ${k.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border/40 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-border/30">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, fatura ou contrato..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 bg-background h-10"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`gap-1.5 ${showFilters ? "bg-primary/10 border-primary/30 text-primary" : ""}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {statusFilter === "todos" ? "Todos" : statusFilter === "vencido" ? "Pendentes e Vencidos" : STATUS_MAP[statusFilter]?.label || statusFilter}
                  <ChevronDown className="w-3 h-3" />
                </Button>

                <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                  <SelectTrigger className="w-32 h-9 bg-background text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex bg-secondary/50 rounded-lg border border-border/40 p-0.5">
                  <button
                    onClick={() => setViewMode("tabela")}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "tabela" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-6 w-px bg-border/40 hidden lg:block" />

                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="bg-secondary/50 border border-border/40 h-9">
                    <TabsTrigger value="receber" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-xs h-7">
                      <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Receber
                    </TabsTrigger>
                    <TabsTrigger value="pagar" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs h-7">
                      <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Pagar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {tab === "receber" ? (
                  <Button onClick={openHonorarios} className="bg-gradient-to-r from-primary to-indigo-600 gap-1.5 shrink-0 h-9 text-sm">
                    <Sparkles className="w-4 h-4" /> Gerar Honorários
                  </Button>
                ) : (
                  <Button onClick={openContaPagar} className="bg-gradient-to-r from-red-600 to-rose-600 gap-1.5 shrink-0 h-9 text-sm">
                    <Plus className="w-4 h-4" /> Nova Conta
                  </Button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/20">
                <Badge
                  variant="outline"
                  className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === "todos" ? "bg-primary/15 text-primary border-primary/30" : "hover:bg-white/5"}`}
                  onClick={() => setStatusFilter("todos")}
                >
                  Todos
                </Badge>
                <Badge
                  variant="outline"
                  className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === "vencido" ? "bg-red-500/15 text-red-400 border-red-500/30" : "hover:bg-white/5"}`}
                  onClick={() => setStatusFilter(statusFilter === "vencido" ? "todos" : "vencido")}
                >
                  Pendentes e Vencidos
                </Badge>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <Badge
                    key={k}
                    variant="outline"
                    className={`cursor-pointer transition-colors text-xs px-3 py-1 ${statusFilter === k ? v.color : "hover:bg-white/5"}`}
                    onClick={() => setStatusFilter(statusFilter === k ? "todos" : k)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${v.dotColor} mr-1.5`} />
                    {v.label}
                  </Badge>
                ))}
                <div className="h-5 w-px bg-border/40" />
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-36 h-7 bg-background text-xs border-dashed">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas categorias</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="w-44 h-7 bg-background text-xs border-dashed">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <DollarSign className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhuma fatura encontrada</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {contas.filter(c => c.tipo === tab).length === 0 ? "Crie a primeira fatura" : "Ajuste os filtros de busca"}
                </p>
              </div>
            ) : viewMode === "tabela" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 bg-muted/20">
                      <TableHead className="w-[28%]">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">Descrição</span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <span className="text-[11px] uppercase tracking-wider">Cliente</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Categoria</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">Valor</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Vencimento</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Competência</span>
                      </TableHead>
                      <TableHead>
                        <span className="text-[11px] uppercase tracking-wider">Status</span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="text-[11px] uppercase tracking-wider">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const vencido = isVencido(c);
                      const effectiveStatus = vencido && c.status === "pendente" ? "vencido" : c.status;
                      const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pendente;
                      return (
                        <TableRow key={c.id} className="border-border/20 hover:bg-white/3 group">
                          <TableCell className="py-3.5">
                            <div>
                              <p className="font-medium text-foreground text-sm">{c.descricao}</p>
                              {c.numeroDocumento && (
                                <span className="text-[10px] text-muted-foreground font-mono">Doc: {c.numeroDocumento}</span>
                              )}
                              {c.parcela && (
                                <span className="text-[10px] text-muted-foreground ml-2">Parcela: {c.parcela}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">{nomeCliente(c.clienteId)}</span>
                          </TableCell>
                          <TableCell>
                            {c.categoria && (
                              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">{c.categoria}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`font-mono font-semibold text-sm ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                              {c.valor || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-mono ${vencido ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                              {vencido && <AlertCircle className="w-3 h-3 inline mr-1" />}
                              {c.dataVencimento || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-mono">{c.competencia || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor} mr-1`} />
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {c.status === "pendente" && (
                                <Button
                                  variant="ghost" size="icon"
                                  onClick={() => openPagar(c)}
                                  className="h-7 w-7 text-green-400 hover:bg-green-500/10"
                                  title="Registrar Pagamento"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-7 w-7 text-muted-foreground hover:text-white">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setDeleteTarget({ id: c.id, name: c.descricao })}
                                className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {filtered.map(c => {
                  const vencido = isVencido(c);
                  const effectiveStatus = vencido && c.status === "pendente" ? "vencido" : c.status;
                  const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pendente;
                  return (
                    <Card key={c.id} className={`bg-card border-border/30 hover:border-border/50 transition-all group ${vencido ? "border-red-500/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-sm text-foreground">{c.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{nomeCliente(c.clienteId)}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${st.color} shrink-0`}>
                            {st.label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-bold text-lg ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                            {c.valor || "R$ 0,00"}
                          </span>
                          <span className={`text-xs font-mono ${vencido ? "text-red-400" : "text-muted-foreground"}`}>
                            {c.dataVencimento || "—"}
                          </span>
                        </div>
                        {(c.categoria || c.competencia) && (
                          <div className="flex items-center gap-2 mt-2">
                            {c.categoria && <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">{c.categoria}</span>}
                            {c.competencia && <span className="text-[10px] text-primary/70 font-mono">{c.competencia}</span>}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status === "pendente" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-400 hover:bg-green-500/10 gap-1"
                              onClick={() => openPagar(c)}>
                              <CheckCircle2 className="w-3 h-3" /> Pagar
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(c)}>
                            <Edit className="w-3 h-3" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:bg-red-500/10 gap-1 ml-auto"
                            onClick={() => setDeleteTarget({ id: c.id, name: c.descricao })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/20 bg-muted/10">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} de {contas.filter(c => c.tipo === tab).length} faturas
                </span>
                <span className={`text-sm font-semibold font-mono ${tab === "receber" ? "text-green-400" : "text-red-400"}`}>
                  Total: {fmtCurrency(filtered.reduce((acc, c) => acc + parseCurrency(c.valor), 0))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) { del.mutate(deleteTarget.id); setDeleteTarget(null); } }}
        itemName={deleteTarget?.name}
      />

      <Dialog open={honorariosOpen} onOpenChange={setHonorariosOpen}>
        <DialogContent className="max-w-3xl p-0 bg-card border-border/50 max-h-[92vh] overflow-hidden rounded-xl">
          <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                {honorariosEditId ? "Editar Honorários" : "Cobrança de Honorários"}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                {honorariosEditId ? "Edite os dados da cobrança" : "Gere cobranças profissionais para seus clientes"}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-200px)] space-y-6">

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Dados do Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Razão Social do Cliente <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={honorariosForm.clienteId || "__none__"}
                    onValueChange={v => setHonorariosForm(prev => ({ ...prev, clienteId: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione um cliente</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.razaoSocial || c.nomeFantasia || `#${c.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">CNPJ/CPF</Label>
                  <Input
                    value={clienteCnpjCpf ? (clienteCnpjCpf.length > 11 ? formatters.cnpj(clienteCnpjCpf) : formatters.cpf(clienteCnpjCpf)) : ""}
                    readOnly
                    className="bg-muted/50 h-10 font-mono text-muted-foreground"
                    placeholder="Preenchido automaticamente"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mês <span className="text-red-400">*</span></Label>
                  <Select value={honorariosForm.mes} onValueChange={v => setHonorariosForm(prev => ({ ...prev, mes: v }))}>
                    <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ano <span className="text-red-400">*</span></Label>
                  <Select value={honorariosForm.ano} onValueChange={v => setHonorariosForm(prev => ({ ...prev, ano: v }))}>
                    <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i)).map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Emissão</Label>
                  <Input value={honorariosForm.dataEmissao} onChange={e => setHonorariosForm(prev => ({ ...prev, dataEmissao: formatters.date(e.target.value) }))} className="bg-background h-10 font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Vencimento <span className="text-red-400">*</span></Label>
                  <Input value={honorariosForm.dataVencimento} onChange={e => setHonorariosForm(prev => ({ ...prev, dataVencimento: formatters.date(e.target.value) }))} className="bg-background h-10 font-mono" placeholder="DD/MM/AAAA" maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nº Recibo</Label>
                  <Input value={honorariosForm.numeroRecibo} onChange={e => setHonorariosForm(prev => ({ ...prev, numeroRecibo: e.target.value }))} className="bg-background h-10" placeholder="Automático" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Serviços</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addServico} className="gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {honorariosForm.servicos.map((servico, idx) => (
                  <div key={servico.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
                    <span className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary mt-1 shrink-0">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Descrição do Serviço</Label>
                        <Input value={servico.descricao} onChange={e => updateServico(servico.id, "descricao", e.target.value)} className="bg-background h-10" placeholder="Ex: Honorários contábeis, Folha de pagamento..." />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor</Label>
                        <Input value={servico.valor} onChange={e => updateServico(servico.id, "valor", formatters.currency(e.target.value))} className="bg-background h-10 font-mono" placeholder="R$ 0,00" />
                      </div>
                    </div>
                    {honorariosForm.servicos.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeServico(servico.id)} className="h-8 w-8 text-red-400 hover:bg-red-500/10 mt-6 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {subtotalHonorarios > 0 && (
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/30">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Subtotal</span>
                    <p className="text-lg font-semibold text-foreground font-mono">{fmtCurrency(subtotalHonorarios)}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Desconto</h3>
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Opcional</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Valor do Desconto</Label>
                  <div className="relative">
                    <Input
                      value={honorariosForm.descontoValor}
                      onChange={e => {
                        if (honorariosForm.descontoTipo === "fixo") {
                          setHonorariosForm(prev => ({ ...prev, descontoValor: formatters.currency(e.target.value) }));
                        } else {
                          const raw = e.target.value.replace(/[^\d]/g, "");
                          setHonorariosForm(prev => ({ ...prev, descontoValor: raw }));
                        }
                      }}
                      className="bg-background h-10 font-mono pr-10"
                      placeholder={honorariosForm.descontoTipo === "fixo" ? "R$ 0,00" : "0"}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {honorariosForm.descontoTipo === "fixo" ? "R$" : "%"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo de Desconto</Label>
                  <Select
                    value={honorariosForm.descontoTipo}
                    onValueChange={v => setHonorariosForm(prev => ({ ...prev, descontoTipo: v as "fixo" | "percentual", descontoValor: "" }))}
                  >
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixo">
                        <span className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Valor Fixo</span>
                      </SelectItem>
                      <SelectItem value="percentual">
                        <span className="flex items-center gap-2"><Percent className="w-3.5 h-3.5" /> Percentual</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prazo do Desconto</Label>
                  <Input
                    value={honorariosForm.descontoPrazo}
                    onChange={e => setHonorariosForm(prev => ({ ...prev, descontoPrazo: formatters.date(e.target.value) }))}
                    className="bg-background h-10 font-mono"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                  />
                </div>
              </div>
              {descontoCalculado > 0 && (
                <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center justify-between">
                  <span className="text-xs text-amber-400">Desconto aplicado</span>
                  <span className="text-sm font-semibold text-amber-400 font-mono">-{fmtCurrency(descontoCalculado)}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Forma de Pagamento</h3>
              </div>
              <Select
                value={honorariosForm.formaPagamento || "__none__"}
                onValueChange={v => setHonorariosForm(prev => ({ ...prev, formaPagamento: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="bg-background h-10">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Selecione —</SelectItem>
                  {BANCOS_PAGAMENTO.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-slate-500/15 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Anexar Arquivo</h3>
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Opcional</Badge>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.csv,.txt,.zip,.rar"
                onChange={handleFileSelect}
              />
              {!anexo ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm">
                    <span className="text-primary font-medium cursor-pointer">Clique para selecionar</span>
                    <span className="text-muted-foreground"> ou arraste um arquivo</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, imagens — dados serão extraídos automaticamente</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{anexo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {extracting ? (
                          <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extraindo dados do documento...</span>
                        ) : (
                          `${(anexo.size / 1024).toFixed(1)} KB`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openFilePreview(anexo)} className="h-8 w-8 text-primary hover:bg-primary/10" title="Visualizar arquivo">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setAnexo(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="h-8 w-8 text-red-400 hover:bg-red-500/10">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground/60 mt-2">PDF e imagens terão dados extraídos automaticamente para preencher o formulário.</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Observações</h3>
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Opcional</Badge>
              </div>
              <Textarea
                value={honorariosForm.observacoes}
                onChange={e => setHonorariosForm(prev => ({ ...prev, observacoes: e.target.value }))}
                className="bg-background resize-none min-h-[80px]"
                rows={3}
                placeholder="Anotações ou informações adicionais..."
              />
            </div>

            {totalHonorarios > 0 && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Total da Cobrança</span>
                  {descontoCalculado > 0 && (
                    <p className="text-xs text-muted-foreground line-through">{fmtCurrency(subtotalHonorarios)}</p>
                  )}
                </div>
                <p className="text-3xl font-bold text-green-400 font-mono">{fmtCurrency(totalHonorarios)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <Button variant="ghost" onClick={() => setHonorariosOpen(false)} className="text-muted-foreground gap-2">
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleGerarRelatorio}
                disabled={!honorariosForm.clienteId}
                className="gap-2 text-sm border-primary/30 text-primary hover:bg-primary/10"
              >
                <FileDown className="w-4 h-4" />
                Gerar Relatório
              </Button>
              <Button
                onClick={handleGerarCobranca}
                disabled={save.isPending || !honorariosForm.clienteId || !honorariosForm.dataVencimento}
                className="gap-2 px-6 shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {honorariosEditId ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {honorariosEditId ? "Salvar Alterações" : "Gerar Cobrança"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contaPagarOpen} onOpenChange={setContaPagarOpen}>
        <DialogContent className="max-w-2xl p-0 bg-card border-border/50 max-h-[92vh] overflow-hidden rounded-xl">
          <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-red-600/80 via-rose-600/70 to-pink-600/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                {contaPagarEditId ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                {contaPagarEditId ? "Edite os dados da conta" : "Cadastre uma nova conta a pagar"}
                <span className="float-right text-white/50 text-xs">
                  {[contaPagarForm.fornecedor, contaPagarForm.valor, contaPagarForm.categoria, contaPagarForm.dataVencimento].filter(Boolean).length}/4 campos
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-200px)] space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                <Store className="w-3.5 h-3.5 inline mr-1.5" />
                Nome do fornecedor ou empresa <span className="text-red-400">*</span>
              </Label>
              <Input
                value={contaPagarForm.fornecedor}
                onChange={e => setContaPagarForm(p => ({ ...p, fornecedor: e.target.value }))}
                className="bg-background h-10"
                placeholder="Nome do fornecedor ou empresa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1.5 text-green-400" />
                  Valor <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={contaPagarForm.valor}
                  onChange={e => setContaPagarForm(p => ({ ...p, valor: formatters.currency(e.target.value) }))}
                  className="bg-background h-10 font-mono"
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 inline mr-1.5 text-violet-400" />
                  Categoria
                </Label>
                <Select
                  value={contaPagarForm.categoria || "__none__"}
                  onValueChange={v => setContaPagarForm(p => ({ ...p, categoria: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione...</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                Data de Vencimento <span className="text-red-400">*</span>
              </Label>
              <Input
                value={contaPagarForm.dataVencimento}
                onChange={e => setContaPagarForm(p => ({ ...p, dataVencimento: formatters.date(e.target.value) }))}
                className="bg-background h-10 font-mono"
                placeholder="dd/mm/aaaa"
                maxLength={10}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                <Barcode className="w-3.5 h-3.5 inline mr-1.5" />
                Linha Digitável (Código de Barras)
              </Label>
              <Input
                value={contaPagarForm.linhaDigitavel}
                onChange={e => setContaPagarForm(p => ({ ...p, linhaDigitavel: e.target.value }))}
                className="bg-background h-10 font-mono text-sm"
                placeholder="Cole aqui a linha digitável do boleto"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5 inline mr-1.5" />
                PIX Copia e Cola
              </Label>
              <Input
                value={contaPagarForm.pixCopiaCola}
                onChange={e => setContaPagarForm(p => ({ ...p, pixCopiaCola: e.target.value }))}
                className="bg-background h-10 font-mono text-sm"
                placeholder="Cole aqui o código PIX"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                <Paperclip className="w-3.5 h-3.5 inline mr-1.5" />
                Anexar Documento
              </Label>
              <input
                ref={contaPagarFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.csv,.txt,.zip,.rar"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setContaPagarAnexo(f); extractFileData(f, "pagar"); } }}
              />
              {!contaPagarAnexo ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    contaPagarDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  onClick={() => contaPagarFileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setContaPagarDragOver(true); }}
                  onDragLeave={() => setContaPagarDragOver(false)}
                  onDrop={e => { e.preventDefault(); setContaPagarDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setContaPagarAnexo(f); extractFileData(f, "pagar"); } }}
                >
                  <Paperclip className="w-6 h-6 text-primary/40 mx-auto mb-2" />
                  <p className="text-sm">
                    <span className="text-primary font-medium">Clique para anexar um documento</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF e imagens terão dados extraídos automaticamente</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{contaPagarAnexo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {extracting ? (
                          <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Extraindo dados do documento...</span>
                        ) : (
                          `${(contaPagarAnexo.size / 1024).toFixed(1)} KB`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openFilePreview(contaPagarAnexo)} className="h-8 w-8 text-primary hover:bg-primary/10" title="Visualizar arquivo">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setContaPagarAnexo(null); if (contaPagarFileRef.current) contaPagarFileRef.current.value = ""; }} className="h-8 w-8 text-red-400 hover:bg-red-500/10">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <span className="text-xs text-muted-foreground">* Campos obrigatórios</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setContaPagarOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button
                onClick={handleContaPagarSave}
                disabled={save.isPending || !contaPagarForm.fornecedor.trim() || !contaPagarForm.dataVencimento}
                className="gap-2 px-6 shadow-lg text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
              >
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                {contaPagarEditId ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pagarOpen} onOpenChange={setPagarOpen}>
        <DialogContent className="max-w-md p-0 bg-card border-border/50 overflow-hidden rounded-xl">
          <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-green-600/80 via-emerald-600/70 to-teal-600/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                Registrar Pagamento
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                {pagarTarget?.descricao}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5">
            {pagarTarget && (
              <div className="bg-muted/30 rounded-lg border border-border/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-xl font-bold font-mono text-green-400">{pagarTarget.valor || "—"}</span>
                </div>
                {pagarTarget.dataVencimento && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Vencimento</span>
                    <span className="text-xs font-mono text-muted-foreground">{pagarTarget.dataVencimento}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Data do Pagamento <span className="text-red-400">*</span>
              </Label>
              <Input
                value={pagarForm.dataPagamento}
                onChange={e => setPagarForm(p => ({ ...p, dataPagamento: formatters.date(e.target.value) }))}
                className="bg-background h-10 font-mono"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Forma de Pagamento</Label>
              <Select
                value={pagarForm.formaPagamento || "__none__"}
                onValueChange={v => setPagarForm(p => ({ ...p, formaPagamento: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Selecione —</SelectItem>
                  {BANCOS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Observações</Label>
              <Textarea
                value={pagarForm.observacoes}
                onChange={e => setPagarForm(p => ({ ...p, observacoes: e.target.value }))}
                className="bg-background resize-none min-h-[80px]"
                rows={3}
                placeholder="Informações sobre o pagamento..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border/40">
            <Button variant="ghost" onClick={() => setPagarOpen(false)} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPagamento}
              disabled={save.isPending || !pagarForm.dataPagamento}
              className="gap-2 px-6 shadow-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
            >
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewFile} onOpenChange={v => { if (!v) closeFilePreview(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-card border-border/50 overflow-hidden rounded-xl">
          <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-blue-600/80 via-indigo-600/70 to-violet-600/60">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                {previewFile?.name || "Visualizar Arquivo"}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-sm mt-1">
                Visualização do documento anexado
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-4 overflow-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {previewFile?.type === "application/pdf" ? (
              <iframe
                src={previewFile.url}
                className="w-full rounded-lg border border-border/30"
                style={{ height: "70vh" }}
                title={previewFile.name}
              />
            ) : previewFile?.type.startsWith("image/") ? (
              <div className="flex items-center justify-center">
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="w-16 h-16 mb-4 opacity-40" />
                <p className="text-lg font-medium">Pré-visualização não disponível</p>
                <p className="text-sm mt-1">Este tipo de arquivo não pode ser exibido diretamente.</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => {
                    if (previewFile) {
                      const a = document.createElement("a");
                      a.href = previewFile.url;
                      a.download = previewFile.name;
                      a.click();
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                  Baixar Arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
