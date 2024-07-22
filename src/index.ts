import { cors } from '@elysiajs/cors';
import { Elysia, t } from 'elysia';
import { createComment, getCommentsByProjectId } from './services/comment';
import { createProject, findProjectsByUserId } from './services/project';
import { db } from './db/db';
import { sessionTable } from './db/schema';
import { eq } from 'drizzle-orm';

const publishComments = async (projectId: string) => {
  try {
    const comments = await getCommentsByProjectId(projectId);
    app.server!.publish(
      'comment',
      JSON.stringify({
        type: 'get-comments',
        payload: comments,
      })
    );
  } catch (error) {
    console.log('Error:', error);
  }
};

const publishProjects = async (userAuthId: string, userAuthRole: string) => {
  try {
    const projects = await findProjectsByUserId(userAuthId, userAuthRole);

    app.server!.publish(
      'project',
      JSON.stringify({
        type: 'get-projects',
        payload: projects,
      })
    );
  } catch (error) {
    console.log('Error:', error);
  }
};

// const clients: Record<
//   string,
//   ServerWebSocket<{
//     // uid for each connection
//     id: string;
//     data: Context;
//   }>
//   > = {};

const clients: Record<string, string> = {};

const app = new Elysia()
  .use(cors())
  .ws('/ws', {
    async open(ws) {
      const sessionId = ws.data.cookie.auth_session.value;
      if (!sessionId) {
        ws.close();
        return;
      }

      const [user] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.id, sessionId));

      ws.subscribe('comment');
      ws.subscribe(`projects-${user.userId}`);
    },
    body: t.Union([
      t.Object({
        type: t.Literal('get-comments'),
        payload: t.Object({
          projectId: t.String(),
        }),
      }),
      t.Object({
        type: t.Literal('create-comment'),
        payload: t.Object({
          projectId: t.String(),
          content: t.String(),
          userId: t.String(),
        }),
      }),
      t.Object({
        type: t.Literal('create-user-like'),
        payload: t.Object({
          userId: t.String(),
          projectId: t.String(),
        }),
      }),
      t.Object({
        type: t.Literal('delete-user-like'),
        payload: t.Object({
          projectId: t.String(),
          userId: t.String(),
        }),
      }),
      t.Object({
        type: t.Literal('get-projects'),
        payload: t.Object({
          userAuthId: t.String(),
          userAuthRole: t.String(),
        }),
      }),
      t.Object({
        type: t.Literal('create-project'),
        payload: t.Object({
          userAuthId: t.String(),
          userAuthRole: t.String(),
          description: t.String(),
          title: t.String(),
          urlImg: t.String(),
          urlPdf: t.String(),
        }),
      }),
    ]),
    async message(ws, message) {
      switch (message.type) {
        case 'get-comments': {
          const { projectId } = message.payload;
          await publishComments(projectId);
          break;
        }
        case 'create-comment': {
          const { projectId, content, userId } = message.payload;

          await createComment({
            projectId: projectId,
            content: content,
            userId: userId,
          });
          await publishComments(projectId);
          break;
        }
        case 'get-projects': {
          const { userAuthId, userAuthRole } = message.payload;

          console.log('userAuthId:', userAuthId);
          const projects = await findProjectsByUserId(userAuthId, userAuthRole);
          app.server!.publish(
            `projects-${userAuthId}`,
            JSON.stringify({
              type: 'get-projects',
              payload: projects,
            })
          );

          // clients[ws.id] = userAuthId;

          // if (clients[ws.id] === userAuthId) {
          //   await publishProjects(userAuthId, userAuthRole);
          // }
          // clients[ws.id].send(
          //   JSON.stringify({
          //     type: 'get-projects',
          //     payload: projects,
          //   })
          // );
          // ws.send({
          //   type: 'get-projects',
          //   payload: projects,
          // });

          // if (userAuthId === clients.) await publishProjects(userAuthId, userAuthRole);
          break;
        }
        case 'create-project': {
          const {
            userAuthId,
            description,
            title,
            urlImg,
            urlPdf,
            userAuthRole,
          } = message.payload;

          await createProject({
            userId: userAuthId,
            description: description,
            title: title,
            urlImg: urlImg,
            urlPdf: urlPdf,
          });
          // ws.send({
          //   type: 'get-projects',
          //   payload: await findProjectsByUserId(userAuthId, userAuthRole),
          // });
          // await publishProjects(userAuthId, userAuthRole);
          break;
        }
      }
    },
    close(ws) {
      ws.data.cookie.auth_session.value = '';
      ws.unsubscribe('projects');
    },
  })
  .listen(Bun.env.PORT || 8080);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
