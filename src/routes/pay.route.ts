import { Router } from "express";
import payController  from "../controllers/pay.controller";

const payRoutes = Router();

payRoutes.post('/recharge', payController.recharge);

payRoutes.post('/payment', payController.payment);

payRoutes.post('/confirmPayment', payController.confirmPayment);

payRoutes.get('/balance', payController.balance);


export default payRoutes;