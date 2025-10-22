// src/services/client.service.js
import { getPrisma } from "../config/db.js";
import fs from "fs";
import path from "path";

const prisma = getPrisma();

// Obtener todos los clientes (Solo para ADMIN)
export const getAllClients = async () => {
  try {
    // RF-005: ADMIN puede leer todos los clientes.
    return await prisma.clients.findMany({
      // Incluimos la info del usuario y el plan para el panel de ADMIN
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  } catch (error) {
    // Lanzamos el error para que el controller lo maneje.
    throw error;
  }
};

// Obtener un cliente específico por user_id (Usado por CLIENTE/ADMIN)
export const getClientByUserId = async (userId) => {
  try {
    const client = await prisma.clients.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!client) {
      // 🛑 CORRECCIÓN: Usar un mensaje estandarizado para que el controlador lo detecte como 404
      throw new Error("Cliente no encontrado.");
    }
    return client;
  } catch (error) {
    throw error;
  }
};

// ===============================================
// Lógica de VISTA DE PUBLICACIONES DE CLIENTE (ADMIN)
// ===============================================

// Obtener TODAS las publicaciones de un cliente específico (Solo ADMIN)
export const getPublicationsByClientId = async (clientId) => {
  try {
    // Requerimiento del ADMIN: Ver publicaciones específicas por cliente.
    const publications = await prisma.publications.findMany({
      where: {
        client_id: clientId,
      },
      // Incluimos media y comentarios para una vista completa de ADMIN
      include: {
        media: true,
        comments: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: {
        publish_date: "desc", // Ordenar por fecha de publicación
      },
    });

    return publications;
  } catch (error) {
    throw error;
  }
};

// Obtener un cliente por clients.id (Solo para ADMIN)
export const getClientById = async (clientId) => {
  try {
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!client) {
      throw new Error("Cliente no encontrado."); // 🛑 Mensaje estandarizado
    }
    return client;
  } catch (error) {
    throw error;
  }
};

// Hard-delete de un cliente y limpieza de media asociada (Solo ADMIN)
export const deleteClient = async (clientId) => {
  try {
    // 1) Recolectar todos los media asociados a las publicaciones del cliente
    const publications = await prisma.publications.findMany({
      where: { client_id: clientId },
      include: { media: true },
    });

    const mediaFiles = publications.flatMap((pub) =>
      (pub.media || []).map((m) => ({ url: m.url, id: m.id }))
    );

    // 2) Borrar ficheros del disco (uploads/) si existen. No detenemos la operación
    // si algún fichero no se pudo eliminar; registramos y continuamos.
    const uploadsDir = path.join(process.cwd(), "uploads");
    await Promise.all(
      mediaFiles.map(async (m) => {
        if (!m.url) return;
        const absolutePath = path.join(uploadsDir, m.url);
        try {
          if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            console.info(`Removed media file: ${absolutePath}`);
          } else {
            console.warn(`Media file not found, skipping: ${absolutePath}`);
          }
        } catch (fsErr) {
          console.error(`Failed to remove media file ${absolutePath}:`, fsErr);
        }
      })
    );

    // 3) Hard-delete del cliente; las filas relacionadas se eliminarán por cascada en DB
    const deleted = await prisma.clients.delete({
      where: { id: clientId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return deleted;
  } catch (error) {
    // Normalizar error de registro no encontrado
    if (error?.code === "P2025") {
      throw new Error("Cliente no encontrado.");
    }
    throw error;
  }
};
