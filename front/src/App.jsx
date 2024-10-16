import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'; // Importa el backend adecuado
import ServiceOrderForm from './Components/ServiceOrderForm';
import AddItemsToServiceOrder from './Components/AddItemsToServiceOrder';

const App = () => {
  return (
    <Router>
      <DndProvider backend={HTML5Backend}> {/* Configura el backend aquí */}
        <Routes>
          <Route path="/service-orders/new" element={<ServiceOrderForm />} />
          <Route path="/service-orders/:id/items" element={<AddItemsToServiceOrder />} />
        </Routes>
      </DndProvider>
    </Router>
  );
};

export default App;
