import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Send, Calendar, Car, User, Phone, MapPin, DollarSign, Edit3 } from 'lucide-react';

const CarWhatsAppMessageModal = ({ booking, daywise = [], onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState('');

  // Calculate fields with safe fallbacks
  const guestName = booking?.["Guest Name"] || daywise[0]?.["Guest Name"] || "Guest";
  const contactNo = booking?.["Contact No"] || daywise[0]?.["Contact No"] || "";
  const pax = booking?.["Pax"] || "N/A";
  
  // Extract car types & total cars
  const carTypesArray = [...new Set(daywise.map(d => d["Car Type"]).filter(Boolean))];
  const carTypeStr = carTypesArray.length > 0 ? carTypesArray.join(' / ') : "Sedan / SUV";
  
  // Total cars
  const maxCars = daywise.reduce((max, d) => Math.max(max, parseInt(d["No of Cars"], 10) || 1), 1);
  
  // Financials
  const totalAmount = booking?.["Total Sales"] || booking?.["Billing Amt"] || "0";
  const advanceAmount = booking?.["Advance Recieved"] || "5000";
  const dueCollection = booking?.["Due Collection"] || "Guest Collection";

  // Build the standardized WhatsApp message format with Guest Name
  const generateMessage = () => {
    let lines = [];
    lines.push(`*CONFIRMED CAR BOOKING*`);
    lines.push(`*Guest Name-* ${guestName}`);
    lines.push(``);

    if (daywise && daywise.length > 0) {
      daywise.forEach(day => {
        const date = day["Start Date"] || "";
        const from = day["From"] || "";
        const to = day["To"] || "";
        const itinerary = day["Itinerary"] || "";
        
        if (from && to && from.toLowerCase() !== to.toLowerCase()) {
          lines.push(`*${date} – ${from} ➔ ${to}:* ${itinerary}`);
        } else if (from) {
          lines.push(`*${date} – ${from} Sightseeing:* ${itinerary}`);
        } else {
          lines.push(`*${date}:* ${itinerary}`);
        }
        lines.push(``);
      });
    } else {
      lines.push(`*${booking?.["Start Date"] || "Start Date"} ➔ ${booking?.["End Date"] || "End Date"}:* Complete Tour Package as discussed.`);
      lines.push(``);
    }

    lines.push(`*Pax-* ${pax}`);
    lines.push(`*Cars-* ${maxCars}`);
    lines.push(`*Car Type-* ${carTypeStr}`);
    lines.push(`*Total Amount-* ${totalAmount}/-`);
    lines.push(`*FusionStays Advance-* ${advanceAmount}/-`);
    lines.push(`*Balance-* ${dueCollection}`);

    return lines.join('\n');
  };

  useEffect(() => {
    setCustomText(generateMessage());
  }, [booking, daywise]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppSend = () => {
    const cleanPhone = contactNo.replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
    const encoded = encodeURIComponent(customText);
    const url = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">WhatsApp Booking Confirmation</h3>
              <p className="text-xs text-emerald-100">
                Booking: <span className="font-mono font-semibold">{booking?.["Booking ID"] || "N/A"}</span> • {guestName} ({contactNo || "No Contact"})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Toolbar */}
        <div className="px-6 py-3 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium text-emerald-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-formatted from Daywise Itinerary & Financial Slabs
          </span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? "View Standard" : "Edit Message"}
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {isEditing ? (
            <textarea
              rows={14}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-inner custom-scrollbar"
            />
          ) : (
            <div className="bg-[#0b141a] text-slate-100 p-5 rounded-2xl shadow-lg border border-slate-800 relative font-sans text-sm leading-relaxed">
              <div className="bg-[#005c4b] p-4 rounded-xl text-[#e9edef] whitespace-pre-wrap selection:bg-emerald-700 shadow-sm border border-emerald-800/40">
                {customText}
              </div>
              <div className="text-[10px] text-slate-400 mt-2 text-right">
                FusionStays Format • Ready for WhatsApp Web & App
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Text"}
            </button>

            <button
              onClick={handleWhatsAppSend}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
              Send on WhatsApp
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CarWhatsAppMessageModal;
