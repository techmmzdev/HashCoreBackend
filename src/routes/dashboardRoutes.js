// backend/src/routes/dashboardRoutes.js (Versión Correcta)
import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import {
  authenticateJWT,
  requireAdmin,
} from "../middlewares/authMiddleware.js";

const router = Router();

// ✅ Solo ADMIN puede ver las estadísticas del dashboard.
router.get("/stats", authenticateJWT, requireAdmin, getDashboardStats);

export default router;
