// backend/src/controllers/commentController.js (Versión Corregida)
import * as commentService from "../services/comment.service.js";
import * as publicationService from "../services/publication.service.js"; // Usado para buscar la publicación/cliente
import { handlePrismaError } from "../utils/errorHandler.js"; // ⬅️ Nuevo
import { getPrisma } from "../config/db.js"; // ⬅️ Nuevo
const prisma = getPrisma(); // ⬅️ Uso de la instancia compartida

// Función auxiliar para manejar errores (la misma lógica de los otros controllers)
const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    if (handledError.message.includes("no fue encontrado")) {
      return res.status(404).json({ message: handledError.message });
    }
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

// Crea un nuevo comentario para una publicación (RF-013)
export const createComment = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const userId = req.user.id;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." }); // 1. Crea el comentario

    const newComment = await commentService.createComment(
      publicationId,
      userId,
      req.body
    ); // 2. Lógica de Notificación con Socket.IO (Controlador maneja el IO)

    const io = req.io;

    if (io) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      }); // Solo notificar si el que comenta es un CLIENTE

      if (user && user.role !== "ADMIN") {
        const notificationData = {
          id: newComment.id,
          publicationId: publicationId,
          commenterName: user.name || "Cliente",
          message: `📢 Nuevo feedback de ${user.name} en la publicación #${publicationId}.`,
          timestamp: new Date().toISOString(),
        };

        io.to("admin_notifications").emit(
          "new_comment_notification",
          notificationData
        );
        console.log(
          `[Socket.IO] Notificación emitida a la sala 'admin_notifications'`
        );
      }
    } // ------------------------------------------
    res.status(201).json({
      comment: newComment,
      message: "Comentario creado exitosamente.",
    });
  } catch (error) {
    // 🛑 CORREGIDO: Se usa el manejador de errores centralizado
    if (error.message.includes("El comentario no puede estar vacío")) {
      return res.status(400).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al crear el comentario");
  }
};

// Obtiene todos los comentarios de una publicación (RF-014)
export const getComments = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." }); // 1. Obtener publicación para verificar existencia y propietario // ⚠️ Mejoramos la seguridad: usamos la misma lógica que getMedia

    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada." });
    } // 2. Lógica de AUTORIZACIÓN (Controller): Solo ADMIN o DUEÑO

    if (userRole !== "ADMIN") {
      if (publication.client_id !== userClientId) {
        return res.status(403).json({
          message:
            "No tienes permiso para ver los comentarios de esta publicación.",
        });
      }
    } // 3. Llamada al servicio

    const comments = await commentService.getCommentsByPublicationId(
      publicationId
    );
    res.status(200).json(comments);
  } catch (error) {
    // 🛑 CORREGIDO: Se usa el manejador de errores centralizado
    handleControllerError(res, error, "Error al obtener los comentarios");
  }
};

// Eliminar un comentario (SOLO ADMIN - RF-015)
export const deleteComment = async (req, res) => {
  // El middleware de ruta ya verifica requireAdmin
  try {
    const publicationId = parseInt(req.params.publicationId);
    const commentId = parseInt(req.params.commentId);

    if (isNaN(publicationId) || isNaN(commentId))
      return res.status(400).json({ message: "ID inválido." });

    // Verificamos existencia ANTES de eliminar para devolver 404 claro.
    const existingComment = await commentService.getCommentById(commentId);
    if (!existingComment) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    // Aseguramos que el comentario pertenece a la publicacion indicada
    if (existingComment.publication_id !== publicationId) {
      return res
        .status(400)
        .json({
          message: "El comentario no pertenece a la publicación indicada.",
        });
    }

    await commentService.deleteComment(commentId);

    res
      .status(200)
      .json({ message: "Comentario eliminado exitosamente.", id: commentId });
  } catch (error) {
    // 🛑 CORREGIDO: Se usa el manejador de errores centralizado
    handleControllerError(res, error, "Error al eliminar el comentario");
  }
};
