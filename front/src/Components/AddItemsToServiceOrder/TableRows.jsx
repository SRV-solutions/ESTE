import React, { useState } from 'react';
import {
    TableCell,
    TableRow,
    IconButton,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export const renderTableRows = (
    item, 
    color, 
    allItems, 
    handleDeleteItem, 
    canEditOrder, 
    itemIdParent = NaN
  ) => {
    const [selectedCode, setSelectedCode] = useState(item?.code || "-");
  
    const handleCodeChange = (event) => {
      setSelectedCode(event.target.value);
    };
  
    const itemsInCategory = allItems.filter(filetrItem => filetrItem.categoryId === item.categoryId);
    const availableCodes = itemsInCategory.map(item => item.code);
  
    return (
      <TableRow key={item.id} sx={{ backgroundColor: color || '' }}>
        <TableCell align="center">
          {canEditOrder() ? (
            <FormControl fullWidth>
              <InputLabel>Seleccionar Código</InputLabel>
              <Select
                value={selectedCode}
                onChange={handleCodeChange}
                label="Seleccionar Código"
              >
                <MenuItem value="-">-</MenuItem>
                {availableCodes.map((code, index) => (
                  <MenuItem key={index} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            selectedCode
          )}
        </TableCell>
        <TableCell align="center">{item.Category?.name || 'Desconocido'}</TableCell>
        <TableCell align="center">{item.Category?.description || 'N/A'}</TableCell>
        <TableCell align="center">{item.Category?.type || 'Desconocido'}</TableCell>
        <TableCell align="center">{item.Category?.isStorable ? 'SI' : 'NO'}</TableCell>
        <TableCell align="center">{item.Category?.isContainer ? 'SI' : 'NO'}</TableCell>
        {canEditOrder() && (
          <TableCell align="center">
            <IconButton
              onClick={() => handleDeleteItem(item.id, itemIdParent)}
              sx={{
                color: '#757575',
                '&:hover': {
                  color: '#ff0000',
                  cursor: 'pointer',
                },
              }}
            >
              <DeleteIcon />
            </IconButton>
          </TableCell>
        )}
      </TableRow>
    );
  };
  