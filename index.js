const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');

// Ruta a la carpeta con los archivos PDF
const folderPath = '/home/nahuelc/Downloads/Facturas';

async function extractTextFromPDF(pdfPath) {
  try {
    const loadingTask = pdfjsLib.getDocument({
        url: pdfPath,
        useSystemFonts: true
      });
    const pdfDocument = await loadingTask.promise;

    const textContent = await pdfDocument.getPage(1).then(page => page.getTextContent()); // Obtener el contenido solo de la primera página.
    const text = textContent.items.map(item => item.str).join(' ');

    return text;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    return null;
  }
}

function findPositionsAndExtractText(array, validator1, validator2) {
    const indexValidator1 = array.findIndex((word) => typeof validator1 === 'string' ? word === validator1 : validator1.test(word));
    
    if (indexValidator1 !== -1) {
      const indexValidator2 = array.findIndex((word, index) => {
        return (typeof validator2 === 'string' ? word === validator2 : validator2.test(word)) && index > indexValidator1;
      });
      
      if (indexValidator2 !== -1) {
        const text = array.slice(indexValidator1 + 1, indexValidator2).join(' ');
        return {
          indexValidator1,
          indexValidator2,
          text
        };
      }
    }
    
    return null;
  }
  

function findFirstMatchIndex(array, regex) {
    return array.findIndex(item => regex.test(item));
  }

fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error('Error al leer la carpeta:', err);
    return;
  }
  
  files.forEach(file => {
    if (path.extname(file).toLowerCase() === '.pdf') {
      const pdfPath = path.join(folderPath, file);
      
      extractTextFromPDF(pdfPath)
            .then(extractedText => {
                // Separar las palabras por espacios y eliminar espacios vacíos
                const words = extractedText.split(/\s+/).filter(word => word.length > 0);

                // Regex utilizadas
                const fechaRegex = /\d{2}\/\d{2}\/\d{4}/;
                const salePointRegex = /\b\d{5}\b/;
                const invoiceTypeRegex = /COD\./;
                const receiverCUITRegex = /Producto/;
                const subtotalRegex = /Subtotal\:/;
                const caeRegex = /\b\d{14}\b/;
                
                // Búsqueda de índices
                const indexFirstDate = findFirstMatchIndex(words, fechaRegex);
                const salePointIndex = findFirstMatchIndex(words, salePointRegex);
                const invoiceTypeIndex = findFirstMatchIndex(words, invoiceTypeRegex);
                const receiverCUITIndex = findFirstMatchIndex(words, receiverCUITRegex);
                const subtotalIndex = findFirstMatchIndex(words, subtotalRegex);
                const caeIndex = findFirstMatchIndex(words, caeRegex);
                
                if (indexFirstDate === -1) {
                console.log('No se encontraron fechas en el array.');
                }
                //console.log(JSON.stringify(words, null, 2));

                const condicionIVAReceptor = findPositionsAndExtractText(words, 'Monotributo', /^0$/);
                const description = findPositionsAndExtractText(words, 'Subtotal', /^1,00$/);

                // Impresión de resultados:
                console.log('Archivo:', file);
                console.log('Fecha desde:\t\t', words[indexFirstDate]);
                console.log('Fecha hasta:\t\t', words[indexFirstDate+1]);
                console.log('Fecha emisión:\t\t', words[indexFirstDate+2]);
                console.log('CUIT Emisor:\t\t', words[indexFirstDate+3]);
                console.log('Punto de venta:\t\t', words[salePointIndex]);
                console.log('Factura:\t\t', words[salePointIndex+1]);
                console.log('Tipo de factura:\t', words[invoiceTypeIndex+1]);
                console.log('CUIT Receptor:\t\t', words[receiverCUITIndex-2]);
                if (condicionIVAReceptor) {
                    console.log('Condición IVA Receptor:\t', condicionIVAReceptor.text);
                } else {
                    console.log('No se encontraron los delimitadores.');
                }
                if (description) {
                    console.log('Descripción:\t\t', description.text);
                } else {
                    console.log('No se encontraron los delimitadores.');
                }
                console.log('Total facturado:\t', words[subtotalIndex-1]);
                console.log('CAE:\t\t\t', words[caeIndex]);
                console.log('---');
            })
            .catch(error => {
                console.error('Error procesando el archivo', file, ':', error);
            });
    }
  });
});

