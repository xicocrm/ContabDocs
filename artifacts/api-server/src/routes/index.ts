import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import receitaRouter from "./receita";
import escritoriosRouter from "./escritorios";
import clientesRouter from "./clientes";
import contratosRouter from "./contratos";
import usuariosRouter from "./usuarios";
import integracoesRouter from "./integracoes";
import contasRouter from "./contas";
import negociacoesRouter from "./negociacoes";
import propostasRouter from "./propostas";
import processosRouter from "./processos";
import protocolosRouter from "./protocolos";
import campanhasRouter from "./campanhas";
import consultasFiscaisRouter from "./consultas-fiscais";
import authRouter from "./auth";
import portalRouter from "./portal";
import alvarasRouter from "./alvaras";
import extrairDocumentoRouter from "./extrair-documento";
import tarefasRouter from "./tarefas";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/portal", portalRouter);
router.use("/receita", receitaRouter);

router.use("/escritorios", requireAuth, escritoriosRouter);
router.use("/clientes", requireAuth, clientesRouter);
router.use("/contratos", requireAuth, contratosRouter);
router.use("/usuarios", requireAuth, usuariosRouter);
router.use("/integracoes", requireAuth, integracoesRouter);
router.use("/contas", requireAuth, contasRouter);
router.use("/negociacoes", requireAuth, negociacoesRouter);
router.use("/propostas", requireAuth, propostasRouter);
router.use("/processos", requireAuth, processosRouter);
router.use("/protocolos", requireAuth, protocolosRouter);
router.use("/campanhas", requireAuth, campanhasRouter);
router.use("/consultas-fiscais", requireAuth, consultasFiscaisRouter);
router.use("/alvaras", requireAuth, alvarasRouter);
router.use("/extrair-documento", requireAuth, extrairDocumentoRouter);
router.use("/tarefas", requireAuth, tarefasRouter);

export default router;
