import jwt from 'jsonwebtoken'; 
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
dotenv.config();
import { db } from './db/pool.js';
import {
   pubClient,
   subClient,
   closeRedisConnections,
   redisOperations
} from './redis/index.js';
import { createUserService } from './services/user.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createMessageService } from './services/message.js';
import { handleDisconnect } from './handlers/index.js';
import { createSendMessageHandler, createSendSeenMessageHandler } from './handlers/index.js';
import { createHealthHandler } from './handlers/health.js';
import { logger } from './shared/logger.js';


const healthHandler = createHealthHandler();

const httpServer = createServer((req, res) => {
  healthHandler(req, res);
});
const io = new Server(httpServer, {
   adapter: createAdapter(pubClient, subClient),
   cors: {
      origin: process.env.URL_FRONT_END || '*',
      methods: ['GET', 'POST']
   }
});

const userService = createUserService(db);
const messageService = createMessageService(db);

const sendMessageHandler = createSendMessageHandler(
   messageService,
   io,
   redisOperations
);
const sendSeenMessageHandler = createSendSeenMessageHandler(   
   messageService,
   io,
)

const authMiddleware = createAuthMiddleware(jwt, userService)

io.use(authMiddleware)

io.on('connection', (socket) => {
   logger.info(`Cliente conectado: ${socket.id}`);

   socket.on('send-message', (data, callback) => sendMessageHandler(socket, data, callback));
   socket.on('seen-message', (data, callback) => sendSeenMessageHandler(socket, data, callback))
   socket.on('disconnect', () => handleDisconnect(socket));
});

httpServer.listen(process.env.PORT || 8080, () => {
   logger.info('Servidor WebSocket rodando');
});

process.on('SIGINT', async () => {
   await closeRedisConnections();
   process.exit(0);
});
