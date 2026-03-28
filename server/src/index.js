import express from 'express';
import cors from 'cors';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 4000;

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    cors({ origin: '*' }),
    express.json(),
    expressMiddleware(apolloServer)
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
}

main().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
