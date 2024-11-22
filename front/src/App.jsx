import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Components/Login';
import ServiceOrderForm from './Components/ServiceOrderForm';
import AddItemsToServiceOrder from './Components/AddItemsToServiceOrder';
import PrivateRoute from './Components/PrivateRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/service-orders/new"
          element={
            <PrivateRoute>
              <ServiceOrderForm />
            </PrivateRoute>
          }
        />
        <Route
          path="/service-orders/:id/items"
          element={
            <PrivateRoute>
              <AddItemsToServiceOrder />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
