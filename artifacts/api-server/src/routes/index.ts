import { Router, type IRouter } from "express";
import healthRouter from "./health";
import receitaRouter from "./receita";
import escritoriosRouter from "./escritorios";
import clientesRouter from "./clientes";
import contratosRouter from "./contratos";
import usuariosRouter from "./usuarios";
import integracoesRouter from "./integracoes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/receita", receitaRouter);
router.use("/escritorios", escritoriosRouter);
router.use("/clientes", clientesRouter);
router.use("/contratos", contratosRouter);
router.use("/usuarios", usuariosRouter);
router.use("/integracoes", integracoesRouter);

export default router;
