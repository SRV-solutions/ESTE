import express, { Request, NextFunction } from 'express';
import { sequelize } from './config/database';
import bcrypt from 'bcrypt';

import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import itemRoutes from './routes/itemRoutes';
import serviceOrderRoutes from './routes/serviceOrderRoutes';
import serviceOrderItemRoutes from './routes/serviceOrderItemRoutes';
import serviceOrderStoreItemRoutes from './routes/serviceOrderStoreItemRoutes';
import eventRoutes from './routes/eventRoutes';
import categoryRoutes from './routes/categoryRoutes';
import locationRoutes from './routes/locationRoutes';
import storeItemRoutes from './routes/storeItemRoutes';
// import orderItemRoutes from './routes/orderItemRoutes';
// import itemRoutes from './routes/itemRoutes';
// import storeItemRoutes from './routes/storeItemRoutes';

import Role from './models/Role';
import User from './models/User';
import Location from './models/Location';
import Event from './models/Event';
import ServiceOrder from './models/ServiceOrder';
import ServiceOrderItem from './models/ServiceOrderItem';
import Item from './models/Item';
import StoreItem from './models/StoreItem';
import ServiceOrderStoreItem from './models/ServiceOrderStoreItem';
import Category from './models/Category';

User.associate();
Role.associate();
Location.associate()
Event.associate()
ServiceOrder.associate()
ServiceOrderItem.associate()
Item.associate()
StoreItem.associate()
ServiceOrderStoreItem.associate()
Category.associate()

const app = express();

app.use(express.json());

app.use((req: Request, res: any, next: NextFunction) => {
  const allowedOrigins = ['http://localhost:5173', 'https://este.wearesrv.com'];
  const origin: any = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});


app.get('/hola', (_req, res) => {
  res.send('Hola Mundo')
});

app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/items', itemRoutes);
app.use('/store-items', storeItemRoutes);
app.use('/service-orders', serviceOrderRoutes);//orden de servicios para eventos
app.use('/service-order-items', serviceOrderItemRoutes);//items para eventos
app.use('/service-order-store-items', serviceOrderStoreItemRoutes);//baules de cables para eventos
app.use('/events', eventRoutes);
app.use('/categories', categoryRoutes);
app.use('/locations', locationRoutes);
// app.use('/order-items', orderItemRoutes);
// app.use('/items', itemRoutes);
// app.use('/store-items', storeItemRoutes);

const forceSync = process.env.FORCE_SYNC === "true";
sequelize.sync({ force: forceSync }).then(() => {
  console.log('Database connected and synchronized');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

export default app;
