// backend/src/controllers/userController.js (Versión Corregida)

import * as userService from "../services/user.service.js";
import { handlePrismaError } from "../utils/errorHandler.js";

// Función auxiliar para manejar errores (la misma lógica de los otros controllers)
const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    // Lógica para errores comunes traducidos
    if (
      handledError.message.includes("no fue encontrado") ||
      handledError.message.includes("Usuario no encontrado")
    ) {
      return res.status(404).json({ message: handledError.message });
    }
    if (
      handledError.message.includes("registrado") ||
      handledError.message.includes("existe")
    ) {
      return res.status(409).json({ message: handledError.message });
    } // Errores de validación de negocio (e.g., plan no válido, campos requeridos)
    if (
      handledError.message.includes("Plan no válido") ||
      handledError.message.includes("requeridos") ||
      handledError.message.includes("ID inválido")
    ) {
      return res.status(400).json({ message: handledError.message });
    }
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

// Crear usuario (solo admin - RF-001)
export const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json({
      user: userWithoutPassword,
      message: "Usuario creado exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al crear el usuario");
  }
};

// Iniciar sesión
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { token } = await userService.loginUser(email, password);
    res.status(200).json({ token });
  } catch (error) {
    // Mapear mensajes del servicio a códigos HTTP específicos
    if (error.message && error.message.includes("Credenciales inválidas")) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message && error.message.includes("Usuario no encontrado")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message && error.message.includes("inactiva")) {
      return res.status(403).json({ message: error.message });
    }

    console.error(error);
    res.status(500).json({ message: "Error interno al iniciar sesión" });
  }
};

// Obtener todos los usuarios (solo admin - RF-003)
export const getUsers = async (req, res) => {
  // 🛑 Nota: La verificación de role !== "ADMIN" se elimina aquí,
  // ya que el middleware 'requireAdmin' de la ruta ya lo maneja.
  try {
    const users = await userService.getUsers();
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);
    res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener los usuarios");
  }
};

// Obtener usuario por ID (admin o el propio - RF-004)
export const getUserById = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId))
      return res.status(400).json({ message: "ID inválido." }); // Lógica de AUTORIZACIÓN: Solo ADMIN o el usuario actual

    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para ver esta información" });
    }

    const user = await userService.getUserById(requestedUserId);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener el usuario");
  }
};

// Actualizar usuario (admin o el propio - RF-004)
export const updateUser = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId))
      return res.status(400).json({ message: "ID inválido." }); // Lógica de AUTORIZACIÓN: Solo ADMIN o el usuario actual

    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res
        .status(403)
        .json({ message: "Solo puedes actualizar tu propia información" });
    } // Lógica de SEGURIDAD: Los clientes no pueden cambiar su propio rol a algo diferente

    if (role === "CLIENTE" && req.body.role && req.body.role !== "CLIENTE") {
      return res.status(403).json({ message: "No puedes cambiar tu rol" });
    }

    const updatedUser = await userService.updateUser(requestedUserId, req.body); // La verificación de "no encontrado" se hace en el servicio, pero la manejamos aquí:
    if (!updatedUser)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar el usuario");
  }
};

// Eliminar usuario (solo admin - RF-003)
export const deleteUser = async (req, res) => {
  // 🛑 Nota: La verificación de role !== "ADMIN" se elimina aquí,
  // ya que el middleware 'requireAdmin' de la ruta ya lo maneja.
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    await userService.deleteUser(userId);
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar el usuario");
  }
};

// Cambiar estado de cliente (solo admin - RF-005)
export const toggleClientStatus = async (req, res) => {
  // 🛑 Nota: La verificación de role !== "ADMIN" se elimina aquí,
  // ya que el middleware 'requireAdmin' de la ruta ya lo maneja.
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "ID inválido." });

    const { isActive } = req.body || {};
    // Validación de entrada para isActive
    if (isActive === undefined || typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ message: "El campo 'isActive' (boolean) es requerido." });
    }

    const updatedClient = await userService.toggleClientStatus(
      userId,
      isActive
    );

    res.status(200).json({
      client: updatedClient,
      message: "Estado del cliente actualizado correctamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al cambiar el estado del cliente");
  }
};
