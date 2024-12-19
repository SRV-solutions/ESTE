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
// import locationRoutes from './routes/locationRoutes';
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
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});


app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/items', itemRoutes);
app.use('/service-orders', serviceOrderRoutes);//orden de servicios para eventos
app.use('/service-order-items', serviceOrderItemRoutes);//items para eventos
app.use('/service-order-store-items', serviceOrderStoreItemRoutes);//baules de cables para eventos
app.use('/events', eventRoutes);
// app.use('/locations', locationRoutes);
// app.use('/order-items', orderItemRoutes);
// app.use('/items', itemRoutes);
// app.use('/store-items', storeItemRoutes);

//add locaton
async function seeder(): Promise<void> {
  const newLocation = await Location.create({
    locationName: 'Faena',
    address: 'faena 1589',
    city: 'CABA',
    country: 'BSAS'
  })
  await Event.create({
    eventName: "Faena Arts - Google",
    dateEvent: '06/10/2024',
    locationId: newLocation.id
  })

  const userRole = await Role.create({
    roleName: "User"
  })
  const adminRole = await Role.create({
    roleName: "Admin"
  })
  const users = await Promise.all([
    {
      username: 'Marcos',
      password: await bcrypt.hash('1234', 10), // Hashear contraseña
      email: 'marcos.costa@wearesrv.com',
      roleId: userRole.id 
    },
    {
      username: 'Facundo',
      password: await bcrypt.hash('1234', 10), // Hashear contraseña
      email: 'facundo.coto@esteeventos.com',
      roleId: adminRole.id
    },
    {
      username: 'Eduardo',
      password: await bcrypt.hash('1234', 10), // Hashear contraseña
      email: 'eduardo.colonnese@esteeventos.com',
      roleId: userRole.id
    }
  ]);

  await User.bulkCreate(users);
  const categories = [
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
    }, {
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
    }, {
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
    }, {
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
    }, {
      name: "Cable de tension",
      description: "Cable de tension",
      type: "cable",
      quantity: 6,
      unity: "v",
      value: 150,
      weight: 3000,
      isStorable: true,
      isContainer: false,
      isActive: true,
    }
  ]
  const newCategories = await Category.bulkCreate(categories)

  const items = [
    {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[0].id // cable HDMI
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[1].id//baul azul
    },
    {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[1].id//baul azul
    },
    {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[0].id// cable HDMI
    },
    {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[4].id// Totem TV
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[5].id// Cable tension
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[3].id// Baul Paneles
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }, {
      isActive: true,
      uses: 2,
      ownerId: userRole.id,
      categoryId: newCategories[2].id// Panel
    }
  ]
  const newItems = await Item.bulkCreate(items)
  const newStoreItems = [
    {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[7].id
    }, {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[8].id
    },
    {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[9].id
    }, {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[10].id
    }, {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[11].id
    }, {
      itemIdParent: newItems[6].id,
      itemIdChild: newItems[12].id
    }
  ]
  await StoreItem.bulkCreate(newStoreItems)
}

sequelize.sync({ force: false }).then(() => {
  // seeder()
  console.log('Database connected and synchronized');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

export default app;
