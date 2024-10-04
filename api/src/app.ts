import express from 'express';
import { sequelize } from './config/database';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
// import locationRoutes from './routes/locationRoutes';
// import eventRoutes from './routes/eventRoutes';
// import serviceOrderRoutes from './routes/serviceOrderRoutes';
// import orderItemRoutes from './routes/orderItemRoutes';
// import itemRoutes from './routes/itemRoutes';
// import storeItemRoutes from './routes/storeItemRoutes';

import Role from './models/Role';
import User from './models/User';
import Location from './models/Location';
import Event from './models/Event';
import ServiceOrder from './models/ServiceOrder';
import OrderItem from './models/OrderItem';
import Item from './models/Item';
import StoreItem from './models/StoreItem';
import ServiceOrderStoreItem from './models/ServiceOrderStoreItem';

User.associate();
Role.associate();
Location.associate()
Event.associate()
ServiceOrder.associate()
OrderItem.associate()
Item.associate()
StoreItem.associate()
ServiceOrderStoreItem.associate()

const app = express();
app.use(express.json());

app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
// app.use('/locations', locationRoutes);
// app.use('/events', eventRoutes);
// app.use('/service-orders', serviceOrderRoutes);
// app.use('/order-items', orderItemRoutes);
// app.use('/items', itemRoutes);
// app.use('/store-items', storeItemRoutes);

sequelize.sync({ force: false }).then(() => {
  console.log('Database connected and synchronized');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

export default app;
