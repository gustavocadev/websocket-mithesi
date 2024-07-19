import { relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { generateIdFromEntropySize } from 'lucia';

export const roleNames = ['admin', 'user'] as const;
const roleEnum = pgEnum('roleEnum', roleNames);

export const userTable = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateIdFromEntropySize(10)),
  passwordHash: varchar('password_hash').notNull(),
  username: varchar('username'),
  // other user attributes
  name: varchar('name', {
    length: 55,
  }).notNull(),
  lastName: varchar('last_name', {
    length: 55,
  }).notNull(),
  email: varchar('email', {
    length: 100,
  }).notNull(),

  isConfirmed: boolean('is_confirmed').notNull().default(false),
  token: text('token'),

  role: varchar('role').notNull().default('user'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SelectUser = typeof userTable.$inferSelect;

export const userRelations = relations(userTable, ({ many }) => ({
  thesisProject: many(thesisProject),
}));

export const sessionTable = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
});

export type SelectSession = typeof sessionTable.$inferSelect;

const thesisProjectStatus = ['pending', 'approved', 'rejected'] as const;
const thesisProjectStatusEnum = pgEnum(
  'thesisProjectStatusEnum',
  thesisProjectStatus
);
export const thesisProject = pgTable('thesis_project', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateIdFromEntropySize(10)),

  title: text('title').notNull(),
  description: text('description').notNull(),
  urlPdf: text('url_pdf').notNull(),
  urlImg: text('url_img'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),

  // the author of the project
  userId: text('user_id')
    .references(() => userTable.id)
    .notNull(),
});
export type SelectProject = typeof thesisProject.$inferSelect;

export const thesisProjectRelations = relations(
  thesisProject,
  ({ one, many }) => ({
    userTable: one(userTable, {
      fields: [thesisProject.userId],
      references: [userTable.id],
    }),

    comment: many(comment),
  })
);

export const committeeMember = pgTable('committee_member', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateIdFromEntropySize(10)),
  userId: text('user_id')
    .references(() => userTable.id)
    .notNull(),
  thesisProjectId: text('thesis_project_id')
    .references(() => thesisProject.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type SelectCommitteeMember = typeof committeeMember.$inferSelect;

export const committeeMemberRelations = relations(
  committeeMember,
  ({ one }) => ({
    user: one(userTable, {
      fields: [committeeMember.userId],
      references: [userTable.id],
    }),
    thesisProject: one(thesisProject, {
      fields: [committeeMember.thesisProjectId],
      references: [thesisProject.id],
    }),
  })
);

export const comment = pgTable('comment', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateIdFromEntropySize(10)),
  content: text('content').notNull(),
  userId: text('user_id')
    .references(() => userTable.id)
    .notNull(),
  isVisible: boolean('is_visible').notNull().default(true),
  thesisProjectId: text('thesis_project_id').notNull(),
  commentParentId: text('comment_parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export type SelectComment = typeof comment.$inferSelect;

export const commentRelations = relations(comment, ({ one, many }) => ({
  user: one(userTable, {
    fields: [comment.userId],
    references: [userTable.id],
  }),
  thesisProject: one(thesisProject, {
    fields: [comment.thesisProjectId],
    references: [thesisProject.id],
  }),
  commentParent: one(comment, {
    fields: [comment.commentParentId],
    references: [comment.id],
  }),
}));

export const userLike = pgTable(
  'user_like',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateIdFromEntropySize(10)),
    userId: text('user_id')
      .references(() => userTable.id)
      .notNull(),
    thesisProjectId: text('thesis_project_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    first: unique().on(t.userId, t.thesisProjectId),
  })
);
export type SelectUserLike = typeof userLike.$inferSelect;

export const likeRelations = relations(userLike, ({ one }) => ({
  user: one(userTable, {
    fields: [userLike.userId],
    references: [userTable.id],
  }),
  thesisProject: one(thesisProject, {
    fields: [userLike.thesisProjectId],
    references: [thesisProject.id],
  }),
}));
