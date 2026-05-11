import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const printTable = (title: string, columns: string[], data: any[][]) => {
  const printDiv = document.createElement('div');
  printDiv.id = 'print-area';
  
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      @page { margin: 0; }
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area { position: absolute; left: 0; top: 0; width: 100%; }
    }
    #print-area {
      font-family: sans-serif;
      padding: 20px;
      background: white;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100vh;
      z-index: 999999;
    }
    h1 { text-align: center; color: #333; text-transform: uppercase; font-size: 24px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; text-transform: uppercase; font-size: 12px; }
    td { font-size: 14px; }
  `;

  document.head.appendChild(style);

  // Create Image
  const img = new Image();
  img.src = "https://raw.githubusercontent.com/tanglaorichmondcswd-svg/MABALACAT-CITY-LOGO/787904c28a569b18cc4e23d3f6f16d7aaa024907/2025%20%20letter%20head.png";
  img.referrerPolicy = "no-referrer";
  img.style.width = "100%";
  img.style.marginBottom = "20px";
  printDiv.appendChild(img);

  const container = document.createElement('div');
  container.innerHTML = `
    <h1>${title}</h1>
    <table>
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell !== null && cell !== undefined ? cell : ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  printDiv.appendChild(container);

  document.body.appendChild(printDiv);

  // Trigger print after image load
  const startPrint = () => {
    window.print();
    setTimeout(() => {
      document.body.removeChild(printDiv);
      document.head.removeChild(style);
    }, 1000);
  };

  if (img.complete) {
    startPrint();
  } else {
    img.onload = startPrint;
    img.onerror = startPrint;
  }
};
