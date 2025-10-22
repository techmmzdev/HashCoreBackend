// backend/src/routes/clientDashboardRoutes.js (Versión Corregida)
import { Router } from "express";
import { getClientDashboardStats } from "../controllers/clientDashboardController.js";
import { authenticateJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Ruta: GET /api/client/dashboard/stats
// Solo requiere autenticación. El Controller verifica si es un CLIENTE y usa su propio ID.
router.get(
  "/stats",
  authenticateJWT,
  getClientDashboardStats // ⬅️ El Controller valida si req.user.role === 'CLIENT'
);

export default router;
