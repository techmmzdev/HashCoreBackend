// backend/src/routes/publicationRoutes.js (VERSION FINAL)
import express from "express";
import {
  createPublication,
  getPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  getAdminPublications,
  updatePublicationStatus,
} from "../controllers/publicationController.js";
import {
  // ⚠️ Asumimos que existen estos controllers para las rutas de media y comments
  uploadMedia,
  getMedia,
  deleteMedia,
} from "../controllers/mediaController.js";
import {
  createComment,
  getComments,
  deleteComment,
} from "../controllers/commentsController.js";
import { upload } from "../config/multerConfig.js"; // Asumimos la configuración de Multer
import {
  authenticateJWT,
  requireAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// =================== GESTIÓN DE PUBLICACIONES ===================

// ADMIN: Obtener TODAS las publicaciones de la plataforma (RF-003)
router.get(
  "/publications/admin",
  authenticateJWT,
  requireAdmin,
  getAdminPublications
);

// ADMIN: Crear publicación para un cliente específico (RF-007)
router.post(
  "/clients/:clientId/publications",
  authenticateJWT,
  requireAdmin,
  createPublication
);

// ACCESO MIXTO: Ver publicaciones de un cliente. Lógica de rol en Controller. (RF-010)
router.get("/clients/:clientId/publications", authenticateJWT, getPublications);

// ACCESO MIXTO: Ver una publicación específica. Lógica de rol en Controller. (RF-011)
router.get("/publications/:id", authenticateJWT, getPublicationById);

// ADMIN: Actualizar contenido de una publicación (RF-007)
router.put(
  "/publications/:id",
  authenticateJWT,
  requireAdmin,
  updatePublication
);

// ADMIN: Eliminar una publicación (RF-007)
router.delete(
  "/publications/:id",
  authenticateJWT,
  requireAdmin,
  deletePublication
);

// ADMIN: Actualizar solo el estado (PATCH es ideal) (RF-008)
router.patch(
  "/publications/:id/status",
  authenticateJWT,
  requireAdmin,
  updatePublicationStatus
);

// =================== GESTIÓN DE MEDIA ===================

// ADMIN: Subir material multimedia a una publicación (RF-009)
router.post(
  "/publications/:publicationId/media",
  authenticateJWT,
  requireAdmin,
  upload.single("mediaFile"),
  uploadMedia
);

// ACCESO MIXTO: Obtener material multimedia. Lógica de rol en Controller. (RF-012)
router.get("/publications/:publicationId/media", authenticateJWT, getMedia);

// ADMIN: Eliminar material multimedia
router.delete(
  "/publications/:publicationId/media/:mediaId",
  authenticateJWT,
  requireAdmin,
  deleteMedia
);

// =================== GESTIÓN DE COMENTARIOS ===================

// AMBOS ROLES: Crear un comentario (RF-013)
router.post(
  "/publications/:publicationId/comments",
  authenticateJWT,
  createComment
);

// ACCESO MIXTO: Obtener comentarios. Lógica de rol en Controller. (RF-014)
router.get(
  "/publications/:publicationId/comments",
  authenticateJWT,
  getComments
);

// ADMIN: Eliminar un comentario (RF-015)
router.delete(
  "/publications/:publicationId/comments/:commentId",
  authenticateJWT,
  requireAdmin,
  deleteComment
);

export default router;
