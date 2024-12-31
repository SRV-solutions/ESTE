import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './Components/Login';
import ServiceOrderForm from './Components/ServiceOrderForm';
import AddItemsToServiceOrder from './Components/AddItemsToServiceOrder/Index';
import PrivateRoute from './Components/PrivateRoute';
import NavBar from './Components/NavBar';
import ServiceOrderList from './Components/ServiceOrderList';
import Home from './Components/Home';
import ItemTable from './Components/Items/ItemTable'; // Importa tu nuevo componente
import CategoryTable from './Components/Categories/CategoryTable';

const App = () => {
  return (
    <Router>
      <ConditionalNavBar />
      <div style={{ paddingTop: '64px' }}> {/* Espacio para el NavBar fijo */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }/>
          <Route path="/service-orders/new" element={
            <PrivateRoute>
              <ServiceOrderForm />
            </PrivateRoute>
          }/>
          <Route path="/service-orders/:id/items" element={
            <PrivateRoute>
              <AddItemsToServiceOrder />
            </PrivateRoute>
          }/>
          <Route path="/profile" element={
            <PrivateRoute>
              <div>Mi Perfil</div>
            </PrivateRoute>
          }/>
          <Route path="/service-orders" element={
            <PrivateRoute>
              <ServiceOrderList />
            </PrivateRoute>
          }/>
          <Route path="/items" element={
            <PrivateRoute>
              <ItemTable />
            </PrivateRoute>
          }/>
          <Route path="/categories" element={
            <PrivateRoute>
              <CategoryTable />
            </PrivateRoute>
          }/>
        </Routes>
      </div>
    </Router>
  );
};

// Componente que renderiza NavBar solo si no estamos en el Login
const ConditionalNavBar = () => {
  const location = useLocation(); // Obtener la ruta actual
  return location.pathname !== '/login' ? <NavBar /> : null; // Mostrar NavBar solo si no estamos en "/"
};

export default App;
