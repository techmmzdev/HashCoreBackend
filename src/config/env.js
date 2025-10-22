// backend/src/config/env.js
import "dotenv/config";

const required = (key, fallback = undefined) => {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`[ENV] Falta variable de entorno: ${key}`);
  }
  return val;
};

export const ENV = {
  // 🌐 Entorno
  node: process.env.NODE_ENV ?? "development",

  // 🔌 Puerto del servidor
  port: parseInt(process.env.PORT ?? "7500", 10),

  // 🗄️ Base de datos
  dbUrl: required("DATABASE_URL"),

  // 🔐 JWT
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",

  // 🌍 URLs base
  appUrl: process.env.APP_URL ?? `http://localhost:7500`,
  clientUrl: process.env.CLIENT_URL ?? `http://localhost:5174`,
};
