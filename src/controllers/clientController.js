// backend/src/controllers/clientController.js (Versión Corregida)
import * as clientService from "../services/client.service.js";
import { handlePrismaError } from "../utils/errorHandler.js";

// Función auxiliar para manejar errores de forma consistente
const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    // Manejar específicamente los errores 404 de "no encontrado"
    if (
      handledError.message.includes("Cliente no encontrado") ||
      handledError.message.includes("no fue encontrado")
    ) {
      return res.status(404).json({ message: handledError.message });
    } // Cualquier otro error de validación de negocio/cliente
    return res.status(400).json({ message: handledError.message });
  }
  res.status(500).json({ message: defaultMessage + ": Error inesperado." });
};

// Obtener todos los clientes (Solo ADMIN)
export const getAllClients = async (req, res) => {
  try {
    const clients = await clientService.getAllClients();
    res.status(200).json(clients);
  } catch (error) {
    // 🛑 Estandarizado
    handleControllerError(res, error, "Error al obtener la lista de clientes");
  }
};

// Obtener información del cliente propio (CLIENTE/ADMIN si usan /me)
export const getClientInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await clientService.getClientByUserId(userId);
    res.status(200).json(client);
  } catch (error) {
    // 🛑 Estandarizado
    handleControllerError(
      res,
      error,
      "Error al obtener la información del cliente"
    );
  }
};

// Obtener las publicaciones de un cliente específico (Solo ADMIN)
export const getPublicationsForClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    } // Opcional: Verificar si el cliente existe antes de buscar publicaciones // await clientService.getClientById(clientId);

    const publications = await clientService.getPublicationsByClientId(
      clientId
    );
    res.status(200).json(publications);
  } catch (error) {
    // 🛑 Estandarizado
    handleControllerError(
      res,
      error,
      "Error al obtener las publicaciones del cliente"
    );
  }
};

// Obtener un cliente por ID de la tabla 'clients' (clients.id) - SOLO ADMIN
export const getClientByIdAdmin = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const client = await clientService.getClientById(clientId);
    res.status(200).json(client);
  } catch (error) {
    // 🛑 Estandarizado
    handleControllerError(
      res,
      error,
      "Error al obtener la información del cliente"
    );
  }
};

// Soft-delete (marcar cliente como inactivo)
export const deleteClientController = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const deleted = await clientService.deleteClient(clientId);
    res
      .status(200)
      .json({ message: "Cliente eliminado (permanente)", client: deleted });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar el cliente");
  }
};
