import React, { useRef, useState } from 'react';
import { X, Printer, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

const CarQuotationPDFModal = ({ booking, daywise = [], onClose }) => {
  const printRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract variables
  const guestName = booking?.["Guest Name"] || daywise[0]?.["Guest Name"] || "Guest";
  const contactNo = booking?.["Contact No"] || daywise[0]?.["Contact No"] || "";
  const pickupPoint = booking?.["Start City"] || daywise[0]?.["From"] || "NJP";
  const dropPoint = daywise[daywise.length - 1]?.["To"] || "NJP";
  const pickupDate = booking?.["Start Date"] || daywise[0]?.["Start Date"] || "21st October";
  
  // Extract car types & counts
  const carTypesArray = [...new Set(daywise.map(d => d["Car Type"]).filter(Boolean))];
  const carType = carTypesArray.length > 0 ? carTypesArray.join(', ') : "WagonR";
  const numberOfCars = daywise.reduce((max, d) => Math.max(max, parseInt(d["No of Cars"], 10) || 1), 1);
  
  const paxStr = booking?.["Pax"] || "3";
  // Parse adults, children, infants from Pax (e.g. "3+2" or "4")
  let adults = paxStr;
  let children = "0";
  let infants = "0";
  if (paxStr.includes('+')) {
    const parts = paxStr.split('+');
    adults = parts[0] || "1";
    children = parts[1] || "0";
    if (parts[2]) infants = parts[2];
  }

  const totalAmount = booking?.["Total Sales"] || booking?.["Billing Amt"] || "16000";
  const advanceAmount = booking?.["Advance Recieved"] || "5000";

  // Current formatted quotation date
  const quotationDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const printableEl = printRef.current;
    if (!printableEl) return;

    setIsGenerating(true);

    // Create an isolated hidden iframe for clean multi-page document pagination
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

    // Set doc title so browser suggests this as the default filename when "Save as PDF" is selected
    const safeGuestName = (guestName || 'Guest').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bookingId = booking?.["Booking ID"] || booking?.["Vendorwise ID"] || "Quotation";
    const filename = `Car_Quotation_${safeGuestName}_${bookingId}`;

    // Collect stylesheets from parent head, EXCLUDING any print override styles that hide the body
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .filter(el => {
        if (el.id === 'modal-main-print-override') return false;
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
            margin: 10mm 15mm;
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
            color: #1e293b !important;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }
          #quotation-printable {
            visibility: visible !important;
            display: block !important;
            width: 100% !important;
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          #quotation-printable * {
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
            padding-top: 10px !important;
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
        <div id="quotation-printable">
          ${printableEl.innerHTML}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Ensure all images are loaded inside the iframe before triggering print dialog
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
    <div className="pdf-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      
      {/* Print stylesheet override for multipage printing fallback */}
      <style id="modal-main-print-override">{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
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

          /* Reset all modal containers so pagination is not clamped or truncated */
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

          #quotation-printable, #quotation-printable * {
            visibility: visible;
          }

          #quotation-printable {
            position: static !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            color: #1e293b !important;
            box-shadow: none !important;
            border-radius: 0 !important;
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
            padding-top: 15px !important;
          }

          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="pdf-modal-dialog bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/20 text-brand-400 rounded-xl">
              <Printer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Car Booking Quotation PDF</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  All 2 Pages
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {guestName} • Booking ID: {booking?.["Booking ID"] || booking?.["Vendorwise ID"] || "N/A"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download all pages as PDF by selecting 'Save as PDF' in the destination dropdown"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download / Save PDF (All Pages)
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
        <div className="pdf-modal-content p-6 md:p-10 overflow-y-auto flex-1 bg-slate-200/80 custom-scrollbar flex flex-col items-center">
          
          {/* Download helper banner */}
          <div className="mb-4 bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-3 no-print max-w-[800px] w-full shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <span>
                <strong>Multi-Page PDF Ready:</strong> Both Page 1 (Booking & Itinerary) and Page 2 (Terms, Inclusions & Policies) will be included when saving.
              </span>
            </div>
            <span className="text-[11px] text-amber-800 bg-amber-200/60 font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">
              2 Pages
            </span>
          </div>

          <div 
            id="quotation-printable" 
            ref={printRef}
            className="w-full max-w-[800px] bg-white shadow-xl rounded-xl p-8 md:p-12 text-slate-800 font-sans space-y-8"
          >
            
            {/* ====== PAGE 1 ====== */}
            <div className="print-page">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  {/* Official FusionStays Brand Logo Image */}
                  <img
                    src="/fusionstays-logo.png"
                    alt="FusionStays Logo"
                    className="h-12 w-auto object-contain max-w-[200px]"
                  />
                </div>

                <div className="text-right">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    CAR BOOKING QUOTATION
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Date: <span className="font-semibold text-slate-700">{quotationDate}</span>
                  </p>
                </div>
              </div>

              {/* Dear Guest Message */}
              <div className="mt-6 space-y-1">
                <p className="text-sm font-semibold text-slate-800">Dear {guestName},</p>
                <p className="text-xs text-slate-600">
                  Thank you for choosing FusionStays. Please find below the details of your car booking quotation.
                </p>
              </div>

              {/* Quotation Validity Banner */}
              <div className="mt-5 p-3 rounded-lg bg-amber-500 text-white flex items-center justify-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-200 flex-shrink-0" />
                <span className="text-xs font-bold text-center">
                  Quotation Validity: Valid for 48 hours from the time of issuance. Prices and availability are subject to change thereafter.
                </span>
              </div>

              {/* Booking Details Section */}
              <div className="mt-8 avoid-break">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 pb-1.5 border-b-2 border-amber-600">
                  BOOKING DETAILS
                </h3>

                <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Pickup Point</div>
                    <div className="p-2.5 font-medium text-slate-800">{pickupPoint}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Drop Point</div>
                    <div className="p-2.5 font-medium text-slate-800">{dropPoint}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Pickup Date</div>
                    <div className="p-2.5 font-medium text-slate-800">{pickupDate}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Car Type</div>
                    <div className="p-2.5 font-medium text-slate-800">{carType}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Number of Cars</div>
                    <div className="p-2.5 font-medium text-slate-800">{numberOfCars}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Adults</div>
                    <div className="p-2.5 font-medium text-slate-800">{adults}</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300">
                    <div className="p-2.5 bg-slate-50 font-bold text-slate-900">Children / Infants</div>
                    <div className="p-2.5 font-medium text-slate-800">{children} / {infants}</div>
                  </div>
                </div>

                {/* Amount Highlight Row */}
                <div className="mt-4 grid grid-cols-2 border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <div className="p-3 bg-slate-100 font-bold text-slate-900 flex justify-between items-center border-r border-slate-300">
                    <span>Total Amount</span>
                    <span className="text-amber-700 font-black text-sm">₹{totalAmount}/-</span>
                  </div>
                  <div className="p-3 bg-amber-50 font-bold text-slate-900 flex justify-between items-center">
                    <span>Advance Amount</span>
                    <span className="text-amber-700 font-black text-sm">₹{advanceAmount}/-</span>
                  </div>
                </div>
              </div>

              {/* Itinerary Section */}
              <div className="mt-8">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 pb-1.5 border-b-2 border-amber-600">
                  ITINERARY
                </h3>

                <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                  {daywise && daywise.length > 0 ? (
                    daywise.map((day, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          {day["Start Date"] || `Day ${idx + 1}`} –
                        </span>
                        <span>
                          {day["From"] && day["To"] ? `${day["From"]} to ${day["To"]}: ` : ''}
                          {day["Itinerary"]}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-lg italic text-slate-500">
                      Standard point-to-point transfers and local sightseeing included as per booking schedule.
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="mt-8 avoid-break">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  ADDITIONAL NOTES
                </h3>
                <div className="mt-2 text-[11px] text-slate-600 font-medium space-y-1">
                  <p>• Note: Permit, parking, Toll taxes, and any entry fees are not included.</p>
                  <p>• In case there is car scarcity due to festive peak/Dusshera, additional charges up to Rs.4000 can be charged for that specific day.</p>
                </div>
              </div>
            </div>

            {/* ====== PAGE 2 ====== */}
            <div className="page-break pt-8 border-t-2 border-dashed border-slate-200 mt-12 print-page">
              
              {/* Header Repeat with Logo */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/fusionstays-logo.png"
                    alt="FusionStays Logo"
                    className="h-10 w-auto object-contain max-w-[160px]"
                  />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Terms & Policy</span>
              </div>

              {/* General Terms & Conditions */}
              <div className="avoid-break">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 pb-1.5 border-b-2 border-amber-600">
                  GENERAL TERMS & CONDITIONS
                </h3>
                <ul className="mt-4 space-y-2 text-xs text-slate-700 list-disc list-inside leading-relaxed">
                  <li>The vehicle will be provided strictly on a point-to-point basis. Any additional services not mentioned in the itinerary will be charged separately.</li>
                  <li>Schedules and itineraries may be subjected to last-minute changes due to circumstances beyond our control, including but not limited to local strikes, natural calamities, road closures, or government restrictions.</li>
                  <li>In the event of roadblocks or route diversions, the vehicle may take an alternative route. Any additional expenses incurred due to such diversions shall be borne by the guest and paid directly on-site.</li>
                  <li>Air conditioning may not function effectively or may be switched off while driving in hilly regions, depending on road and vehicle conditions.</li>
                  <li>In case of delayed arrival, any missed sightseeing for that day will not be the responsibility of FusionStays. If the same sightseeing is to be covered on a subsequent day, additional charges may apply.</li>
                  <li>Any change in PAX will not result in any change in the vehicle type or the confirmed rates.</li>
                </ul>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 avoid-break">
                
                {/* Package Inclusions */}
                <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 pb-2 border-b border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    PACKAGE INCLUSIONS
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Vehicle service on a point-to-point basis as per the confirmed itinerary.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>Driver accommodation and meals.</span>
                    </li>
                  </ul>
                </div>

                {/* Package Exclusions */}
                <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/40">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5 pb-2 border-b border-rose-200">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    PACKAGE EXCLUSIONS
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Airfare, train fare, or any transportation not specifically mentioned.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Medical expenses, rescue, evacuation, or emergency assistance.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Entry fees, permits, travel insurance, and sightseeing charges unless stated.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Toll taxes, parking, state taxes, and en-route charges unless included.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>Additional expenses from political unrest, natural calamities, vehicle breakdowns, or unforeseen events.</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* Payment Policy — Advance Payment */}
              <div className="mt-8 avoid-break">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 pb-1.5 border-b-2 border-amber-600">
                  PAYMENT POLICY — ADVANCE PAYMENT
                </h3>

                <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-2 divide-x divide-slate-300 bg-slate-900 text-white font-bold p-2.5">
                    <div>Booking Value</div>
                    <div>Required Advance</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 p-2.5 bg-white">
                    <div className="font-semibold text-slate-800">Below ₹5,000</div>
                    <div className="text-slate-700">50% of booking value or ₹2,500 (whichever is higher)</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 p-2.5 bg-slate-50">
                    <div className="font-semibold text-slate-800">₹5,000 – ₹20,000</div>
                    <div className="text-slate-700">25% of booking value or ₹5,000 (whichever is higher)</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 p-2.5 bg-white">
                    <div className="font-semibold text-slate-800">Above ₹20,000</div>
                    <div className="text-slate-700">40% of booking value or ₹5,000 (whichever is higher)</div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CarQuotationPDFModal;
