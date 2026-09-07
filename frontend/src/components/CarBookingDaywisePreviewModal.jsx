import React, { useState } from 'react';
import { X, Calendar, MapPin, Car, Building2, User, Phone, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CarBookingDaywisePreviewModal = ({ booking, daywise = [], onClose }) => {
  const navigate = useNavigate();

  const bookingId = booking?.["Booking ID"] || booking?.["Vendorwise ID"] || "N/A";
  const guestName = booking?.["Guest Name"] || daywise[0]?.["Guest Name"] || "Guest";
  const contactNo = booking?.["Contact No"] || daywise[0]?.["Contact No"] || "";
  const startCity = booking?.["Start City"] || daywise[0]?.["From"] || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Daywise Itinerary Preview</h3>
                <span className="bg-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                  {bookingId}
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                {guestName} • {contactNo || "No phone"} {startCity && `• Base: ${startCity}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate(`/car-packages/daywise?bookingId=${encodeURIComponent(bookingId)}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all"
              title="Open and edit on Daywise Page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Edit on Daywise Page</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-teal-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader info bar */}
        <div className="px-6 py-2.5 bg-teal-50 border-b border-teal-100 flex items-center justify-between text-xs text-teal-800">
          <span className="font-semibold">
            Showing {daywise.length} itinerary {daywise.length === 1 ? 'day' : 'days'}
          </span>
          <span className="text-[11px] text-slate-500 italic">
            To edit daywise routes or vehicles, use the Daywise Operations page.
          </span>
        </div>

        {/* Body List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50 custom-scrollbar">
          {daywise.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">No daywise itinerary rows recorded</p>
              <p className="text-xs text-slate-400 mt-1">This booking only has master records logged so far.</p>
            </div>
          ) : (
            daywise.map((day, idx) => (
              <div 
                key={idx} 
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-300 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-black text-xs">
                      Day {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {day["Start Date"] || "Date Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {day["Car Type"] && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md flex items-center gap-1">
                        <Car className="w-3 h-3 text-slate-500" />
                        {day["Car Type"]} ({day["No of Cars"] || 1})
                      </span>
                    )}
                    {day["Vendor"] && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded-md flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {day["Vendor"]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Route Pill */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>{day["From"] || "Start"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{day["To"] || "Destination"}</span>
                  </div>
                </div>

                {/* Itinerary Description */}
                {day["Itinerary"] && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-100">
                    <span className="font-bold text-slate-900 mr-1">Plan:</span>
                    {day["Itinerary"]}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            FusionStays Itinerary Viewer
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
};

export default CarBookingDaywisePreviewModal;
