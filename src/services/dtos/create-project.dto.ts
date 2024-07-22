import { SelectProject } from '../../db/schema';

export type CreateProjectDto = Omit<
  SelectProject,
  'createdAt' | 'updatedAt' | 'id' | 'status'
>;
