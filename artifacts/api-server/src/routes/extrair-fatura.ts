import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  try {
    const { base64, mimeType, contexto } = req.body;
    if (!base64 || !mimeType) {
      res.status(400).json({ message: "base64 e mimeType são obrigatórios" }); return;
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      res.status(400).json({ message: "Tipo de arquivo não suportado. Use imagem ou PDF." }); return;
    }

    const ctx = contexto || "conta";

    const systemPrompt = `Você é um assistente especializado em análise de documentos financeiros brasileiros (boletos, faturas, notas fiscais, recibos, cobranças).
Ao receber um documento, extraia os dados financeiros mais relevantes em formato JSON.
Responda APENAS com JSON válido, sem texto adicional, sem blocos de código markdown.

Campos possíveis (use apenas os que encontrar no documento):
- fornecedor: string (nome do fornecedor/empresa emissora/beneficiário/cedente)
- cnpjFornecedor: string (CNPJ do fornecedor/emissora, formatado XX.XXX.XXX/XXXX-XX)
- descricao: string (descrição do serviço/produto/cobrança)
- valor: string (valor total, apenas números com vírgula decimal, ex: "1.250,00")
- dataVencimento: string (formato YYYY-MM-DD)
- dataEmissao: string (formato YYYY-MM-DD)
- numeroDocumento: string (número da fatura/nota/boleto)
- linhaDigitavel: string (linha digitável do boleto, se houver)
- pixCopiaCola: string (código PIX copia e cola, se houver)
- codigoBarras: string (código de barras numérico, se houver)
- categoria: string (sugestão: Honorários, Imposto, Taxa, Folha de Pagamento, Aluguel, Energia, Internet, Telefone, Material, Software, Marketing, Outros)
- competencia: string (mês/ano de referência, formato MM/YYYY)
- parcela: string (ex: "1/3" se for parcelado)
- observacoes: string (outras informações relevantes encontradas no documento)
- clienteNome: string (nome do cliente/sacado/pagador, se houver)
- clienteCnpjCpf: string (CNPJ ou CPF do cliente/sacado)

Priorize extrair: valor, vencimento, fornecedor/beneficiário, descrição e linha digitável/PIX.
Se for boleto bancário, a linha digitável é FUNDAMENTAL.
Valores monetários devem usar formato brasileiro: 1.250,00 (ponto como separador de milhar, vírgula decimal).`;

    const userPrompt = `Analise este documento financeiro (${ctx}) e extraia todos os dados financeiros relevantes. Retorne apenas JSON.`;

    let messageContent: any[];

    if (isImage) {
      const imgMime = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: imgMime, data: base64.replace(/^data:[^;]+;base64,/, "") }
        },
        { type: "text", text: userPrompt }
      ];
    } else {
      messageContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64.replace(/^data:[^;]+;base64,/, "") }
        },
        { type: "text", text: userPrompt }
      ];
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    let dados: Record<string, string> = {};
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      dados = JSON.parse(cleaned);
    } catch {
      dados = { observacoes: text.slice(0, 500) };
    }

    res.json({ dados, textoCompleto: text });
  } catch (err: any) {
    req.log.error({ err }, "Erro ao extrair dados da fatura");
    res.status(500).json({ message: "Erro ao processar documento: " + (err?.message || "").slice(0, 200) });
  }
});

export default router;
