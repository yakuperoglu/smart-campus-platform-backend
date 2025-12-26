const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

let io;

/**
 * Initialize Socket.IO with Redis Adapter
 * @param {Object} server - HTTP Server instance
 */
const initSocket = async (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow all for now, restrict in production
            methods: ["GET", "POST"]
        }
    });

    // Redis Adapter Setup
    if (process.env.REDIS_HOST) {
        try {
            const pubClient = createClient({
                url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
            });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            io.adapter(createAdapter(pubClient, subClient));
            console.log('✅ Socket.IO Redis Adapter initialized');
        } catch (err) {
            console.error('❌ Failed to initialize Redis Adapter:', err.message);
            // Fallback to in-memory adapter if Redis fails? Or process.exit(1)?
            // For robustness, we log and continue in-memory, but strictly we should probably fail if Redis is required.
        }
    }

    // Middleware for Authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error("Authentication error: Invalid token"));
            }
            socket.user = decoded; // Attach user info to socket
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id} (User ID: ${socket.user.id})`);

        // Join a room based on user ID for private notifications
        socket.join(`user:${socket.user.id}`);

        // Join room based on role (e.g., 'admin', 'faculty', 'student')
        if (socket.user.role) {
            socket.join(`role:${socket.user.role}`);
        }

        // Listen for session join events (e.g. from faculty frontend)
        socket.on('join:session', (sessionId) => {
            // Simple security check: In real app, verify they own the session
            socket.join(`session:${sessionId}`);
            console.log(`Socket ${socket.id} joined session:${sessionId}`);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    console.log('✅ WebSocket Server Initialized');
    return io;
};

/**
 * Get Socket.IO instance
 * Use this to emit events from controllers/services
 */
const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };
