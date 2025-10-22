import { getPrisma } from "../config/db.js";
import bcrypt from "bcrypt";

const prisma = getPrisma();

async function createAdmin() {
  try {
    const existing = await prisma.users.findUnique({
      where: { email: "admin@app.com" },
    });

    if (existing) {
      console.log("⚠️  El admin ya existe:", existing.email);
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin2025#", 10);

    const admin = await prisma.users.create({
      data: {
        email: "admin@app.com",
        password: hashedPassword,
        role: "ADMIN",
        name: "Administrador Master",
      },
    });

    console.log("✅ Admin creado exitosamente:", admin.email);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
