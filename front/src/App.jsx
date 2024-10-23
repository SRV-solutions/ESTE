import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ServiceOrderForm from './Components/ServiceOrderForm';
import AddItemsToServiceOrder from './Components/AddItemsToServiceOrder';

const App = () => {
  return (
    <Router>
        <Routes>
          <Route path="/service-orders/new" element={<ServiceOrderForm />} />
          <Route path="/service-orders/:id/items" element={<AddItemsToServiceOrder />} />
        </Routes>
    </Router>
  );
};

export default App;
