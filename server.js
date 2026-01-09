require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const app = express();
const connectDB = require('./database/db');
const authRoute = require("./routes/auth-route");
const adminRoute = require("./routes/admin-route");
const deliveryRoute = require("./routes/delivery-route");
const OrderRoutes = require('./routes/order-route');
const clientRoute = require("./routes/client-route");
const supportRoute = require("./routes/support-route");
const notificationRoute = require("./routes/notification-route");

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes via req.app
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Join room based on user role
  socket.on('join', (data) => {
    const { userId, role } = data;
    socket.join(role); // Join role-based room (admin, client, livreur)
    socket.join(userId); // Join user-specific room
    console.log(`User ${userId} (${role}) joined rooms`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Middleware to parse JSON requests
app.use(express.json());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/delivery", deliveryRoute);
app.use('/api/orders', OrderRoutes);
app.use("/api/client", clientRoute);
app.use("/api/support", supportRoute);
app.use("/api/notifications", notificationRoute);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});