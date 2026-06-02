import { Writable } from 'node:stream';
import { pino } from 'pino';
import { REDACT_PATHS } from './logger.config';

function captureStream(): { stream: Writable; chunks: string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer | string, _enc, cb) {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
      cb();
    },
  });
  return { stream, chunks };
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('logger redaction', () => {
  const SECRET_VALUES = [
    'sk-ant-api03-AAAAAAAA-Wxyz',
    'sk-proj-AAAAAAAA-1234',
    'AIzaSy-fake-gemini-key-LAST',
    'Bearer eyJhbGciOiJIUzI1NiJ9.SECRET_JWT.body',
    'super-secret-password',
    'CIPHERTEXT_OPAQUE_VALUE_42',
  ];

  function expectClean(chunks: string[]) {
    const output = chunks.join('');
    for (const v of SECRET_VALUES) {
      expect(output).not.toContain(v);
    }
  }

  it('redacts top-level secret-bearing keys', async () => {
    const { stream, chunks } = captureStream();
    const logger = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      stream,
    );
    logger.info({ apiKey: SECRET_VALUES[0] }, 'one');
    logger.info({ encryptedKey: SECRET_VALUES[5] }, 'two');
    logger.info({ password: SECRET_VALUES[4] }, 'three');
    logger.info({ token: SECRET_VALUES[1] }, 'four');
    await flush();
    expectClean(chunks);
  });

  it('redacts nested secret-bearing keys (one level)', async () => {
    const { stream, chunks } = captureStream();
    const logger = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      stream,
    );
    logger.info({ user: { apiKey: SECRET_VALUES[0] } }, 'nested-1');
    logger.info({ ctx: { encryptedKey: SECRET_VALUES[5] } }, 'nested-2');
    logger.info({ payload: { token: SECRET_VALUES[2] } }, 'nested-3');
    await flush();
    expectClean(chunks);
  });

  it('redacts HTTP authorization headers', async () => {
    const { stream, chunks } = captureStream();
    const logger = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      stream,
    );
    logger.info(
      { req: { headers: { authorization: SECRET_VALUES[3] } } },
      'req-log',
    );
    logger.info({ headers: { authorization: SECRET_VALUES[3] } }, 'plain');
    await flush();
    expectClean(chunks);
  });

  it('still emits the surrounding log message', async () => {
    const { stream, chunks } = captureStream();
    const logger = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      stream,
    );
    logger.warn({ apiKey: SECRET_VALUES[0] }, 'save-failed');
    await flush();
    const out = chunks.join('');
    expect(out).toContain('save-failed');
    expect(out).toContain('[REDACTED]');
  });
});
