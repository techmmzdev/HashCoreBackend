import app, { httpServer } from "./app.js";
import { initDB, dbHealthCheck } from "./config/db.js";
import { ENV } from "./config/env.js";

// 🩺 Ruta de salud
app.get("/health", async (req, res) => {
  try {
    const health = await dbHealthCheck();
    res.status(200).json(health);
  } catch (error) {
    console.error("[HEALTH] Error de conexión a DB:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// ---------------------- 🚀 INICIALIZACIÓN DEL SERVIDOR ----------------------
initDB()
  .then(() => {
    httpServer.listen(ENV.port, () => {
      console.log(
        `[ENV] ${ENV.node.toUpperCase()} | DB: ${
          ENV.dbUrl.includes("localhost") ? "Local" : "Supabase"
        }`
      );
      console.log(
        `[HTTP] 🚀 Servidor escuchando en ${ENV.appUrl} (Puerto: ${ENV.port})`
      );
      // startPublicationScheduler();
    });
  })
  .catch((error) => {
    console.error("[DB] ❌ Error al conectar con la base de datos:", error);
    process.exit(1);
  });
