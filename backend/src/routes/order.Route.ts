import { BuySell, DeleteOrder, getOrderbyId, getBalance, getDepthofAsset } from '../controllers/order.controller'
import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'

const router:Router = Router()

router.post("/buysell", authMiddleware, BuySell)
router.get("/balance", authMiddleware, getBalance)
router.delete("/:orderId", authMiddleware, DeleteOrder)
router.get("/:orderId", authMiddleware, getOrderbyId)
router.get("/depth/:asset", getDepthofAsset)

export default router