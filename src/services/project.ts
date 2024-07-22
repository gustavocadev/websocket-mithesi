import { count, desc, eq, or, sql } from 'drizzle-orm';
import {
  committeeMember,
  thesisProject,
  userLike,
  userTable,
} from '../db/schema';
import { db } from '../db/db';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dtos/create-project.dto';

export const findOneThesisProject = async (
  projectId: string,
  userId: string
): Promise<Project | null> => {
  const [projectFound] = await db
    .select({
      project: thesisProject,
      user: {
        id: userTable.id,
        name: userTable.name,
        lastName: userTable.lastName,
        role: userTable.role,
      },
      likes: count(userLike.id),
      userLikeIds: sql<string[]>`ARRAY_AGG(${userLike.userId})`,
    })
    .from(thesisProject)
    .innerJoin(userTable, eq(userTable.id, thesisProject.userId))
    .leftJoin(userLike, eq(userLike.thesisProjectId, thesisProject.id))
    .where(eq(thesisProject.id, projectId))
    .groupBy(userTable.id, thesisProject.id);

  if (!projectFound) return null;

  return {
    ...projectFound.project,
    user: projectFound.user,
    likes: projectFound.likes,
    userLikeIds: projectFound.userLikeIds,
    isLikedByTheUserAuth: projectFound.userLikeIds.includes(userId),
  };
};

export const findProjectsByUserId = async (
  userId: string,
  userRole: string
): Promise<Project[]> => {
  const projectsByUserSubQuery = db
    .select({
      projects: thesisProject,
      user: {
        id: userTable.id,
        name: userTable.name,
        lastName: userTable.lastName,
        role: userTable.role,
      },
      userLikeIds: sql<string[]>`ARRAY_AGG(${userLike.userId})`,
      likes: count(userLike.id),
    })
    .from(thesisProject)
    .innerJoin(userTable, eq(userTable.id, thesisProject.userId))
    .leftJoin(userLike, eq(userLike.thesisProjectId, thesisProject.id))
    .leftJoin(
      committeeMember,
      eq(committeeMember.thesisProjectId, thesisProject.id)
    )
    .groupBy(userTable.id, thesisProject.id)
    .orderBy(desc(thesisProject.createdAt));

  if (userRole === 'user') {
    const projects = await projectsByUserSubQuery.where(
      or(eq(thesisProject.userId, userId), eq(committeeMember.userId, userId))
    );

    return projects.map((project) => ({
      ...project.projects,
      user: project.user,
      likes: project.likes,
      userLikeIds: project.userLikeIds,
      isLikedByTheUserAuth: project.userLikeIds.includes(userId),
    }));
  }
  const projects = await projectsByUserSubQuery;

  return projects.map((project) => ({
    ...project.projects,
    user: project.user,
    likes: project.likes,
    userLikeIds: project.userLikeIds,
    isLikedByTheUserAuth: project.userLikeIds.includes(userId),
  }));
};

export const createProject = async ({
  userId,
  description,
  title,
  urlImg,
  urlPdf,
}: CreateProjectDto): Promise<void> => {
  await db.insert(thesisProject).values({
    title,
    description,
    userId,
    urlImg,
    urlPdf,
  });
};
