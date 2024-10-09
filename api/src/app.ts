import express from 'express';
import { sequelize } from './config/database';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import serviceOrderRoutes from './routes/serviceOrderRoutes';
import serviceOrderItemRoutes from './routes/serviceOrderItemRoutes';
import serviceOrderStoreItemRoutes from './routes/serviceOrderStoreItemRoutes';
// import locationRoutes from './routes/locationRoutes';
// import eventRoutes from './routes/eventRoutes';
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

User.associate();
Role.associate();
Location.associate()
Event.associate()
ServiceOrder.associate()
ServiceOrderItem.associate()
Item.associate()
StoreItem.associate()
ServiceOrderStoreItem.associate()

const app = express();
app.use(express.json());

app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/service-orders', serviceOrderRoutes);//orden de servicios para eventos
app.use('/service-order-items', serviceOrderItemRoutes);//items para eventos
app.use('/service-order-store-items', serviceOrderStoreItemRoutes);//baules de cables para eventos
// app.use('/locations', locationRoutes);
// app.use('/events', eventRoutes);
// app.use('/order-items', orderItemRoutes);
// app.use('/items', itemRoutes);
// app.use('/store-items', storeItemRoutes);

//add locaton
async function seeder():Promise<void> {
  const newLocation = await Location.create({
    locationName: 'Faena',
    address: 'faena 123',
    city: 'CABA',
    country: 'BSAS'
  })
  await Event.create({
    eventName: "Faena algo",
    dateEvent: '06/10/2024',
    locationId: newLocation.id
  })

  const userRole = await Role.create({
    roleName: "User"
  })
  const adminRole = await Role.create({
    roleName: "Admin"
  })
  const users = [{
    username: 'Operador',
    email: 'mail0@mail.mail',
    roleId: userRole.id
  },{
    username: 'Operador 2',
    email: 'mail1@mail.mail',
    roleId: adminRole.id
  }, {
    username: 'Operador 3',
    email: 'mail2@mail.mail',
    roleId: userRole.id
  }]
  await User.bulkCreate(users)
  const items = [
    {
      name: "HDMI",
      description: "HDMI para videos y LCD",
      type: "cable",
      quantity: 45,
      unity: "mts",
      value: 15,
      weight: 300,
      isStorable: true,
      isContainer: false,
      isActive: true,
      uses: 2,
      ownerId: userRole.id
    },
    {
      name: "Baul Azul",
      description: "Baul Azul para cables",
      type: "baul",
      quantity: 2,
      unity: "mts3",
      value: 2,
      weight: 15000,
      isStorable: false,
      isContainer: true,
      isActive: true,
      uses: 5,
      ownerId: userRole.id
    },{
      name: "Panel 20x20",
      description: "Paneles de marca sony de 20px X 20px",
      type: "panel",
      quantity: 30,
      unity: "px",
      value: 200,
      weight: 15000,
      isStorable: true,
      isContainer: false,
      isActive: true,
      uses: 10,
      ownerId: userRole.id
    },{
      name: "Baul de Paneles",
      description: "Baul rojo para paneles",
      type: "baul",
      quantity: 5,
      unity: "mts3",
      value: 2,
      weight: 15000,
      isStorable: false,
      isContainer: true,
      isActive: true,
      uses: 2,
      ownerId: userRole.id
    },{
      name: "Totem para tele",
      description: "Totem para tele 50 Pulgadas",
      type: "totem",
      quantity: 5,
      unity: "mts",
      value: 2,
      weight: 15000,
      isStorable: false,
      isContainer: false,
      isActive: true,
      uses: 2,
      ownerId: userRole.id
    }
  ]
  const newItems = await Item.bulkCreate(items)
  await StoreItem.create({
    itemIdParent: newItems[3].id,
    itemIdChild: newItems[2].id,
    quantity: 6
  })
  
}

sequelize.sync({ force: true }).then(() => {
  seeder()
  console.log('Database connected and synchronized');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

export default app;
