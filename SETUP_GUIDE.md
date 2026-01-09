# Backend Setup & Usage Guide

## Quick Start

### 1. Install Dependencies
```bash
cd /home/owedev/Bureau/restaurant-app/backend
npm install
```

### 2. Configure Environment
Ensure your `.env` file has the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret_key
```

### 3. Start the Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## What's New

### ✨ Real-Time Notifications
The backend now supports real-time notifications using Socket.io:

- **Admins** receive notifications when clients create new orders
- **Clients** receive notifications when their order is assigned, in delivery, or delivered
- **Delivery personnel** receive notifications when orders are assigned to them

### ✨ Admin Can Create Delivery Personnel
New endpoint: `POST /api/admin/deliveries/create`

Admins can now directly create delivery personnel accounts without requiring them to register and wait for approval.

---

## Notification Flow

### 1. Client Creates Order
```
Client → Server → Admin receives "new-order" notification
```

### 2. Admin Assigns Order
```
Admin → Server → Delivery receives "order-assigned" notification
                → Client receives "order-status-update" notification
```

### 3. Delivery Updates Status
```
Delivery → Server → Client receives "order-status-update" notification
                  → Admin receives "order-status-update" notification
```

### 4. Delivery Completes Order
```
Delivery → Server → Client receives "Commande validée - Produit livré"
                  → Admin receives "order-delivered" notification
```

---

## Testing the Backend

### Test with Postman

1. **Register a client:**
   ```
   POST http://localhost:3000/api/auth/register
   Body: {
     "fullName": "Test Client",
     "email": "client@test.com",
     "phone": "+1234567890",
     "address": "123 Test St",
     "password": "password123"
   }
   ```

2. **Login:**
   ```
   POST http://localhost:3000/api/auth/login
   Body: {
     "email": "client@test.com",
     "password": "password123"
   }
   ```
   Save the returned `token` for authenticated requests.

3. **Create an order (as client):**
   ```
   POST http://localhost:3000/api/orders
   Headers: Authorization: Bearer <your_token>
   Body: {
     "description": "Test package",
     "deliveryAddress": "456 Delivery St",
     "receiverPhone": "+0987654321",
     "deliveryLocation": {
       "lat": 48.8566,
       "lng": 2.3522
     }
   }
   ```

4. **Create delivery person (as admin):**
   ```
   POST http://localhost:3000/api/admin/deliveries/create
   Headers: Authorization: Bearer <admin_token>
   Body: {
     "fullName": "Test Delivery",
     "email": "delivery@test.com",
     "phone": "+1111111111",
     "password": "password123",
     "vehicleType": "moto"
   }
   ```

5. **Assign order (as admin):**
   ```
   POST http://localhost:3000/api/admin/orders/<order_id>/assign
   Headers: Authorization: Bearer <admin_token>
   Body: {
     "livreurId": "<delivery_person_id>"
   }
   ```

---

## Frontend Integration

### Install Socket.io Client
```bash
npm install socket.io-client
```

### Connect to Server
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// After user logs in
socket.emit('join', {
  userId: user.id,
  role: user.role // 'client', 'admin', or 'livreur'
});
```

### Listen for Notifications

#### For Admin Dashboard
```javascript
socket.on('new-order', (data) => {
  console.log('New order:', data);
  // Show notification: "Nouvelle commande de {clientName}"
  // Update orders list
});

socket.on('order-delivered', (data) => {
  console.log('Order delivered:', data);
  // Show notification: "Commande livrée avec succès"
});
```

#### For Client Dashboard
```javascript
socket.on('order-status-update', (data) => {
  console.log('Order status:', data);
  // Show notification based on status:
  // - ASSIGNED: "Votre commande est en cours - Un livreur a été assigné"
  // - IN_DELIVERY: "Votre commande est en cours de livraison"
  // - DELIVERED: "Commande validée - Produit livré avec succès"
  // Update order status in UI
});
```

#### For Delivery Dashboard
```javascript
socket.on('order-assigned', (data) => {
  console.log('New delivery:', data);
  // Show notification: "Nouvelle commande assignée"
  // Add to deliveries list
});

socket.on('account-created', (data) => {
  console.log('Account created:', data);
  // Show welcome notification
});
```

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register client
- `POST /api/auth/login` - Login

### Client
- `GET /api/client/profile` - Get profile
- `GET /api/client/orders` - Get my orders
- `POST /api/orders` - Create order ⚡ Triggers notification

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users` - List users
- `GET /api/admin/orders` - List orders
- `POST /api/admin/deliveries/create` - Create delivery person ✨ NEW
- `POST /api/admin/orders/:id/assign` - Assign order ⚡ Triggers notifications

### Delivery
- `GET /api/delivery/my-deliveries` - Get assigned orders
- `GET /api/delivery/stats` - Get statistics
- `PATCH /api/delivery/orders/:id/location` - Update location ⚡ Triggers notifications
- `POST /api/delivery/orders/:id/complete` - Complete delivery ⚡ Triggers notifications

---

## Troubleshooting

### Server won't start
- Check MongoDB connection string in `.env`
- Ensure port 3000 is not in use: `lsof -i :3000`

### Notifications not working
- Verify frontend is connecting to Socket.io
- Check that `socket.emit('join', ...)` is called after login
- Ensure user has correct role in JWT token

### CORS errors
- Frontend must be running on `http://localhost:5173`
- Update CORS origin in `server.js` if using different port

---

## Documentation

- **[API_DOCUMENTATION.md](file:///home/owedev/.gemini/antigravity/brain/f19166dd-7bfb-4498-a4e1-cd91ac27b745/API_DOCUMENTATION.md)** - Complete API reference
- **[walkthrough.md](file:///home/owedev/.gemini/antigravity/brain/f19166dd-7bfb-4498-a4e1-cd91ac27b745/walkthrough.md)** - Implementation details

---

## Next Steps

1. **Test with frontend** - Connect your React frontend to the backend
2. **Add notification UI** - Display real-time notifications in the frontend
3. **Test complete flow** - Create order → Assign → Update status → Complete
4. **Deploy** - Deploy to production server when ready
