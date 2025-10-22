// backend/src/services/clientDashboard.service.js (Versión Corregida)
import { getPrisma } from "../config/db.js";
// ❌ ELIMINADO: import { PrismaClient } from "@prisma/client";
// ❌ ELIMINADO: const prisma = new PrismaClient();

const prisma = getPrisma(); // ⬅️ Usar la instancia compartida

export const getClientStats = async (clientId) => {
  try {
    // Definimos el filtro base para todas las consultas (usamos client_id para consistencia con DB)
    const clientFilter = { client_id: clientId }; // ⬅️ CORREGIDO: Usamos client_id, asumiendo la estructura de la tabla // Ejecutamos todas las consultas en paralelo

    const [publicationsCount, publicationsByStatus, topPosts] =
      await Promise.all([
        // 1. Conteo total de publicaciones del cliente
        prisma.publications.count({ where: clientFilter }), // 2. Conteo de publicaciones por estado

        prisma.publications.groupBy({
          by: ["status"],
          where: clientFilter,
          _count: { id: true },
        }), // 3. Obtener 5 publicaciones más relevantes

        prisma.publications.findMany({
          where: clientFilter,
          orderBy: { engagement_score: "desc" }, // Suponiendo que este campo existe
          take: 5,
        }),
      ]); // Formatear el conteo por estado para el gráfico de pastel

    const publicationsStatusMap = publicationsByStatus.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      },
      {
        PUBLISHED: 0,
        SCHEDULED: 0,
        DRAFT: 0,
      }
    ); // Devolvemos los datos

    return {
      totalPublications: publicationsCount,
      publications: publicationsStatusMap,
      topPosts: topPosts.map((p) => ({
        id: p.id,
        title: p.title,
        score: p.engagement_score || 0,
      })),
    };
  } catch (error) {
    // 🛑 CORREGIDO: Simplemente lanzar el error
    console.error(
      `Error al obtener estadísticas para el cliente ${clientId}:`,
      error
    );
    throw error;
  }
};
