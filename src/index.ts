import { cors } from '@elysiajs/cors';
import { Elysia, t } from 'elysia';
import { createComment, getCommentsByProjectId } from './services/comment';

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

const app = new Elysia()
  .use(cors())
  .ws('/ws', {
    open(ws) {
      console.log('🚀 A new connection has been established');
      ws.subscribe('comment');
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
      }
    },
  })
  .listen(Bun.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
