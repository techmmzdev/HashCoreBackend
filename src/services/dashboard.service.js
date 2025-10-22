// backend/src/services/dashboardService.js (Versión Corregida)
import { getPrisma } from "../config/db.js";

const prisma = getPrisma(); // ⬅️ Usar la instancia compartida

export const getStats = async () => {
  try {
    const [
      totalUsers,
      totalClients,
      activeClients,
      totalPublications,
      publicationsByStatus,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.clients.count(),
      prisma.clients.count({ where: { status: true } }),
      prisma.publications.count(), // Obtener el recuento de publicaciones por estado
      prisma.publications.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]); // Formatear los datos de las publicaciones

    const formattedPublications = publicationsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    return {
      totalUsers,
      totalClients,
      activeClients,
      totalPublications,
      publications: formattedPublications,
    };
  } catch (error) {
    // 🛑 CORREGIDO: Simplemente lanzar el error
    console.error("Error al obtener las estadísticas del dashboard:", error);
    throw error;
  }
};
