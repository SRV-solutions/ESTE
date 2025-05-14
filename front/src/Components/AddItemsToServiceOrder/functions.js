    const generatePDF = () => {
        const doc = new jsPDF();

        // Agregar el título
        doc.setFontSize(18);
        doc.text("Orden de Servicio", 14, 20);

        // Agregar detalles de la orden de servicio
        doc.setFontSize(12);
        doc.text(`ID de la Orden: ${serviceOrder.id}`, 14, 30);
        doc.text(`Estado: ${status[serviceOrder.status]}`, 14, 35);
        doc.text(`Pedido por: ${serviceOrder.OrderedBy.username}`, 14, 40);
        doc.text(`Desplegado por: ${serviceOrder.DeployedBy.username}`, 14, 45);
        doc.text(`Verificado por: ${serviceOrder.CheckedBy.username}`, 14, 50);
        doc.text(`Cliente: ${serviceOrder?.Event?.Location?.locationName} - ${serviceOrder?.Event?.organizer} - ${serviceOrder?.Event?.producer} - ${serviceOrder?.Event?.finalClient}`, 14, 55);

        let startY = 60 + 10; // posición inicial para las tablas de ítems

        // Agrupar los ítems por categoría
        const groupedItems = serviceOrder.ServiceOrderItems.reduce((acc, item) => {
            const categoryId = item.Item.categoryId;

            // Verificar si la categoría ya existe en el acumulador
            if (!acc[categoryId]) {
                acc[categoryId] = { items: [], totalLength: 0 };  // Crear un array y una propiedad totalLength
            }

            // Agregar el item al array correspondiente a su categoría
            acc[categoryId].items.push(item);
            acc[categoryId].totalLength = acc[categoryId].items.length;  // Sumar la cantidad de ítems

            return acc;  // Retornar el acumulador para la siguiente iteración
        }, {});

        // Recorrer las categorías agrupadas y agregar tablas por categoría
        Object.keys(groupedItems).forEach(categoryId => {
            const categoryGroup = groupedItems[categoryId];
            const categoryItems = categoryGroup.items;
            // Obtener el nombre y el código de la categoría
            const categoryCode = categoryItems[0].Item.Category.code;
            const categoryName = categoryItems[0].Item.Category.name;
            const isContainer = categoryItems[0].Item.Category.isContainer;

            // Título de la categoría
            doc.setFontSize(14);
            doc.text(`Categoría: ${categoryCode} - ${categoryName}`, 14, startY);

            // Agregar la cantidad total de ítems para esta categoría
            doc.setFontSize(14);
            doc.text(`Total de ítems: ${categoryGroup.totalLength}`, 14, startY + 10);

            startY += 20; // Ajustar posición Y para los ítems

            // Si la categoría tiene ítems que son contenedores, procesarlos
            // if (isContainer) {
            //     categoryItems.forEach(item => {
            //         const storeItems = item.Item.StoreItemParentItem;

            //         // Título del contenedor
            //         doc.setFontSize(14);
            //         doc.text(`Codigo del contenedor: ${item.Item.code} - ${item.Item.Category.name}`, 14, startY);
            //         startY += 2; // Ajustar la posición para los ítems dentro del contenedor
            //         if (storeItems && storeItems.length > 0) {

            //             const documentData = storeItems.map(subItem => [
            //                 subItem.code,
            //                 subItem.Category.name,
            //                 subItem.Category.description,
            //             ]);
            //             doc.autoTable({
            //                 head: [["Código", "Categoría", "Descripción"]],
            //                 body: documentData,
            //                 startY: startY,
            //                 styles: { fontSize: 10 },
            //             });
            //             startY = doc.lastAutoTable.finalY + 15;
            //         } else {
            //             // Si no tiene ítems dentro, mostrar un mensaje
            //             doc.setFontSize(10);
            //             doc.text("No hay ítems dentro de este contenedor.", 14, startY);
            //             startY += 15;
            //         }
            //     });
            // } else {
            //     // Si no es contenedor, agregar los ítems directamente
            //     doc.text(`Items`, 14, startY);
            //     startY+=2
            //     const itemsData = categoryItems.map(item => [
            //         item.Item.code,
            //         item.Item.Category.name,
            //         item.Item.Category.description,
            //     ]);

            //     doc.autoTable({
            //         head: [["Código", "Categoría", "Descripción"]],
            //         body: itemsData,
            //         startY: startY,
            //         styles: { fontSize: 10 },
            //     });

            //     // Actualizar la posición Y después de la tabla
            //     startY = doc.lastAutoTable.finalY + 15;
            // }
        });

        // Guardar el PDF
        doc.save(`orden_de_servicio_${serviceOrder.id}.pdf`);
    };