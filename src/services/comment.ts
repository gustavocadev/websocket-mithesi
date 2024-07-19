import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { comment, SelectComment, userTable } from '../db/schema';

export const getCommentsByProjectId = async (
  projectId: string
): Promise<SelectComment[]> => {
  const comments = await db
    .select({
      comment: comment,
      user: userTable,
    })
    .from(comment)
    .innerJoin(userTable, eq(comment.userId, userTable.id))
    .where(eq(comment.thesisProjectId, projectId));

  return comments.map((comment) => ({
    ...comment.comment,
    user: {
      id: comment.user.id,
      name: comment.user.name,
      lastName: comment.user.lastName,
      role: comment.user.role,
    },
  }));
};

export type CreateCommentDto = {
  projectId: string;
  userId: string;
  content: string;
};

export const createComment = async (
  createCommentDto: CreateCommentDto
): Promise<void> => {
  await db.insert(comment).values({
    content: createCommentDto.content,
    userId: createCommentDto.userId,
    thesisProjectId: createCommentDto.projectId,
  });
};
