import React from 'react';
import { useDrag } from 'react-dnd';

const Item = ({ item }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { id: item.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: '10px',
        border: '1px solid black',
        margin: '5px',
        cursor: 'move',
      }}
    >
      {item.id} - {item.Category.name} {/* Asegúrate de mostrar el nombre del ítem */}
    </div>
  );
};

export default Item;
