'use client';

import { useMemo, type ReactNode } from 'react';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { SetContextLink } from '@apollo/client/link/context';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_API_URL is not set');
}

export function ApolloClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: `${API_URL ?? ''}/graphql`,
    });

    const authLink = new SetContextLink(async (prevContext) => {
      const token = await getToken({ template: 'graphql' });
      return {
        ...prevContext,
        headers: {
          ...(prevContext.headers as Record<string, string> | undefined),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
  }, [getToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
