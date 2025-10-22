# 🚀 Backend Cheat Sheet - Node.js + Express + Prisma + Socket.IO

Este documento resume todos los comandos y flujos para desarrollo y producción de tu backend.

---

## 🟢 1️⃣ Desarrollo (Local)

| Tarea                            | Comando                  | Descripción                        |
| -------------------------------- | ------------------------ | ---------------------------------- |
| Levantar servidor con hot reload | `npm run dev`            | Usa `nodemon` y `.env.development` |
| Migrar la base de datos          | `npm run prisma:dev`     | Prisma migraciones en desarrollo   |
| Abrir Prisma Studio              | `npm run prisma:studio`  | GUI para explorar DB local         |
| Crear seed (admin inicial)       | `npm run seed:dev`       | Ejecuta script de seed en DB local |
| Ver logs de la app               | Consola de `npm run dev` | Muestra queries, info, warn, error |

**URLs importantes en dev:**

- Backend: `http://localhost:7500`
- Frontend: `http://localhost:8080`
- Health check: `http://localhost:7500/health`
- Socket.IO: CORS permitido desde `ENV.clientUrl`

---

## 🔴 2️⃣ Producción

| Tarea                      | Comando                    | Descripción                              |
| -------------------------- | -------------------------- | ---------------------------------------- |
| Levantar servidor          | `npm run start`            | Usa `node` normal y `.env.production`    |
| Aplicar migraciones        | `npm run prisma:deploy`    | Prisma deploy en DB Supabase             |
| Crear seed (admin inicial) | `npm run seed:prod`        | Ejecuta script de seed en producción     |
| Logs                       | Consola de `npm run start` | Solo warnings y errores                  |
| Health check               | `/health`                  | Verifica que DB y servidor estén activos |

**URLs importantes en prod:**

- Backend: según `ENV.appUrl` (ej: `https://mi-backend.com`)
- Frontend: según `ENV.clientUrl` (ej: `https://mi-frontend.com`)
- Socket.IO: solo desde URLs autorizadas en CORS

---

## 🔧 3️⃣ Combinaciones útiles

### Producción: migrar + seed

```bash
npm run prisma:deploy && npm run seed:prod
```

### Desarrollo: migrar + seed

```bash
npm run prisma:dev && npm run seed:dev
```

### Levantar servidor con logs claros

```bash
# Desarrollo
npm run dev
# Producción
npm run start
```

---

## 💡 4️⃣ Tips finales

- Asegúrate de que `.env.production` tenga la **contraseña URL-encoded** si contiene `@`, `#`, `/`, etc.
- No uses `nodemon` en producción, solo `npm run start`.
- Para debugging de Socket.IO, revisa los logs de `io.on("connection")`.
- Health check `/health` siempre disponible tanto en dev como prod.
