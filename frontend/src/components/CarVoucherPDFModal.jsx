import React, { useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';

const CarVoucherPDFModal = ({ booking, daywise = [], onClose }) => {
  const printRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract variables
  const guestName = booking?.["Guest Name"] || daywise[0]?.["Guest Name"] || "Guest";
  const contactNo = booking?.["Contact No"] || daywise[0]?.["Contact No"] || "";
  const reservationId = booking?.["Booking ID"] || booking?.["Vendorwise ID"] || "CAR-SEP-1220";
  
  // Dates
  const startDate = booking?.["Start Date"] || daywise[0]?.["Start Date"] || "17-October-2026";
  const endDate = booking?.["End Date"] || daywise[daywise.length - 1]?.["Start Date"] || daywise[daywise.length - 1]?.["Date"] || "24-October-2026";
  
  // Reservation creation / voucher date
  const now = new Date();
  const formattedToday = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const voucherDate = booking?.["Date"] || formattedToday;

  // Car Type & Pax
  const carTypesArray = [...new Set(daywise.map(d => d["Car Type"]).filter(Boolean))];
  const carType = carTypesArray.length > 0 ? carTypesArray.join(', ') : (booking?.["Car Type"] || "WagonR");
  const persons = booking?.["Pax"] || "3";

  // Financial calculations
  const netTotalRaw = parseFloat(booking?.["Total Sales"] || booking?.["Billing Amt"] || 37000) || 0;
  const netTotal = Math.round(netTotalRaw);

  let billingAmt = booking?.["Billing Amt"] ? Math.round(parseFloat(booking["Billing Amt"])) : Math.round(netTotal / 1.05);
  let gstAmt = booking?.["GST amt"] ? Math.round(parseFloat(booking["GST amt"])) : (netTotal - billingAmt);
  const advanceAmt = booking?.["Advance Recieved"] ? Math.round(parseFloat(booking["Advance Recieved"])) : 0;
  const dueAmt = Math.max(0, netTotal - advanceAmt);

  const handlePrint = () => {
    const printableEl = printRef.current;
    if (!printableEl) return;

    setIsGenerating(true);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setIsGenerating(false);
      window.print();
      return;
    }

    const safeGuestName = (guestName || 'Guest').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = (reservationId || 'Voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Car_Voucher_${safeGuestName}_${safeId}`;

    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .filter(el => {
        if (el.id === 'modal-main-print-override' || el.id === 'voucher-main-print-override') return false;
        if (el.tagName === 'STYLE' && el.innerHTML.includes('visibility: hidden')) return false;
        return true;
      })
      .map(node => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${filename}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            visibility: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }
          #voucher-printable {
            visibility: visible !important;
            display: block !important;
            width: 100% !important;
            max-width: 820px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          #voucher-printable * {
            visibility: visible !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            width: 100% !important;
            clear: both !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            border-top: none !important;
            margin-top: 0 !important;
            padding-top: 5px !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="voucher-printable">
          ${printableEl.innerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    const images = Array.from(doc.images);
    const imageLoadPromises = images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    const fontsPromise = iframe.contentWindow?.document?.fonts?.ready || Promise.resolve();

    Promise.all([...imageLoadPromises, fontsPromise]).then(() => {
      setTimeout(() => {
        setIsGenerating(false);
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("Iframe print invocation error:", err);
          window.print();
        } finally {
          setTimeout(() => {
            try {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            } catch (e) {}
          }, 4000);
        }
      }, 350);
    });
  };

  return (
    <div className="pdf-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      
      {/* Print stylesheet override */}
      <style id="voucher-main-print-override">{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm;
          }

          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden;
          }

          .no-print {
            display: none !important;
          }

          .pdf-modal-backdrop,
          .pdf-modal-dialog,
          .pdf-modal-content {
            visibility: visible !important;
            position: static !important;
            display: block !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: white !important;
            box-shadow: none !important;
            inset: auto !important;
            backdrop-filter: none !important;
          }

          #voucher-printable, #voucher-printable * {
            visibility: visible;
          }

          #voucher-printable {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }

          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            width: 100% !important;
            clear: both !important;
          }

          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            border-top: none !important;
            margin-top: 0 !important;
            padding-top: 5px !important;
          }

          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="pdf-modal-dialog bg-slate-100 w-full max-w-4xl rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
              <Printer className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">Car Booking Voucher & Final Bill</h3>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Official Voucher
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {guestName} • Res ID: {reservationId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download or print multi-page voucher as PDF"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download / Save PDF (All Pages)</span>
                  <span className="sm:hidden">Download PDF</span>
                </>
              )}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="pdf-modal-content p-2 sm:p-6 md:p-10 overflow-y-auto overflow-x-auto flex-1 bg-slate-200/80 custom-scrollbar flex flex-col items-center w-full">
          
          {/* Download helper banner */}
          <div className="mb-4 bg-rose-50 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 text-xs text-rose-900 flex items-center justify-between gap-2 sm:gap-3 no-print max-w-[800px] w-full shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base">🎫</span>
              <span className="text-[11px] sm:text-xs">
                <strong>2-Page Booking Voucher Ready:</strong> Page 1 (Booking & Billing) & Page 2 (Terms & Refund Policy).
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-rose-800 bg-rose-200/60 font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap">
              2 Pages
            </span>
          </div>

          <div 
            id="voucher-printable" 
            ref={printRef}
            className="w-full max-w-[800px] min-w-[320px] sm:min-w-0 bg-white shadow-xl rounded-none p-4 sm:p-8 md:p-12 text-slate-900 font-sans"
          >
            
            {/* ====== PAGE 1 ====== */}
            <div className="print-page pb-4">
              
              {/* Header Box (Logo on left, Reservation ID & Date on right) */}
              <div className="border border-slate-300 rounded-none flex items-stretch">
                <div className="w-1/2 p-3.5 flex items-center">
                  <img
                    src="/fusionstays-logo.png"
                    alt="FusionStays"
                    className="h-10 w-auto object-contain max-w-[190px]"
                  />
                </div>
                <div className="w-1/2 border-l border-slate-300 p-3.5 flex flex-col justify-center items-end text-right">
                  <div className="text-xs font-semibold text-slate-700">
                    Reservation ID
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {reservationId}
                  </div>
                  <div className="text-xs text-slate-700 mt-1 font-medium">
                    Date- <span className="font-semibold text-slate-900">{voucherDate}</span>
                  </div>
                </div>
              </div>

              {/* Contact Line */}
              <div className="text-center text-[11px] text-slate-800 font-medium my-2">
                FusionStays Contact No : 9330254852 / 9163334396 / 9874148277
              </div>

              {/* Booking Details */}
              <div className="mt-4">
                <h3 className="text-center font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5">
                  Booking Details
                </h3>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700 w-1/4">Guest Name</td>
                      <td className="border-r border-slate-300 p-1.5 font-semibold text-slate-900 w-1/4">{guestName}</td>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700 w-1/4">Start Date</td>
                      <td className="p-1.5 font-medium text-slate-900 w-1/4">{startDate}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700">Contact Number</td>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-900">{contactNo || "N/A"}</td>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700">End Date</td>
                      <td className="p-1.5 font-medium text-slate-900">{endDate}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700">Persons</td>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-900">{persons}</td>
                      <td className="border-r border-slate-300 p-1.5 font-medium text-slate-700">Car Type</td>
                      <td className="p-1.5 font-medium text-slate-900">{carType}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Itinerary Details */}
              <div className="mt-5">
                <h3 className="text-center font-bold text-xs uppercase tracking-wider text-slate-900 mb-1.5">
                  Itinerary Details
                </h3>

                <div className="border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 space-y-2">
                  {daywise && daywise.length > 0 ? (
                    daywise.map((day, idx) => {
                      const dateStr = day["Start Date"] || `Day ${idx + 1}`;
                      const route = (day["From"] && day["To"]) ? `${day["From"]} to ${day["To"]}` : '';
                      const itin = day["Itinerary"] ? `${route ? ': ' : ''}${day["Itinerary"]}` : '';
                      const fullDesc = `${route}${itin}`.trim() || 'Point to point transfer / Sightseeing';

                      return (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-bold whitespace-nowrap">{dateStr} –</span>
                          <span>{fullDesc} |</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="italic text-slate-500 py-1">
                      Standard itinerary as confirmed in reservation schedule.
                    </div>
                  )}

                  <div className="pt-2 font-bold text-slate-900">
                    Note: Permit, parking, Toll taxes, and any entry fees are not included.
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown Table (aligned to right) */}
              <div className="flex justify-end mt-4">
                <table className="border-collapse border border-slate-300 text-xs w-48">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 text-center font-medium bg-slate-50 text-slate-700">
                        Grand Total
                      </td>
                      <td className="p-1.5 text-right font-medium text-slate-900">
                        {billingAmt}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 text-center font-medium bg-slate-50 text-slate-700">
                        GST (5%)
                      </td>
                      <td className="p-1.5 text-right font-medium text-slate-900">
                        {gstAmt}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50 text-slate-900">
                        Net Total
                      </td>
                      <td className="p-1.5 text-right font-bold text-slate-900">
                        {netTotal}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-1.5 text-center font-medium bg-slate-50 text-slate-700">
                        Advance
                      </td>
                      <td className="p-1.5 text-right font-medium text-slate-900">
                        {advanceAmt}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50 text-slate-900">
                        Due
                      </td>
                      <td className="p-1.5 text-right font-black text-slate-900 text-sm">
                        {dueAmt}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Horizontal Red Rule */}
              <div className="border-b-2 border-red-500 my-5"></div>

              {/* General Terms & Conditions - Page 1 points */}
              <div className="avoid-break">
                <h3 className="text-center font-bold text-xs uppercase tracking-wider text-slate-900 mb-2">
                  General Terms & Conditions
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-800 list-disc list-outside ml-4 leading-relaxed">
                  <li>
                    The vehicle will be provided strictly on a point-to-point basis. Any additional services not mentioned in the itinerary will be charged separately.
                  </li>
                  <li>
                    Schedules and itineraries may be subjected to last-minute changes due to circumstances beyond our control, including but not limited to local strikes, natural calamities, road closures, or government restrictions.
                  </li>
                </ul>
              </div>

            </div>

            {/* ====== PAGE 2 ====== */}
            <div className="page-break pt-6 border-t border-dashed border-slate-300 print-page">
              
              {/* General Terms & Conditions - Page 2 continuation */}
              <div className="avoid-break">
                <ul className="space-y-2 text-xs text-slate-800 list-disc list-outside ml-4 leading-relaxed">
                  <li>
                    In the event of roadblocks or route diversions, the vehicle may take an alternative route. Any additional expenses incurred due to such diversions shall be borne by the guest and paid directly on-site.
                  </li>
                  <li>
                    Air conditioning may not function effectively or may be switched off while driving in hilly regions, depending on road and vehicle conditions.
                  </li>
                  <li>
                    In case of delayed arrival, any missed sightseeing for that day will not be the responsibility of FusionStays. If the same sightseeing is to be covered on a subsequent day, additional charges may apply.
                  </li>
                  <li>
                    Any change in PAX will not result in any change in the vehicle type or the confirmed rates.
                  </li>
                  <li>
                    Car Vendor details will be shared before 1 day from Pick Up Date.
                  </li>
                  <li>
                    Due payment will be paid on the day of Pickup.
                  </li>
                  <li>
                    Parking and permit charges, if applicable, are at extra cost.
                  </li>
                </ul>
              </div>

              {/* Inclusions & Exclusions Box Table */}
              <div className="mt-6 avoid-break">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr>
                      <th className="border-r border-b border-slate-300 p-2 text-left font-bold text-slate-900 bg-emerald-50/60 w-1/2">
                        ✓ PACKAGE INCLUSIONS
                      </th>
                      <th className="border-b border-slate-300 p-2 text-left font-bold text-slate-900 bg-rose-50/60 w-1/2">
                        ✕ PACKAGE EXCLUSIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-slate-300 p-3 align-top leading-relaxed text-slate-800">
                        <p className="mb-2">Vehicle service on a point-to-point basis as per the confirmed itinerary.</p>
                        <p>Driver accommodation and meals.</p>
                      </td>
                      <td className="p-3 align-top leading-relaxed text-slate-800 space-y-1.5">
                        <p>Airfare, train fare, or any transportation not specifically mentioned.</p>
                        <p>Medical expenses, rescue, evacuation, or emergency assistance.</p>
                        <p>Entry fees, permits, travel insurance, and sightseeing charges unless stated.</p>
                        <p>Toll taxes, parking, state taxes, and en-route charges unless included.</p>
                        <p>Additional expenses from political unrest, natural calamities, vehicle breakdowns, or unforeseen events.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cancellation & Refund Policy Table */}
              <div className="mt-6 avoid-break">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border-r border-b border-slate-300 p-2 text-left font-bold text-slate-900 w-1/2">
                        Cancellation Timeline
                      </th>
                      <th className="border-b border-slate-300 p-2 text-left font-bold text-slate-900 w-1/2">
                        Refund Applicable
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-2 font-medium text-slate-800">
                        More than 30 days before check-in
                      </td>
                      <td className="p-2 font-medium text-slate-800">
                        100% refund
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-2 font-medium text-slate-800">
                        15 – 30 days before check-in
                      </td>
                      <td className="p-2 font-medium text-slate-800">
                        50% refund
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-2 font-medium text-slate-800">
                        7 – 15 days before check-in
                      </td>
                      <td className="p-2 font-medium text-slate-800">
                        25% refund
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r border-slate-300 p-2 font-medium text-slate-800">
                        Less than 7 days before check-in
                      </td>
                      <td className="p-2 font-bold text-rose-600">
                        No refund
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="mt-2 text-[11px] italic text-slate-600 leading-snug">
                  Note: For payments made via payment gateway, applicable gateway charges (currently 2%) will be deducted additionally from any refundable amount.
                </p>
              </div>

              {/* Red Horizontal Rule */}
              <div className="border-b-2 border-red-500 mt-6 mb-3"></div>

              {/* GSTN */}
              <div className="text-xs font-bold text-slate-900">
                GSTN : 19AADCF8613N1Z5
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CarVoucherPDFModal;
