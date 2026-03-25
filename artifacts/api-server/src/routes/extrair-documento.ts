import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const TIPOS_DOCUMENTO = [
  "alvara", "inscricao_municipal", "inscricao_estadual",
  "juceb", "contrato_social", "certidao", "outros"
];

router.post("/", async (req, res) => {
  try {
    const { base64, mimeType, tipoDocumento } = req.body;
    if (!base64 || !mimeType) {
      res.status(400).json({ message: "base64 e mimeType são obrigatórios" }); return;
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf   = mimeType === "application/pdf";
    if (!isImage && !isPdf) {
      res.status(400).json({ message: "Tipo de arquivo não suportado. Use imagem ou PDF." }); return;
    }

    const promptTipo = tipoDocumento || "documento";
    const systemPrompt = `Você é um assistente especializado em análise de documentos de empresas brasileiras.
Ao receber um documento, extraia os dados mais relevantes em formato JSON.
Responda APENAS com JSON válido, sem texto adicional, sem blocos de código markdown.
Campos possíveis (use apenas os que encontrar):
- numero: string (número do documento, protocolo, inscrição)
- tipo: string (tipo do documento)
- orgaoExpedidor: string (órgão que emitiu)
- dataEmissao: string (formato YYYY-MM-DD se encontrar data)
- vencimento: string (formato YYYY-MM-DD se encontrar vencimento)
- cnpj: string
- razaoSocial: string
- nomeFantasia: string
- municipio: string
- uf: string (sigla do estado, ex: BA)
- status: string (situação do documento)
- inscricaoMunicipal: string
- inscricaoEstadual: string
- jucebNumero: string
- observacoes: string (outras informações relevantes)`;

    const userPrompt = `Analise este ${promptTipo} e extraia todos os dados que conseguir identificar. Retorne apenas JSON.`;

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
      max_tokens: 1024,
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
    req.log.error({ err }, "Erro ao extrair documento");
    res.status(500).json({ message: "Erro ao processar documento: " + (err?.message || "").slice(0, 200) });
  }
});

export default router;
