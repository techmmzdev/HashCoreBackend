import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";

import { ENV } from "./config/env.js";
import { verifySocketToken } from "./middlewares/authMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import publicationRoutes from "./routes/publicationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import clientDashboardRoutes from "./routes/clientDashboardRoutes.js";

dotenv.config();

const app = express();
export const httpServer = createServer(app);
export const io = new SocketIOServer(httpServer, {
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
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Middleware para inyectar 'io' en req
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

// Servir carpeta pública
app.use(express.static("public"));

// Página raíz de prueba
app.get("/", (req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Backend API</title>
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <style>
        body {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #312e81, #db2777);
          color: white;
          font-family: 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          position: relative;
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        p { font-size: 1.2rem; margin-bottom: 2rem; }
        footer { position: absolute; bottom: 1rem; font-size: 0.9rem; opacity: 0.8; }
      </style>
    </head>
    <body>
      <header>
        <h1>🚀 Servidor en funcionamiento</h1>
        <p>Bienvenido al <span>Backend API</span></p>
      </header>
      <footer>
        <p>© ${new Date().getFullYear()} - Backend API funcionando correctamente</p>
      </footer>
    </body>
    </html>
  `);
});

// ---------------------- 🟢 SOCKET.IO ----------------------
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Nuevo cliente conectado: ${socket.id}`);

  socket.on("join_admin_notifications", (token) => {
    let user;
    try {
      user = verifySocketToken(token);
    } catch (err) {
      console.warn(`[Socket.IO] Token inválido: ${err.message}`);
      socket.emit("join_failure", { message: "Token inválido" });
      return;
    }

    if (user && user.role === "ADMIN") {
      socket.join("admin_notifications");
      console.log(
        `[Socket.IO] ADMIN ${user.id} se unió a la sala 'admin_notifications'`
      );
      socket.emit("join_success", {
        message: "Conectado al canal de notificaciones.",
      });
    } else {
      console.warn(`[Socket.IO] Rechazado: Rol ${user?.role || "INVÁLIDO"}`);
      socket.emit("join_failure", {
        message: "No autorizado para unirse a este canal.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

export default app;
