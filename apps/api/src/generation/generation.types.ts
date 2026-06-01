import type { ImageMode, TextProvider } from '@prisma/client';

export interface GenerateCreativesInput {
  projectId: string;
  n: number;
  textProvider?: TextProvider | null;
  imageMode?: ImageMode | null;
}
