// backend/src/services/comment.service.js (Versión Corregida)
import { getPrisma } from "../config/db.js";

const prisma = getPrisma();

// Crea un nuevo comentario en una publicación.
export const createComment = async (publicationId, userId, commentData) => {
  const { comment, text } = commentData;
  const commentText = comment || text;

  if (!commentText) {
    // Error de validación de negocio, se lanza.
    throw new Error("El comentario no puede estar vacío.");
  }

  try {
    const newComment = await prisma.comments.create({
      data: {
        publication_id: publicationId,
        user_id: userId,
        comment: commentText,
      },
    });
    return newComment;
  } catch (error) {
    // 🛑 CORREGIDO: Solo se lanza el error (el Controller se encarga de traducirlo)
    throw error;
  }
};

// Obtiene todos los comentarios de una publicación.
export const getCommentsByPublicationId = async (publicationId) => {
  try {
    const comments = await prisma.comments.findMany({
      where: { publication_id: publicationId },
      include: {
        user: {
          select: { id: true, email: true, role: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return comments;
  } catch (error) {
    // 🛑 CORREGIDO: Solo se lanza el error
    throw error;
  }
};

export const deleteComment = async (commentId) => {
  try {
    const deletedComment = await prisma.comments.delete({
      where: { id: commentId },
    });
    return deletedComment;
  } catch (error) {
    // 🛑 CORREGIDO: Solo se lanza el error
    throw error;
  }
};

export const getCommentById = async (commentId) => {
  try {
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return comment;
  } catch (error) {
    throw error;
  }
};
