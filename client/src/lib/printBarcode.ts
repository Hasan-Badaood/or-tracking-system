import JsBarcode from 'jsbarcode';
import { Visit } from '@/api/visits';

export const printBarcode = (visit: Visit): void => {
  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;

  const svgId = 'barcode-svg';
  const patientName = `${visit.patient.first_name} ${visit.patient.last_name}`;
  const arrivalDate = new Date(visit.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Patient Barcode - ${visit.visit_tracking_id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 16px; width: 350px; }
        .header { text-align: center; font-size: 11px; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 10px; }
        .patient-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .details { font-size: 11px; color: #333; margin-bottom: 10px; }
        .barcode-wrap { text-align: center; }
        svg { max-width: 100%; }
        @media print { @page { margin: 0; size: 90mm 60mm; } }
      </style>
    </head>
    <body>
      <div class="header">OR Patient Tracking System</div>
      <div class="patient-name">${patientName}</div>
      <div class="details">
        MRN: ${visit.patient.mrn} &nbsp;|&nbsp; Date: ${arrivalDate}
      </div>
      <div class="barcode-wrap">
        <svg id="${svgId}"></svg>
      </div>
    </body>
    </html>
  `);
  win.document.close();

  win.onload = () => {
    const svg = win.document.getElementById(svgId);
    if (svg) {
      JsBarcode(svg, visit.visit_tracking_id, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
      });
    }
    setTimeout(() => {
      win.print();
      win.close();
    }, 200);
  };
};
