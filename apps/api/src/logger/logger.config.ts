import type { Params } from 'nestjs-pino';

export const REDACT_PATHS = [
  'apiKey',
  'key',
  'authorization',
  'bearer',
  'token',
  'password',
  'secret',
  'encryptedKey',
  'decryptedKey',
  'rawKey',
  '*.apiKey',
  '*.key',
  '*.authorization',
  '*.bearer',
  '*.token',
  '*.password',
  '*.secret',
  '*.encryptedKey',
  '*.decryptedKey',
  '*.rawKey',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

export const loggerConfig: Params = {
  pinoHttp: {
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true },
          },
  },
};
