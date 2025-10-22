// backend/src/routes/clientRoutes.js (Versión CORREGIDA)

import express from "express";
import {
  getAllClients,
  getClientInfo, // Renombraremos esta función para mayor claridad
  getClientByIdAdmin, // Nueva función para ADMIN
  // getPublicationsForClient,
  deleteClientController,
} from "../controllers/clientController.js";
import {
  authenticateJWT,
  requireAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// =================== RUTAS DE LECTURA DE CLIENTES (ADMIN) ===================

// ✅ Obtener TODOS los clientes (RF-005)
router.get("/", authenticateJWT, requireAdmin, getAllClients);

// ✅ Obtener un cliente por su ID de cliente (clients.id) - SOLO ADMIN
router.get("/:clientId", authenticateJWT, requireAdmin, getClientByIdAdmin);

// // ✅ Obtener TODAS las publicaciones de un cliente (Botón "Ver Publicaciones")
// router.get(
//   "/:clientId/publications",
//   authenticateJWT,
//   requireAdmin,
//   getPublicationsForClient
// );

// =================== RUTAS DE LECTURA (CLIENTE PROPIO) ===================

// ✅ Obtener la información del cliente autenticado (RF-006)
router.get("/me", authenticateJWT, getClientInfo);

// ✅ Eliminar (soft-delete) un cliente - SOLO ADMIN
router.delete(
  "/:clientId",
  authenticateJWT,
  requireAdmin,
  deleteClientController
);

export default router;
