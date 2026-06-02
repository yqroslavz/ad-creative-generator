export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export const GENERATION_QUEUE = 'generation';
export const GENERATION_QUEUE_TOKEN = Symbol('GENERATION_QUEUE');

export const JOB_GENERATE_TEXT = 'generate-text';
export const JOB_REGENERATE_IMAGE = 'regenerate-image';

export interface GenerateTextJobData {
  requestId: string;
}

export interface RegenerateImageJobData {
  creativeId: string;
}

export type GenerationJobData = GenerateTextJobData | RegenerateImageJobData;
