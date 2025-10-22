// src/utils/errorHandler.js
export const handlePrismaError = (
  error,
  defaultMessage = "Error en el servidor"
) => {
  // 1. Manejar errores que ya tienen un mensaje claro (ej. de validación de negocio)
  if (error.message && !(error.code && error.clientVersion)) {
    // Si es un Error estándar (no de Prisma), lo lanzamos directamente.
    throw new Error(error.message);
  }

  // 2. Manejar errores específicos de Prisma por código
  if (error.code) {
    switch (error.code) {
      case "P2002":
        // Violación de restricción de unicidad (ej. email ya existe)
        const field = error.meta?.target
          ? error.meta.target.join(", ")
          : "campo(s)";
        throw new Error(`El registro ya existe para el/los ${field}.`);

      case "P2000":
        // Valor de datos truncado o no válido.
        throw new Error(
          "Los datos proporcionados no son válidos o son demasiado largos."
        );

      case "P2025":
        // Registro no encontrado para operaciones de actualización/eliminación
        throw new Error("El registro solicitado no fue encontrado.");

      case "P2003":
        // Falla de restricción de clave foránea (ej. intentar eliminar un cliente con publicaciones activas, o usar un ID no existente)
        throw new Error(
          "Error de relación: No se puede completar la acción. Asegúrese de que todos los IDs relacionados sean válidos."
        );

      default:
        // Manejar cualquier otro código de error de Prisma no contemplado
        console.error(
          "Código de error Prisma no contemplado:",
          error.code,
          error.meta,
          error
        );
        throw new Error(
          defaultMessage +
            ": Ha ocurrido un error inesperado en la base de datos."
        );
    }
  }

  // 3. Manejar errores totalmente inesperados
  console.error("Error inesperado no contemplado:", error);
  throw new Error(defaultMessage + ": Ha ocurrido un error inesperado.");
};
