// backend/src/services/user.service.js (Versión Corregida)
import { getPrisma } from "../config/db.js";
import { ENV } from "../config/env.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const prisma = getPrisma();
const VALID_PLANS = ["BASIC", "STANDARD", "FULL"];

// Crear un nuevo usuario (RF-001)
export const createUser = async (userData) => {
  // ... (desestructuración de userData y validaciones) ...
  const {
    email,
    password,
    role,
    name,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    plan,
  } = userData;

  if (!email || !password || !role) {
    throw new Error("Email, contraseña y rol son requeridos");
  }
  if (plan && !VALID_PLANS.includes(plan)) {
    throw new Error("Plan no válido. Use BASIC, STANDARD o FULL.");
  }

  try {
    // Excelente uso de $transaction para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await tx.users.create({
        // ⬅️ Usamos tx (transaction client)
        data: {
          email,
          password: hashedPassword,
          role,
          name, // Nota: Considera usar 'CLIENT' en lugar de 'CLIENTE' para consistencia en código
          ...(role === "CLIENTE" && {
            clients: {
              create: {
                company_name,
                contact_name,
                contact_email,
                contact_phone,
                plan: plan || "BASIC",
              },
            },
          }),
        },
        include: { clients: true },
      });
      return newUser;
    });
    return result;
  } catch (error) {
    throw error; // 🛑 Estandarizado: solo lanzar el error original
  }
};

// Generar un JWT para el usuario
export const generateToken = async (user) => {
  // ... (lógica de generateToken) ...
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clients?.[0]?.id || null,
    companyName: user.clients?.[0]?.company_name || null,
    plan: user.clients?.[0]?.plan || null,
  };

  try {
    return jwt.sign(payload, ENV.jwtSecret, { expiresIn: ENV.jwtExpiresIn });
  } catch (error) {
    throw new Error("Error interno al generar el token"); // 🛑 Estandarizado
  }
};

// Iniciar sesión
export const loginUser = async (email, password) => {
  try {
    const user = await prisma.users.findUnique({
      where: { email },
      include: { clients: true },
    });

    // Distinguimos entre usuario inexistente y contraseña inválida
    if (!user) throw new Error("Usuario no encontrado");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Credenciales inválidas");

    // Si el usuario es un CLIENTE y su cliente asociado está marcado como inactivo,
    // no permitimos el inicio de sesión.
    if (user.role === "CLIENTE") {
      const client = user.clients?.[0];
      if (client && client.status === false) {
        // Mensaje informativo pero no excesivamente técnico
        throw new Error("Cuenta inactiva. Contacta al administrador.");
      }
    }

    const token = await generateToken(user);
    return { token };
  } catch (error) {
    // 🛑 CORREGIDO: Lanzamos el error original para que el Controller lo capture
    throw error;
  }
};

// Obtener todos los usuarios (RF-003)
export const getUsers = async () => {
  try {
    return await prisma.users.findMany({
      include: { clients: true },
    });
  } catch (error) {
    throw error; // 🛑 Estandarizado
  }
};

// Obtener usuario por ID (RF-004)
export const getUserById = async (id) => {
  try {
    return await prisma.users.findUnique({
      where: { id },
      include: { clients: true },
    });
  } catch (error) {
    throw error; // 🛑 Estandarizado
  }
};

// Actualizar usuario (RF-004)
export const updateUser = async (id, userData) => {
  // ... (Lógica de validación de ID, plan, y construcción de clientFields/userUpdateData) ...
  const userId = Number(id);
  if (Number.isNaN(userId)) throw new Error("ID inválido"); // ... (extracciones de userData) ...

  const {
    email,
    password,
    role,
    name,
    status,
    plan,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
  } = userData;
  if (plan && !VALID_PLANS.includes(plan)) {
    throw new Error("Plan no válido. Use BASIC, STANDARD o FULL.");
  }

  const userUpdateData = {}; // ... (asignaciones de userUpdateData y clientFields) ...
  if (email !== undefined) userUpdateData.email = email;
  if (role !== undefined) userUpdateData.role = role;
  if (name !== undefined) userUpdateData.name = name;
  if (password) userUpdateData.password = await bcrypt.hash(password, 10);

  const clientFields = {};
  if (company_name !== undefined) clientFields.company_name = company_name;
  if (contact_name !== undefined) clientFields.contact_name = contact_name;
  if (contact_email !== undefined) clientFields.contact_email = contact_email;
  if (contact_phone !== undefined) clientFields.contact_phone = contact_phone;
  if (status !== undefined) clientFields.status = status; // No necesita Boolean() si viene bien desde el front
  if (plan !== undefined) clientFields.plan = plan;

  try {
    // Excelente uso de $transaction
    const result = await prisma.$transaction(async (tx) => {
      const userToUpdate = await tx.users.findUnique({ where: { id: userId } });
      if (!userToUpdate) throw new Error("Usuario no encontrado.");

      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: userUpdateData,
      });

      if (updatedUser.role === "CLIENTE") {
        if (Object.keys(clientFields).length > 0) {
          await tx.clients.upsert({
            where: { user_id: userId },
            create: { user_id: userId, ...clientFields },
            update: clientFields,
          });
        }
      } else {
        // Si el rol cambia de CLIENTE a ADMIN/other, eliminamos la entrada de cliente
        await tx.clients.deleteMany({ where: { user_id: userId } });
      }

      return tx.users.findUnique({
        where: { id: userId },
        include: { clients: true },
      });
    });

    return result;
  } catch (error) {
    throw error; // 🛑 Estandarizado
  }
};

// Eliminar usuario (RF-003)
export const deleteUser = async (id) => {
  try {
    // Buscar usuario primero
    const user = await prisma.users.findUnique({
      where: { id },
      include: { clients: true }, // incluir cliente para manejar media
    });

    if (!user) throw new Error("Usuario no encontrado.");

    // Si el usuario tiene un cliente asociado, eliminar media primero
    if (user.clients && user.clients.length > 0) {
      const clientId = user.clients[0].id;

      // Recolectar media del cliente
      const publications = await prisma.publications.findMany({
        where: { client_id: clientId },
        include: { media: true },
      });

      const mediaFiles = publications.flatMap((pub) =>
        (pub.media || []).map((m) => ({ url: m.url, id: m.id }))
      );

      const uploadsDir = path.join(process.cwd(), "uploads");
      await Promise.all(
        mediaFiles.map(async (m) => {
          if (!m.url) return;
          const absolutePath = path.join(uploadsDir, m.url);
          try {
            if (fs.existsSync(absolutePath)) {
              await fs.promises.unlink(absolutePath);
              console.info(`Removed media file: ${absolutePath}`);
            }
          } catch (fsErr) {
            console.error(
              `Failed to remove media file ${absolutePath}:`,
              fsErr
            );
          }
        })
      );
    }

    // Eliminar usuario (cascade eliminará cliente automáticamente)
    return await prisma.users.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
};

// Cambiar estado del cliente (RF-005)
export const toggleClientStatus = async (id, isActive) => {
  try {
    const status = !!isActive;
    const clientUpdate = await prisma.clients.update({
      where: { user_id: id },
      data: { status },
    });
    return clientUpdate;
  } catch (error) {
    // 🛑 CORREGIDO: Dejar que el Controller maneje el P2025. Solo lanzamos el error.
    throw error;
  }
};
