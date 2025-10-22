// backend/src/server.js (NUEVO ARCHIVO)
import app, { httpServer } from "./app.js"; // Importamos la app y el servidor HTTP
import { initDB, dbHealthCheck } from "./config/db.js"; // Importamos DB
import { ENV } from "./config/env.js";
// import { startPublicationScheduler } from "./scheduler/publicationScheduler.js"; // Scheduler para publicar programadas

// 🩺 Ruta de salud (Se mueve aquí para que pueda usar initDB y dbHealthCheck si lo deseas)
app.get("/health", async (req, res) => {
  try {
    const health = await dbHealthCheck();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({ message: "Database connection failed" });
  }
});

// ---------------------- 🚀 INICIALIZACIÓN DEL SERVIDOR ----------------------
initDB()
  .then(() => {
    httpServer.listen(ENV.port, () => {
      console.log(`[HTTP] 🚀 Servidor escuchando en ${ENV.appUrl}`); // startPublicationScheduler(); // Lo mantenemos comentado por ahora
      // Iniciamos el scheduler de publicaciones programadas
      // startPublicationScheduler();
    });
  })
  .catch((error) => {
    console.error("[DB] ❌ Error al conectar con la base de datos:", error);
    process.exit(1);
  });
