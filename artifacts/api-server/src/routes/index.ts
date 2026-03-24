import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/portal", portalRouter);
router.use("/receita", receitaRouter);
router.use("/escritorios", escritoriosRouter);
router.use("/clientes", clientesRouter);
router.use("/contratos", contratosRouter);
router.use("/usuarios", usuariosRouter);
router.use("/integracoes", integracoesRouter);
router.use("/contas", contasRouter);
router.use("/negociacoes", negociacoesRouter);
router.use("/propostas", propostasRouter);
router.use("/processos", processosRouter);
router.use("/protocolos", protocolosRouter);
router.use("/campanhas", campanhasRouter);
router.use("/consultas-fiscais", consultasFiscaisRouter);

export default router;
