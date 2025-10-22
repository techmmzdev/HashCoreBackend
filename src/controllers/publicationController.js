// backend/src/controllers/publicationController.js
import * as publicationService from "../services/publication.service.js";
import { handlePrismaError } from "../utils/errorHandler.js";

const VALID_CONTENT_TYPES = ["POST", "REEL"];
const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"];

// Función auxiliar para manejar errores de DB y devolver la respuesta HTTP
const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    // 2. Capturar el error traducido y asignar código de estado
    if (
      handledError.message.includes("no fue encontrado") ||
      handledError.message.includes("Cliente asociado") ||
      handledError.message.includes("Publicación no encontrada")
    ) {
      // 🛑 Añadido para capturar el error del servicio
      return res.status(404).json({ message: handledError.message });
    } // Captura errores de validación de negocio no manejados explícitamente (ej: content_type)
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

// Obtiene TODAS las publicaciones para el ADMIN
export const getAdminPublications = async (req, res) => {
  // La autorización requireAdmin está en las rutas
  try {
    const publications = await publicationService.getAllPublications();
    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener todas las publicaciones"
    );
  }
};

// Crea una nueva publicación para un cliente específico (SOLO ADMIN)
export const createPublication = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { content_type } = req.body; // Lógica de Validación (Controller)

    if (isNaN(clientId))
      return res.status(400).json({ message: "ID de cliente inválido." });
    if (!VALID_CONTENT_TYPES.includes(content_type)) {
      return res.status(400).json({ message: "Tipo de contenido no válido." });
    } // Lógica de Negocio (Service) - Incluye verificación de límites de plan

    const newPublication = await publicationService.createPublication(
      clientId,
      req.body
    );
    res.status(201).json({
      publication: newPublication,
      message: "Publicación creada exitosamente",
    });
  } catch (error) {
    // ✅ CORRECTO: Manejo específico del límite de plan (Error de Negocio)
    if (error.message.includes("Límite alcanzado")) {
      return res.status(403).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al crear la publicación");
  }
};

// Obtiene todas las publicaciones de un cliente (ADMIN ve todas, CLIENTE solo PUBLISHED)
export const getPublications = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { id: userId, role: userRole, clientId: userClientId } = req.user;

    if (isNaN(clientId))
      return res.status(400).json({ message: "ID de cliente inválido." });

    let publications;

    if (userRole === "ADMIN") {
      // ADMIN: Ve todas las publicaciones (DRAFT, SCHEDULED, PUBLISHED)
      publications = await publicationService.getAllPublicationsByClientId(
        clientId
      );
    } else {
      // CLIENTE: Validación de Propiedad
      if (clientId !== userClientId) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para ver estas publicaciones." });
      } // CLIENTE: Solo ve PUBLISHED (RF-010)
      publications =
        await publicationService.getPublishedPublicationsByClientId(clientId);
    }

    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener las publicaciones");
  }
};

// Obtiene una publicación por su ID con validación de permisos
export const getPublicationById = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.id);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." });

    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    } // Lógica de Autorización (Controller)

    if (userRole !== "ADMIN") {
      // CLIENTE debe ser el dueño (client_id del token debe coincidir con el de la publicación)
      if (publication.client_id !== userClientId) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para ver esta publicación." });
      } // Cliente solo ve contenido si está PUBLISHED (RF-011)
      if (publication.status !== "PUBLISHED") {
        // Para cumplir con RF-011 (invisibilidad de DRAFT/SCHEDULED), devolvemos un 403
        return res.status(403).json({
          message: "La publicación no está disponible para su visualización.",
        });
      }
    }

    res.status(200).json(publication);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener la publicación");
  }
};

// Actualiza una publicación (SOLO ADMIN)
export const updatePublication = async (req, res) => {
  // La autorización requireAdmin está en las rutas
  try {
    const publicationId = parseInt(req.params.id);
    const { content_type } = req.body;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." }); // Validación de entrada (Controller)

    if (content_type && !VALID_CONTENT_TYPES.includes(content_type)) {
      return res.status(400).json({ message: "Tipo de contenido no válido." });
    }

    // Verificamos existencia ANTES de actualizar para devolver 404 claro.
    const checkExistence = await publicationService.getPublicationById(
      publicationId
    );
    if (!checkExistence) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    const updatedPublication = await publicationService.updatePublication(
      publicationId,
      req.body
    );
    res.status(200).json({
      publication: updatedPublication,
      message: "Publicación actualizada exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar la publicación");
  }
};

// Elimina una publicación (SOLO ADMIN)
export const deletePublication = async (req, res) => {
  // La autorización requireAdmin está en las rutas
  try {
    const publicationId = parseInt(req.params.id);

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." });

    // Verificamos existencia ANTES de eliminar para devolver 404 claro.
    const checkExistence = await publicationService.getPublicationById(
      publicationId
    );
    if (!checkExistence) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    await publicationService.deletePublication(publicationId);
    res.status(200).json({ message: "Publicación eliminada correctamente" });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar la publicación");
  }
};

// Actualiza solo el estado (SOLO ADMIN)
export const updatePublicationStatus = async (req, res) => {
  // La autorización requireAdmin está en las rutas
  try {
    const publicationId = parseInt(req.params.id);
    const { status: newStatus } = req.body;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." }); // Validación de entrada (Controller)

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        message:
          "Estado de publicación no válido. Use uno de " +
          VALID_STATUSES.join(", "),
      });
    }

    // Verificamos existencia ANTES de actualizar para devolver 404 claro.
    const checkExistence = await publicationService.getPublicationById(
      publicationId
    );
    if (!checkExistence) {
      return res.status(404).json({ message: "Publicación no encontrada" });
    }

    const updatedPublication = await publicationService.updatePublicationStatus(
      publicationId,
      newStatus
    );

    res.status(200).json({
      publication: updatedPublication,
      message: `Estado actualizado a ${newStatus} exitosamente.`,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar el estado");
  }
};
