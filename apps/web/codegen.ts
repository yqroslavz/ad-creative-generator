import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/**/*.graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/lib/gql/**'],
  ignoreNoDocuments: true,
  generates: {
    'src/lib/gql/': {
      preset: 'client',
      config: {
        scalars: {
          DateTime: 'string',
          ID: 'string',
        },
      },
    },
  },
};

export default config;
