import express from 'express';
import { sequelize } from './config/database';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';

const app = express();

app.use(express.json());
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);

sequelize.sync({ force: true }).then(() => {
  console.log('Database connected');
});

export default app;
