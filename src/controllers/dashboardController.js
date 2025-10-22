// backend/src/controllers/dashboardController.js (Versión Correcta)
import * as dashboardService from "../services/dashboard.service.js"; // ⬅️ Renombrado para consistencia

export const getDashboardStats = async (req, res) => {
  try {
    // 🛑 CORREGIDO: Usamos el export named del service
    const stats = await dashboardService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error en el controlador al obtener estadísticas:", error);
    res.status(500).json({
      message:
        "Error interno del servidor al obtener las estadísticas del dashboard.",
    });
  }
};
