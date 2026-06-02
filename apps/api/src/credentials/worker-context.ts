import { AsyncLocalStorage } from 'node:async_hooks';

export interface WorkerContext {
  jobId: string;
  requestId: string;
}

export const workerContextStorage = new AsyncLocalStorage<WorkerContext>();

export function isInsideWorker(): boolean {
  return workerContextStorage.getStore() !== undefined;
}
