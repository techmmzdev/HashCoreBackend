// backend/src/services/media.service.js (Versión Corregida)
import { getPrisma } from "../config/db.js";
// ❌ ELIMINADO: handlePrismaError, solo se usa en controllers.
import fs from "fs";
import path from "path";

const prisma = getPrisma();

// 🟢 Crear media y asociarla a una publicación
export const createMedia = async (publicationId, mediaData) => {
  // ... (Lógica de verificación de publicación y creación)
  try {
    // 1️⃣ Verificar que la publicación exista
    const publication = await prisma.publications.findUnique({
      where: { id: publicationId },
    });

    if (!publication) {
      throw new Error("La publicación especificada no existe.");
    } // 2️⃣ Crear registro de media

    // ✅ Validación defensiva: comprobar que el mime-type corresponda al content_type
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const videoTypes = ["video/mp4", "video/webm"];

    const contentType = (publication.content_type || "").toUpperCase();
    const mime = (mediaData.media_type || "").toLowerCase();

    if (contentType === "REEL" && !videoTypes.includes(mime)) {
      throw new Error("Tipo de archivo inválido para REEL: se requiere video.");
    }

    if (contentType === "POST" && !imageTypes.includes(mime)) {
      throw new Error(
        "Tipo de archivo inválido para POST: se requiere imagen."
      );
    }

    return await prisma.media.create({
      data: {
        publication_id: publicationId,
        media_type: mediaData.media_type,
        url: mediaData.url,
      },
    });
  } catch (error) {
    // 🛑 CORREGIDO: Sólo lanzamos el error para que el controller lo atrape.
    throw error;
  }
};

// 🔵 Obtener media de una publicación
export const getMediaByPublicationId = async (publicationId) => {
  try {
    const media = await prisma.media.findMany({
      where: { publication_id: publicationId },
    });
    return media;
  } catch (error) {
    // 🛑 CORREGIDO: Sólo lanzamos el error.
    throw error;
  }
};

// 🔴 Eliminar media física y de la base de datos (La lógica de fs/path está bien aquí, es Lógica de persistencia)
export const deleteMedia = async (publicationId, mediaId) => {
  try {
    const media = await prisma.media.findFirst({
      where: {
        id: parseInt(mediaId),
        publication_id: parseInt(publicationId),
      },
    });

    if (!media) {
      return null;
    } // Lógica de persistencia (fs)

    // Construir ruta absoluta esperando que media.url sea el filename
    const uploadsDir = path.join(process.cwd(), "uploads");
    const absolutePath = path.join(uploadsDir, media.url);

    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.info(`Media removed from disk: ${absolutePath}`);
      } else {
        console.warn(
          `Media file not found on disk (skipping): ${absolutePath}`
        );
      }
    } catch (fsErr) {
      console.error("Error removing media file from disk:", fsErr);
    }

    // Eliminar registro en DB
    await prisma.media.delete({ where: { id: media.id } });

    // Contar media restantes para esta publicación
    const remaining = await prisma.media.count({
      where: { publication_id: media.publication_id },
    });

    let publicationUpdated = null;
    if (remaining === 0) {
      // Recuperar publicación actual para revisar su estado
      const publication = await prisma.publications.findUnique({
        where: { id: media.publication_id },
      });

      if (
        publication &&
        ["PUBLISHED", "SCHEDULED"].includes(publication.status)
      ) {
        publicationUpdated = await prisma.publications.update({
          where: { id: media.publication_id },
          data: { status: "DRAFT" },
        });
      }
    }

    return { deleted: true, media, publication: publicationUpdated };
  } catch (error) {
    // 🛑 CORREGIDO: Sólo lanzamos el error.
    throw error;
  }
};
