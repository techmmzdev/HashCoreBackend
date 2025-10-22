import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  toggleClientStatus,
} from "../controllers/userController.js";
import {
  authenticateJWT,
  requireAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// =================== RUTAS PÚBLICAS ===================
router.post("/login", loginUser); // Público

// =================== RUTAS PROTEGIDAS ===================

router.post("/", authenticateJWT, requireAdmin, createUser); // SOLO ADMIN
router.get("/", authenticateJWT, requireAdmin, getUsers); // SOLO ADMIN

router.get("/:id", authenticateJWT, getUserById); // ADMIN o el propio
router.put("/:id", authenticateJWT, updateUser); // ADMIN o el propio

router.put("/:id/status", authenticateJWT, requireAdmin, toggleClientStatus); // SOLO ADMIN
router.delete("/:id", authenticateJWT, requireAdmin, deleteUser); // SOLO ADMIN

export default router;
