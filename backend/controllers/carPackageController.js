const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const cache = require('../services/cache');
const {
  fetchCarMasterRecords,
  fetchCarDaywiseRecords,
  CAR_MASTER_CACHE_KEY,
  CAR_DAYWISE_CACHE_KEY
} = require('../services/carSheetService');

// Clean helper
const cleanNum = (val) => {
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// GET /api/car-packages/master
router.get('/car-packages/master', requireAuth, async (req, res) => {
  try {
    const {
      search,
      month,
      city,
      page = 1,
      limit = 50,
      paginate = 'true'
    } = req.query;

    let records = cache.get(CAR_MASTER_CACHE_KEY);
    let fromCache = true;

    if (!records) {
      records = await fetchCarMasterRecords();
      cache.set(CAR_MASTER_CACHE_KEY, records, 180); // 3 minutes TTL
      fromCache = false;
    }

    // Build a quick lookup of Daywise Name by Booking ID to enrich master records if Master sheet does not have Name column
    let daywiseRecords = cache.get(CAR_DAYWISE_CACHE_KEY);
    if (!daywiseRecords) {
      daywiseRecords = await fetchCarDaywiseRecords();
      cache.set(CAR_DAYWISE_CACHE_KEY, daywiseRecords, 180);
    }
    const nameByBookingId = {};
    for (const d of daywiseRecords) {
      const bId = (d["Booking ID"] || d["Vendorwise ID"] || "").toLowerCase().trim();
      if (bId && d["Name"] && !nameByBookingId[bId]) {
        nameByBookingId[bId] = d["Name"];
      }
    }

    let filtered = records.map(r => {
      const bId = (r["Booking ID"] || r["Vendorwise ID"] || "").toLowerCase().trim();
      return {
        ...r,
        "Name": r["Name"] || nameByBookingId[bId] || ''
      };
    });

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r["Name"] || "").toLowerCase().includes(q) ||
        (r["Guest Name"] || "").toLowerCase().includes(q) ||
        (r["Booking ID"] || "").toLowerCase().includes(q) ||
        (r["Vendorwise ID"] || "").toLowerCase().includes(q) ||
        (r["Contact No"] || "").toLowerCase().includes(q) ||
        (r["Start City"] || "").toLowerCase().includes(q)
      );
    }

    if (month && month !== 'all') {
      filtered = filtered.filter(r =>
        (r["Booking Month"] || "").toLowerCase() === month.toLowerCase() ||
        (r["Check in Month"] || "").toLowerCase() === month.toLowerCase()
      );
    }

    if (city && city !== 'all') {
      filtered = filtered.filter(r =>
        (r["Start City"] || "").toLowerCase().includes(city.toLowerCase())
      );
    }

    // Calculate aggregated metrics
    const stats = filtered.reduce((acc, row) => {
      acc.totalBookings += 1;
      acc.totalSales += cleanNum(row["Total Sales"]);
      acc.totalPurchaseCost += cleanNum(row["Purchase Cost"]);
      acc.totalProfit += cleanNum(row["Profit"]);
      acc.totalAdvance += cleanNum(row["Advance Recieved"]);
      return acc;
    }, {
      totalBookings: 0,
      totalSales: 0,
      totalPurchaseCost: 0,
      totalProfit: 0,
      totalAdvance: 0
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / Number(limit));
    const offset = (Number(page) - 1) * Number(limit);

    const paginated = paginate === 'false'
      ? filtered
      : filtered.slice(offset, offset + Number(limit));

    res.setHeader('X-Data-Source', fromCache ? 'cache' : 'sheets');
    res.json({
      data: paginated,
      stats,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      },
      source: fromCache ? 'cache' : 'sheets'
    });
  } catch (err) {
    console.error("Failed to fetch car master records:", err);
    res.status(500).json({ message: "Failed to fetch car master records", error: err.message });
  }
});

// GET /api/car-packages/daywise
router.get('/car-packages/daywise', requireAuth, async (req, res) => {
  try {
    const {
      search,
      vendor,
      carType,
      date,
      bookingId,
      name,
      page = 1,
      limit = 50,
      paginate = 'true'
    } = req.query;

    let records = cache.get(CAR_DAYWISE_CACHE_KEY);
    let fromCache = true;

    if (!records) {
      records = await fetchCarDaywiseRecords();
      cache.set(CAR_DAYWISE_CACHE_KEY, records, 180);
      fromCache = false;
    }

    let filtered = [...records];

    if (bookingId) {
      filtered = filtered.filter(r =>
        (r["Booking ID"] || "").toLowerCase() === bookingId.toLowerCase() ||
        (r["Vendorwise ID"] || "").toLowerCase() === bookingId.toLowerCase()
      );
    }

    if (name && name !== 'all') {
      filtered = filtered.filter(r =>
        (r["Name"] || "").toLowerCase() === name.toLowerCase()
      );
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r["Name"] || "").toLowerCase().includes(q) ||
        (r["Guest Name"] || "").toLowerCase().includes(q) ||
        (r["Booking ID"] || "").toLowerCase().includes(q) ||
        (r["Vendorwise ID"] || "").toLowerCase().includes(q) ||
        (r["Contact No"] || "").toLowerCase().includes(q) ||
        (r["From"] || "").toLowerCase().includes(q) ||
        (r["To"] || "").toLowerCase().includes(q) ||
        (r["Itinerary"] || "").toLowerCase().includes(q)
      );
    }

    if (vendor && vendor !== 'all') {
      filtered = filtered.filter(r =>
        (r["Vendor"] || "").toLowerCase().includes(vendor.toLowerCase())
      );
    }

    if (carType && carType !== 'all') {
      filtered = filtered.filter(r =>
        (r["Car Type"] || "").toLowerCase().includes(carType.toLowerCase())
      );
    }

    if (date) {
      // Format ISO (2026-10-15) to month/day parts if needed
      let searchPatterns = [date.toLowerCase()];
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, d] = date.split('-');
        const monthNames = [
          "january", "february", "march", "april", "may", "june",
          "july", "august", "september", "october", "november", "december"
        ];
        const mName = monthNames[parseInt(m, 10) - 1];
        if (mName) {
          searchPatterns.push(`${parseInt(d, 10)}-${mName}-${y}`);
          searchPatterns.push(`${parseInt(d, 10)}-${mName}`);
        }
      }

      filtered = filtered.filter(r => {
        const rowDate = (r["Start Date"] || "").toLowerCase();
        return searchPatterns.some(p => rowDate.includes(p));
      });
    }


    const total = filtered.length;
    const totalPages = Math.ceil(total / Number(limit));
    const offset = (Number(page) - 1) * Number(limit);

    const paginated = paginate === 'false'
      ? filtered
      : filtered.slice(offset, offset + Number(limit));

    // Unique filter options for frontend dropdowns
    const uniqueVendors = [...new Set(records.map(r => r.Vendor).filter(Boolean))];
    const uniqueCarTypes = [...new Set(records.map(r => r["Car Type"]).filter(Boolean))];
    const uniqueNames = [...new Set(records.map(r => r["Name"]).filter(Boolean))];

    res.setHeader('X-Data-Source', fromCache ? 'cache' : 'sheets');
    res.json({
      data: paginated,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      },
      filters: {
        vendors: uniqueVendors,
        carTypes: uniqueCarTypes,
        names: uniqueNames
      },
      source: fromCache ? 'cache' : 'sheets'
    });
  } catch (err) {
    console.error("Failed to fetch car daywise records:", err);
    res.status(500).json({ message: "Failed to fetch daywise records", error: err.message });
  }
});

// GET /api/car-packages/booking/:bookingId
// Returns master info plus all daywise steps for that booking (essential for WhatsApp msg & PDF generation)
router.get('/car-packages/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.bookingId.trim().toLowerCase();

    let masterRecords = cache.get(CAR_MASTER_CACHE_KEY);
    if (!masterRecords) {
      masterRecords = await fetchCarMasterRecords();
      cache.set(CAR_MASTER_CACHE_KEY, masterRecords, 180);
    }

    let daywiseRecords = cache.get(CAR_DAYWISE_CACHE_KEY);
    if (!daywiseRecords) {
      daywiseRecords = await fetchCarDaywiseRecords();
      cache.set(CAR_DAYWISE_CACHE_KEY, daywiseRecords, 180);
    }

    const masterRaw = masterRecords.find(r =>
      (r["Booking ID"] || "").toLowerCase() === bookingId ||
      (r["Vendorwise ID"] || "").toLowerCase() === bookingId
    ) || null;

    const daywise = daywiseRecords.filter(r =>
      (r["Booking ID"] || "").toLowerCase() === bookingId ||
      (r["Vendorwise ID"] || "").toLowerCase() === bookingId ||
      (masterRaw && r["Guest Name"] && masterRaw["Guest Name"] && r["Guest Name"].toLowerCase() === masterRaw["Guest Name"].toLowerCase())
    );

    const master = masterRaw ? {
      ...masterRaw,
      "Name": masterRaw["Name"] || (daywise.find(d => d["Name"])?.["Name"]) || ''
    } : null;

    if (!master && daywise.length === 0) {
      return res.status(404).json({ message: "Car booking not found" });
    }

    res.json({
      master,
      daywise
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch car booking", error: err.message });
  }
});

const { initializeCarSheets } = require('../services/carGoogleSheet');

// POST /api/car-packages/booking - Add new car booking + daywise itinerary rows directly from CRM into Google Sheets
router.post('/car-packages/booking', requireAuth, async (req, res) => {
  try {
    const { master, daywise } = req.body;
    if (!master || !master.guestName) {
      return res.status(400).json({ message: "Master booking data with Guest Name is required." });
    }

    const doc = await initializeCarSheets();
    if (!doc) {
      return res.status(500).json({ message: "Unable to connect to Google Sheets." });
    }

    const bookingId = master.bookingId || `CAR-${Date.now()}`;
    const vendorwiseId = master.vendorwiseId || `${bookingId}-01`;

    // 1. Add row to Car Booking Master 26
    const masterSheet = doc.sheetsByTitle['Car Booking Master 26'] ||
                        doc.sheetsByTitle['Car Booking Master'] ||
                        doc.sheetsByIndex[0];

    const masterRowData = {
      "Vendorwise ID": vendorwiseId,
      "Booking ID": bookingId,
      "Booking Date": master.bookingDate || '',
      "Booking Month": master.bookingMonth || '',
      "Start Date": master.startDate || '',
      "Check in Month": master.checkInMonth || '',
      "End Date": master.endDate || '',
      "Guest Name": master.guestName || '',
      "Contact No": master.contactNo || '',
      "Pax": master.pax || '2',
      "Start City": master.startCity || 'NJP',
      "Billing Amt": master.billingAmt || '',
      "GST amt": master.gstAmt || '',
      "Total Sales": master.totalSales || '',
      "Purchase Cost": master.purchaseCost || '',
      "Profit": master.profit || '',
      "Advance Recieved": master.advanceReceived || '',
      "Due Collection": master.dueCollection || 'Guest Collection',
      "Status": master.status || 'Confirmed'
    };

    await masterSheet.addRow(masterRowData);

    // Determine user name who is working on this package
    const workingUserName = master.name || master.userName || req.user?.name || (req.user?.email ? req.user.email.split('@')[0] : '');

    // 2. Add rows to Daywise Sheet if provided
    if (daywise && Array.isArray(daywise) && daywise.length > 0) {
      const daywiseSheet = doc.sheetsByTitle['Daywise'] || doc.sheetsByIndex[1];
      if (daywiseSheet) {
        const daywiseRowsData = daywise.map(d => ({
          "Name": d.name || workingUserName,
          "Vendorwise ID": vendorwiseId,
          "Booking ID": bookingId,
          "Start Date": d.startDate || master.startDate || '',
          "Guest Name": master.guestName || '',
          "Contact No": master.contactNo || '',
          "From": d.from || '',
          "To": d.to || '',
          "Itinerary": d.itinerary || '',
          "Car Type": d.carType || 'WagonR',
          "No of Cars": d.noOfCars || '1',
          "Vendor": d.vendor || ''
        }));

        await daywiseSheet.addRows(daywiseRowsData);
      }
    }

    // 3. Clear cache so UI immediately sees new data
    cache.del(CAR_MASTER_CACHE_KEY);
    cache.del(CAR_DAYWISE_CACHE_KEY);

    res.status(201).json({
      success: true,
      message: "Car booking and itinerary saved to Google Sheet successfully!",
      bookingId
    });
  } catch (err) {
    console.error("Error creating car booking in Google Sheets:", err);
    res.status(500).json({ message: "Failed to create car booking", error: err.message });
  }
});

// POST /api/car-packages/sync - Force live refresh from Google Sheets
router.post('/car-packages/sync', requireAuth, async (req, res) => {
  try {
    cache.del(CAR_MASTER_CACHE_KEY);
    cache.del(CAR_DAYWISE_CACHE_KEY);
    
    const [master, daywise] = await Promise.all([
      fetchCarMasterRecords(),
      fetchCarDaywiseRecords()
    ]);

    cache.set(CAR_MASTER_CACHE_KEY, master, 180);
    cache.set(CAR_DAYWISE_CACHE_KEY, daywise, 180);

    res.json({
      success: true,
      message: "Car package cache refreshed successfully",
      masterCount: master.length,
      daywiseCount: daywise.length
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to sync car packages", error: err.message });
  }
});

module.exports = router;

