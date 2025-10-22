// backend/src/controllers/clientDashboardController.js (Versión Corregida)
import * as dashboardService from "../services/clientDashboard.service.js"; // ⬅️ Renombrado para consistencia
import { handlePrismaError } from "../utils/errorHandler.js"; // ⬅️ Importamos el manejador

// Función auxiliar para manejar errores
const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    // Dado que son estadísticas, un error 404 es poco probable.
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

export const getClientDashboardStats = async (req, res) => {
  // El clientId se obtiene del token/usuario que el middleware JWT adjuntó
  const { clientId, role } = req.user;

  // 🎯 Lógica de AUTORIZACIÓN: Solo el CLIENTE puede acceder a SU dashboard
  // El ADMIN debe usar la ruta de dashboard general.
  if (role !== "CLIENT") {
    return res
      .status(403)
      .json({ message: "No tienes permiso para ver este dashboard." });
  }

  if (!clientId) {
    // Este caso es raro si el token está bien construido, pero es buena práctica.
    return res
      .status(403)
      .json({ message: "No autorizado. Usuario no asociado a un cliente." });
  }

  try {
    const stats = await dashboardService.getClientStats(clientId);
    res.status(200).json(stats);
  } catch (error) {
    // 🛑 CORREGIDO: Usamos el manejador estandarizado
    handleControllerError(
      res,
      error,
      "Error al obtener las estadísticas del dashboard del cliente"
    );
  }
};
