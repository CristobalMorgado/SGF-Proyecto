const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const anchor = '// EXPORTACIÓN A EXCEL (HU09)';
const index = js.indexOf(anchor);

if (index !== -1) {
  let newJs = js.substring(0, index + anchor.length);
  
  const newLogic = `
// ========================================

function exportarExcel() {
  if (allMovimientos.length === 0) {
    alert('No hay movimientos para exportar.');
    return;
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtrar movimientos del mes actual
  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (movMes.length === 0) {
    alert('No hay movimientos este mes para exportar.');
    return;
  }

  // Crear la matriz de datos para Excel
  const worksheetData = [
    ["Fecha", "Tipo", "Categoría", "Método", "Concepto", "Monto"]
  ];

  movMes.forEach(m => {
    worksheetData.push([
      formatFecha(m.fecha),
      m.tipo,
      m.categoriaId ? (m.categoriaId.nombre || 'Sin Categoría') : 'Sin Categoría',
      m.metodo,
      m.concepto || '',
      m.monto
    ]);
  });

  // Generar el archivo .xlsx usando SheetJS
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Ajustar el ancho de las columnas para que se vea ordenado
  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 10 }, // Tipo
    { wch: 20 }, // Categoría
    { wch: 15 }, // Método
    { wch: 30 }, // Concepto
    { wch: 12 }  // Monto
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Reporte_Mensual");

  const nombreMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  XLSX.writeFile(wb, \`Reporte_Financiero_\${nombreMeses[currentMonth]}_\${currentYear}.xlsx\`);
}
`;
  
  fs.writeFileSync('public/app.js', newJs + newLogic);
  console.log('App.js fixed');
} else {
  console.log('Anchor not found');
}
