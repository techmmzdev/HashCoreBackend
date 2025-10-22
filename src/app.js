// backend/src/app.js (Versión Mejorada)
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io"; // ⬅️ Nuevo: Importamos Socket.IO
import { verifySocketToken } from "./middlewares/authMiddleware.js";

import { ENV } from "./config/env.js";
import userRoutes from "./routes/userRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import publicationRoutes from "./routes/publicationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import clientDashboardRoutes from "./routes/clientDashboardRoutes.js";

dotenv.config();

const app = express();
export const httpServer = createServer(app); // ⬅️ Exportamos el servidor HTTP
export const io = new SocketIOServer(httpServer, {
  // ⬅️ Configuramos y exportamos Socket.IO
  cors: {
    origin: [ENV.clientUrl, /\.trycloudflare\.com$/],
    credentials: true,
  },
});

// Simula __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- ⚙️ MIDDLEWARES ----------------------
app.use(
  cors({
    origin: [ENV.clientUrl, /\.trycloudflare\.com$/],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Servir archivos estáticos desde /uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 📢 Middleware para adjuntar 'io' a la solicitud (req.io)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ---------------------- 🚏 RUTAS ----------------------
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api", publicationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dashboard/client", clientDashboardRoutes);

// 🌐 Página raíz para comprobar el estado del servidor
app.get("/", (req, res) => {
  res.type("html").send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Backend API</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-indigo-900 to-pink-600 text-white">
            <header class="text-center">
                <h1 class="text-4xl font-bold mb-2">🚀 Servidor en funcionamiento</h1>
                <p class="text-lg mb-6">Bienvenido al <span class="font-semibold">Backend API</span></p>
            </header>
            <footer class="absolute bottom-4 text-sm opacity-80">
                <p>© ${new Date().getFullYear()} - Backend API funcionando correctamente</p>
            </footer>
        </body>
        </html>
    `);
});

// ---------------------- 🟢 CONFIGURACIÓN SOCKET.IO ----------------------
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Nuevo cliente conectado: ${socket.id}`);

  socket.on("join_admin_notifications", (token) => {
    // 1. Verificar el token y obtener el payload
    const user = verifySocketToken(token);

    if (user && user.role === "ADMIN") {
      // 2. Token válido y rol de ADMIN: unir a la sala
      socket.join("admin_notifications");
      console.log(
        `[Socket.IO] ADMIN ${user.id} se unió a la sala 'admin_notifications'`
      );
      // Opcional: emitir un mensaje de éxito solo a este socket
      socket.emit("join_success", {
        message: "Conectado al canal de notificaciones.",
      });
    } else {
      // 3. Token inválido o no es ADMIN: loguear y rechazar
      console.warn(
        `[Socket.IO] Rechazado: Intento de unirse a la sala de admin. Rol: ${
          user?.role || "INVÁLIDO"
        }`
      );
      // Opcional: avisar al cliente que la conexión fue rechazada
      socket.emit("join_failure", {
        message: "No autorizado para unirse a este canal.",
      });
    }
  });

  socket.on("disconnect", () => {
    // Socket.IO automáticamente saca al socket de la sala.
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

export default app;
