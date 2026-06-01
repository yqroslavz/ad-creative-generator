export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export const GENERATION_QUEUE = 'generation';
export const GENERATION_QUEUE_TOKEN = Symbol('GENERATION_QUEUE');

export const JOB_GENERATE_TEXT = 'generate-text';

export interface GenerateTextJobData {
  requestId: string;
}
