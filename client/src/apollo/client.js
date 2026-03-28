import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const httpUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

const httpLink = new HttpLink({
  uri: httpUrl,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
