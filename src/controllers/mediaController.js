// backend/src/controllers/mediaController.js (Versión Corregida)
import * as mediaService from "../services/media.service.js";
import * as publicationService from "../services/publication.service.js";
import { handlePrismaError } from "../utils/errorHandler.js"; // ⬅️ Importar para manejar errores
import path from "path";
import fs from "fs";

// Función auxiliar para manejar errores (Duplicada del publicationController para modularidad)
const handleControllerError = (res, error, defaultMessage, file = null) => {
  console.error(error); // 🔴 LIMPIEZA: Si hay un error de DB después de subir el archivo, lo eliminamos.
  if (file && file.path) {
    fs.unlink(file.path, (err) => {
      if (err) console.error("Error al limpiar archivo fallido:", err);
    });
  }

  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    if (
      handledError.message.includes("no fue encontrado") ||
      handledError.message.includes("no existe")
    ) {
      return res.status(404).json({ message: handledError.message });
    }
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

// 📸 Subir un nuevo material multimedia (SOLO ADMIN - RF-009)
export const uploadMedia = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId); // Validación de entrada (Controller)
    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." });
    if (!req.file)
      return res
        .status(400)
        .json({ message: "No se encontró ningún archivo para subir." }); // Validación de MimeType (Controller)

    // Guardamos solo el filename en la BD. Multer ya lo coloca en req.file.filename
    const filename = req.file.filename;

    // Obtener la publicación para validar su content_type (POST o REEL)
    let publication;
    try {
      publication = await publicationService.getPublicationById(publicationId);
    } catch (err) {
      // Si la publicación no existe, limpiamos el archivo y devolvemos 404
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Publicación no encontrada." });
    }

    const imageMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    const videoMimeTypes = ["video/mp4", "video/webm"];

    const contentType = (publication.content_type || "").toUpperCase();

    if (contentType === "REEL" && !videoMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Esta publicación requiere un video (REEL)." });
    }

    if (contentType === "POST" && !imageMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Esta publicación requiere una imagen (POST)." });
    }

    const mediaData = {
      media_type: req.file.mimetype,
      url: filename, // almacenamos solo el nombre del archivo
    }; // Llama al servicio para guardar en la BD

    const newMedia = await mediaService.createMedia(publicationId, mediaData);
    // Manejo de publishNow: si el admin solicitó publicar ahora
    const publishNow = req.query?.publishNow === "true";

    if (publishNow) {
      try {
        // Solo publicamos si la publicación está en DRAFT
        if ((publication.status || "").toUpperCase() === "DRAFT") {
          await publicationService.updatePublication(publicationId, {
            status: "PUBLISHED",
            publish_date: new Date(),
          });
          // Devolver también la publicación actualizada
          const updatedPublication =
            await publicationService.getPublicationById(publicationId);
          return res.status(201).json({
            media: newMedia,
            published: true,
            publication: updatedPublication,
            message: "Material multimedia subido y publicación publicada.",
          });
        }

        // Si está SCHEDULED, no hacemos nada (lo gestionará el scheduler)
        return res.status(201).json({
          media: newMedia,
          published: false,
          message:
            "Material multimedia subido. La publicación está programada y permanecerá en SCHEDULED.",
        });
      } catch (err) {
        // Si la actualización falla, limpiamos: eliminamos media física y registro
        try {
          await mediaService.deleteMedia(publicationId, newMedia.id);
        } catch (cleanupErr) {
          console.error(
            "Error limpiando media tras fallo de publishNow:",
            cleanupErr
          );
        }

        return res.status(500).json({
          published: false,
          message: "Error al publicar la publicación tras subir media.",
        });
      }
    }

    // Default: sólo media subida
    const currentPublication = await publicationService.getPublicationById(
      publicationId
    );
    res.status(201).json({
      media: newMedia,
      published: false,
      publication: currentPublication,
      message: "Material multimedia subido exitosamente.",
    });
  } catch (error) {
    // 🛑 Pasamos el archivo para limpieza en caso de error de DB
    handleControllerError(
      res,
      error,
      "Error al subir el material multimedia.",
      req.file
    );
  }
};

// 🧾 Obtener material multimedia de una publicación (RF-012)
export const getMedia = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId))
      return res.status(400).json({ message: "ID de publicación inválido." }); // 1. Obtener publicación para verificar existencia y propietario

    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada." });
    } // 2. Lógica de AUTORIZACIÓN (Controller): Solo ADMIN o DUEÑO

    if (userRole !== "ADMIN") {
      // Si el cliente no es el dueño
      if (publication.client_id !== userClientId) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para acceder a este recurso." });
      }
    } // 3. Llamada al servicio

    const media = await mediaService.getMediaByPublicationId(publicationId);
    res.status(200).json(media);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener material multimedia.");
  }
};

// ❌ Eliminar un material multimedia por ID (SOLO ADMIN)
export const deleteMedia = async (req, res) => {
  try {
    const { publicationId, mediaId } = req.params; // Validación de entrada (Controller)
    if (isNaN(parseInt(publicationId)) || isNaN(parseInt(mediaId))) {
      return res
        .status(400)
        .json({ message: "IDs de publicación o multimedia inválidos." });
    }

    const result = await mediaService.deleteMedia(publicationId, mediaId);

    if (!result) {
      return res
        .status(404)
        .json({ message: "Material multimedia no encontrado." });
    }

    // Si el servicio devolvió una publicación actualizada, informamos al cliente
    if (result.publication) {
      return res.status(200).json({
        message:
          "Material multimedia eliminado. La publicación se ha revertido a borrador.",
        media: result.media,
        publication: result.publication,
        reverted: true,
      });
    }

    res.status(200).json({
      message: "Material multimedia eliminado correctamente.",
      media: result.media,
      reverted: false,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar material multimedia.");
  }
};
