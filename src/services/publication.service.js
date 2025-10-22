// backend/src/services/publication.service.js
import { getPrisma } from "../config/db.js";

const prisma = getPrisma();
const VALID_CONTENT_TYPES = ["POST", "REEL"];
const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"];

// ======================= CRUD BÁSICO Y ACCESO ADMIN =======================

// Obtiene TODAS las publicaciones para la vista de administrador.
export const getAllPublications = async () => {
  try {
    return await prisma.publications.findMany({
      include: { client: { include: { user: true } }, media: true },
      orderBy: { created_at: "desc" },
    });
  } catch (error) {
    throw error; // Lanzamos el error tal cual
  }
};

// Obtiene todas las publicaciones de un cliente sin filtrar por estado (ADMIN).
export const getAllPublicationsByClientId = async (clientId) => {
  try {
    return await prisma.publications.findMany({
      where: { client_id: clientId },
      include: { media: true, comments: true, client: true },
      orderBy: { publish_date: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

// Obtiene una publicación específica por su ID.
export const getPublicationById = async (publicationId) => {
  try {
    const publication = await prisma.publications.findUnique({
      where: { id: publicationId },
      include: { client: { select: { id: true, user_id: true } } },
    });

    // 🛑 SUGERENCIA: Lanzar 404 desde el servicio (opcional, pero estandariza)
    if (!publication) {
      throw new Error("Publicación no encontrada.");
    }

    return publication;
  } catch (error) {
    throw error;
  }
};

// Actualiza una publicación por su ID.
export const updatePublication = async (publicationId, updateData) => {
  // El controlador ya validó el 'content_type'
  try {
    return await prisma.publications.update({
      where: { id: publicationId },
      data: updateData,
    });
  } catch (error) {
    throw error;
  }
};

// Elimina una publicación por su ID.
export const deletePublication = async (publicationId) => {
  try {
    return await prisma.publications.delete({
      where: { id: publicationId },
    });
  } catch (error) {
    throw error;
  }
};

// Actualiza solo el estado
export const updatePublicationStatus = async (publicationId, newStatus) => {
  // La validación del estado se hace en el Controller
  try {
    return await prisma.publications.update({
      where: { id: publicationId },
      data: { status: newStatus },
    });
  } catch (error) {
    throw error;
  }
};

// ======================= CREACIÓN CON LÍMITE DE PLAN =======================

export const createPublication = async (clientId, publicationData) => {
  const { title, content_type, publish_date, status } = publicationData;

  if (!VALID_CONTENT_TYPES.includes(content_type)) {
    throw new Error(
      "Tipo de contenido no válido. Solo se permite POST o REEL."
    );
  }

  try {
    // 1. Obtener el cliente y su plan
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, plan: true },
    });

    if (!client) {
      // Usamos un mensaje de error específico que el controller atrapará.
      throw new Error("Cliente asociado no encontrado");
    } // 2. Definir límites por plan (Lógica de Negocio)

    const PLAN_LIMITS = {
      BASIC: { REEL: 4, POST: 8 },
      STANDARD: { REEL: 8, POST: 10 },
      FULL: { REEL: 15, POST: 15 },
    };

    const planLimits = PLAN_LIMITS[client.plan]; // 3. Contar y verificar límite

    const currentCount = await prisma.publications.count({
      where: {
        client_id: clientId,
        content_type: content_type,
      },
    });

    if (currentCount >= planLimits[content_type]) {
      throw new Error(
        `Límite alcanzado para el tipo ${content_type}. Su plan ${client.plan} permite un máximo de ${planLimits[content_type]} ${content_type}s.`
      );
    } // 4. Crear publicación

    return await prisma.publications.create({
      data: {
        client_id: clientId,
        title,
        content_type,
        publish_date: new Date(publish_date),
        status: status || "DRAFT",
      },
    });
  } catch (error) {
    throw error;
  }
};

// ======================= ACCESO CLIENTE (FILTRADO) =======================

// Obtiene las publicaciones 'PUBLISHED' para un cliente (RF-010)
export const getPublishedPublicationsByClientId = async (clientId) => {
  try {
    return await prisma.publications.findMany({
      where: {
        client_id: clientId,
        status: "PUBLISHED", // 🔑 FILTRO CLAVE DE VISIBILIDAD
      },
      include: { media: true, comments: true },
      orderBy: { publish_date: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

// ======================= FUNCIONES AUXILIARES (Para Controller) =======================

// Obtener cliente por user_id (usado en Controller para validar la propiedad)
export const getClientByUserId = async (userId) => {
  try {
    return await prisma.clients.findUnique({
      where: { user_id: userId },
    });
  } catch (error) {
    throw error;
  }
};
