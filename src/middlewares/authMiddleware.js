// backend/src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { getPrisma } from "../config/db.js"; // Necesario para buscar el client_id

const prisma = getPrisma(); // Instancia de Prisma

// ----------------------------------------------------
// FUNCIONES DE UTILIDAD (USADAS POR SOCKET.IO y HTTP)
// ----------------------------------------------------

export const verifySocketToken = (token) => {
  if (!token) return null;
  try {
    // Usa la clave secreta de tu entorno
    const user = jwt.verify(token, ENV.jwtSecret);
    // El payload debe contener { id: userId, role: userRole, clientId: ...}
    return user;
  } catch (error) {
    // TokenExpiredError, JsonWebTokenError, etc.
    console.warn(
      "Intento de conexión de socket con token JWT inválido:",
      error.message
    );
    return null;
  }
};

// Middleware para verificar JWT y obtener datos del usuario
export const authenticateJWT = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token no proporcionado o inválido." });
  }

  try {
    const user = jwt.verify(token, ENV.jwtSecret);
    // El token decodificado contiene { id: userId, role: userRole }
    req.user = user;

    // Si el token pertenece a un CLIENTE, comprobamos que su cliente asociado
    // siga activo. Esto evita que un cliente desactivado use un token viejo.
    if (user.role === "CLIENTE") {
      try {
        const client = await prisma.clients.findUnique({
          where: { user_id: user.id },
        });
        if (client && client.status === false) {
          return res
            .status(403)
            .json({ message: "Cuenta de cliente inactiva." });
        }
      } catch (err) {
        console.error("Error verificando estado del cliente:", err);
        return res
          .status(500)
          .json({ message: "Error interno al verificar la cuenta." });
      }
    }

    return next();
  } catch (err) {
    const status = err.name === "TokenExpiredError" ? 401 : 403;
    return res
      .status(status)
      .json({ message: "Sesión expirada o token no válido." });
  }
};

// ----------------------------------------------------
// MIDDLEWARES DE AUTORIZACIÓN POR ROLES
// ----------------------------------------------------

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "No tienes permisos para realizar esta acción.",
      });
    }
    next();
  };
};

export const requireAdmin = requireRole(["ADMIN"]);
