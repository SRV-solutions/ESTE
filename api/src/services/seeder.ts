import Role from '../models/Role';
import User from '../models/User';
import Location from '../models/Location';
import Event from '../models/Event';
import Item from '../models/Item';
import StoreItem from '../models/StoreItem';
import Category from '../models/Category';

export async function seeder(): Promise<void> {
  // Crear ubicación y evento
  const newLocation = await Location.create({
    locationName: 'Faena',
    address: 'faena 123',
    city: 'CABA',
    country: 'BSAS'
  });
  
  await Event.create({
    eventName: "Faena algo",
    dateEvent: '06/10/2024',
    locationId: newLocation.id
  });

  // Crear roles y usuarios
  const userRole = await Role.create({ roleName: "User" });
  const adminRole = await Role.create({ roleName: "Admin" });

  const users = [
    { username: 'Operador', email: 'mail0@mail.mail', roleId: userRole.id },
    { username: 'Operador 2', email: 'mail1@mail.mail', roleId: adminRole.id },
    { username: 'Operador 3', email: 'mail2@mail.mail', roleId: userRole.id }
  ];
  
  await User.bulkCreate(users);

  // Crear categorías de elementos
  const categories = await Category.bulkCreate([
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
      name: "Cable de tensión",
      description: "Cable de tensión largo",
      type: "cable",
      quantity: 6,
      unity: "v",
      value: 150,
      weight: 3000,
      isStorable: true,
      isContainer: false,
      isActive: true,
    }
  ]);

  // Crear ítems en base a las categorías
  const items = categories.map((category) => ({
    isActive: true,
    uses: 2,
    ownerId: userRole.id,
    categoryId: category.id,
  }));
  
  const createdItems = await Item.bulkCreate(items);

  // Crear StoreItems para ítems que requieran almacenamiento
  const storableItems = createdItems.filter((item) => {
    const category = categories.find(cat => cat.id === item.categoryId);
    return category?.isStorable;
  });

  const storeItems = storableItems.map((item, index) => ({
    itemId: item.id,
    locationId: newLocation.id,
    storageDate: new Date(),
    quantity: index % 3 + 1 // Distribuir cantidades de ejemplo
  }));

  await StoreItem.bulkCreate(storeItems);
}
