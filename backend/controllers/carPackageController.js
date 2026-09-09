const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const cache = require('../services/cache');
const { initializeCarSheets } = require('../services/carGoogleSheet');
const {
  fetchCarMasterRecords,
  fetchCarDaywiseRecords,
  fetchCarAccountsRecords,
  updateCarAccountRecord,
  syncAccountsFromMaster,
  CAR_MASTER_CACHE_KEY,
  CAR_DAYWISE_CACHE_KEY,
  CAR_ACCOUNTS_CACHE_KEY
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

    // Lookup accounts by Vendorwise ID or Booking ID to enrich master records with payment status
    let accountsRecords = cache.get(CAR_ACCOUNTS_CACHE_KEY);
    if (!accountsRecords) {
      accountsRecords = await fetchCarAccountsRecords();
      cache.set(CAR_ACCOUNTS_CACHE_KEY, accountsRecords, 180);
    }
    const accountsByVendorId = {};
    for (const a of accountsRecords) {
      const vId = (a["Vendorwise ID"] || "").toLowerCase().trim();
      if (vId && !accountsByVendorId[vId]) {
        accountsByVendorId[vId] = a;
      }
    }

    let filtered = records.map(r => {
      const bId = (r["Booking ID"] || r["Vendorwise ID"] || "").toLowerCase().trim();
      const vId = (r["Vendorwise ID"] || r["Booking ID"] || "").toLowerCase().trim();
      const acc = accountsByVendorId[vId] || accountsByVendorId[bId] || {};

      return {
        ...r,
        "Name": r["Name"] || nameByBookingId[bId] || '',
        "Advance Status": acc["Advance Status"] || 'To be paid',
        "Advance to be Paid": acc["Advance to be Paid"] || r["Advance Recieved"] || '0',
        "Secondary Advance": acc["Secondary Advance"] || '',
        "Secondary Advance Status": acc["Secondary Advance Status"] || 'To be paid',
        "Guest Collection": acc["Guest Collection"] || r["Due Collection"] || '',
        "Vendor": acc["Vendor"] || r["Vendor"] || '',
        "Remarks": acc["Remarks"] || ''
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

// PUT /api/car-packages/master/:id - Edit an existing Master Booking entry
router.put('/car-packages/master/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // row index or Booking ID
    const updates = req.body;

    const doc = await initializeCarSheets();
    if (!doc) {
      return res.status(500).json({ message: "Unable to connect to Google Sheets." });
    }

    const masterSheet = doc.sheetsByTitle['Car Booking Master 26'] ||
                        doc.sheetsByTitle['Car Booking Master'] ||
                        doc.sheetsByIndex[0];

    await masterSheet.loadHeaderRow();
    const rows = await masterSheet.getRows({ offset: 0, limit: 5000 });
    
    // Match by _rowIndex or Booking ID / Vendorwise ID
    const rowToUpdate = rows.find(r => 
      r.rowNumber.toString() === id.toString() ||
      (r.get('Booking ID') && r.get('Booking ID').trim().toLowerCase() === id.trim().toLowerCase()) ||
      (r.get('Vendorwise ID') && r.get('Vendorwise ID').trim().toLowerCase() === id.trim().toLowerCase())
    );

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Master booking entry not found' });
    }

    const updatableColumns = [
      "Guest Name", "Contact No", "Pax", "Start City", "Start Date", "End Date",
      "Booking Date", "Booking Month", "Check in Month", "Total Sales",
      "Billing Amt", "GST amt", "Purchase Cost", "Profit", "Advance Recieved",
      "Due Collection", "Status", "Name"
    ];

    updatableColumns.forEach(col => {
      const matchKey = Object.keys(updates).find(k => k.trim().toLowerCase() === col.toLowerCase());
      if (matchKey !== undefined && updates[matchKey] !== undefined) {
        rowToUpdate.set(col, updates[matchKey]);
      } else if (updates[col] !== undefined) {
        rowToUpdate.set(col, updates[col]);
      }
    });

    await rowToUpdate.save();

    cache.del(CAR_MASTER_CACHE_KEY);

    res.json({
      success: true,
      message: 'Master booking entry updated successfully'
    });
  } catch (err) {
    console.error("Failed to update car master entry:", err);
    res.status(500).json({ message: "Failed to update entry", error: err.message });
  }
});

// PATCH /api/car-packages/master/:id/status - Quick inline status change
router.patch('/car-packages/master/:id/status', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status value is required" });
    }

    const doc = await initializeCarSheets();
    if (!doc) {
      return res.status(500).json({ message: "Unable to connect to Google Sheets." });
    }

    const masterSheet = doc.sheetsByTitle['Car Booking Master 26'] ||
                        doc.sheetsByTitle['Car Booking Master'] ||
                        doc.sheetsByIndex[0];

    await masterSheet.loadHeaderRow();
    if (!masterSheet.headerValues.some(h => h.toLowerCase().trim() === 'status')) {
      await masterSheet.setHeaderRow([...masterSheet.headerValues, 'Status']);
      await masterSheet.loadHeaderRow();
    }

    const rows = await masterSheet.getRows({ offset: 0, limit: 5000 });
    const rowToUpdate = rows.find(r => 
      r.rowNumber.toString() === id.toString() ||
      (r.get('Booking ID') && r.get('Booking ID').trim().toLowerCase() === id.trim().toLowerCase()) ||
      (r.get('Vendorwise ID') && r.get('Vendorwise ID').trim().toLowerCase() === id.trim().toLowerCase())
    );

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Master booking entry not found' });
    }

    rowToUpdate.set('Status', status);
    await rowToUpdate.save();

    cache.del(CAR_MASTER_CACHE_KEY);

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      status
    });
  } catch (err) {
    console.error("Failed to update status:", err);
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

// PUT /api/car-packages/daywise/:id - Edit an existing Daywise Itinerary entry
router.put('/car-packages/daywise/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // row index
    const updates = req.body;

    const doc = await initializeCarSheets();
    if (!doc) {
      return res.status(500).json({ message: "Unable to connect to Google Sheets." });
    }

    const daywiseSheet = doc.sheetsByTitle['Daywise'] ||
                         doc.sheetsByTitle['Day wise'] ||
                         doc.sheetsByIndex[1];

    await daywiseSheet.loadHeaderRow();
    const rows = await daywiseSheet.getRows({ offset: 0, limit: 5000 });

    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id.toString());

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Daywise itinerary entry not found' });
    }

    const updatableColumns = [
      "Start Date", "From", "To", "Itinerary", "Car Type", "No of Cars", 
      "Vendor", "Name", "Guest Name", "Contact No"
    ];

    updatableColumns.forEach(col => {
      if (updates[col] !== undefined) {
        rowToUpdate.set(col, updates[col]);
      }
    });

    await rowToUpdate.save();

    cache.del(CAR_DAYWISE_CACHE_KEY);

    res.json({
      success: true,
      message: 'Daywise itinerary entry updated successfully'
    });
  } catch (err) {
    console.error("Failed to update car daywise entry:", err);
    res.status(500).json({ message: "Failed to update daywise entry", error: err.message });
  }
});

// ==========================================
// VENDOR ACCOUNTS ENDPOINTS
// ==========================================

// GET /api/car-packages/accounts - List all vendor account records
router.get('/car-packages/accounts', requireAuth, async (req, res) => {
  try {
    const {
      search,
      status,
      vendor,
      carType,
      month,
      page = 1,
      limit = 50,
      paginate = 'true'
    } = req.query;

    let records = cache.get(CAR_ACCOUNTS_CACHE_KEY);
    let fromCache = true;

    if (!records) {
      records = await fetchCarAccountsRecords();
      cache.set(CAR_ACCOUNTS_CACHE_KEY, records, 180);
      fromCache = false;
    }

    let filtered = [...records];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r["Vendorwise ID"] || "").toLowerCase().includes(q) ||
        (r["Guest Name"] || "").toLowerCase().includes(q) ||
        (r["Vendor"] || "").toLowerCase().includes(q) ||
        (r["Car Type"] || "").toLowerCase().includes(q) ||
        (r["Remarks"] || "").toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(r =>
        (r["Advance Status"] || "").toLowerCase() === status.toLowerCase() ||
        (r["Secondary Advance Status"] || "").toLowerCase() === status.toLowerCase()
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

    if (month && month !== 'all') {
      filtered = filtered.filter(r =>
        (r["Date"] || "").toLowerCase().includes(month.toLowerCase())
      );
    }

    // Aggregated financial metrics
    const stats = filtered.reduce((acc, row) => {
      const purchase = cleanNum(row["Purchase Price"]);
      const advance = cleanNum(row["Advance to be Paid"]);
      const secAdvance = cleanNum(row["Secondary Advance"]);
      const guestCollection = cleanNum(row["Guest Collection"]);
      const advStatus = (row["Advance Status"] || "").trim().toLowerCase();

      acc.totalRecords += 1;
      acc.totalPurchasePrice += purchase;
      acc.totalAdvanceToBePaid += advance;
      acc.totalSecondaryAdvance += secAdvance;
      acc.totalGuestCollection += guestCollection;

      if (advStatus === 'paid' || advStatus === 'vendor confirmed') {
        acc.totalPaid += advance;
      } else if (advStatus === 'to be paid' || !advStatus) {
        acc.totalPending += advance;
      }

      if (advStatus === 'to be paid') acc.statusCounts.toBePaid += 1;
      else if (advStatus === 'paid') acc.statusCounts.paid += 1;
      else if (advStatus === 'vendor confirmed') acc.statusCounts.vendorConfirmed += 1;
      else if (advStatus === 'cancelled') acc.statusCounts.cancelled += 1;

      return acc;
    }, {
      totalRecords: 0,
      totalPurchasePrice: 0,
      totalAdvanceToBePaid: 0,
      totalSecondaryAdvance: 0,
      totalPaid: 0,
      totalPending: 0,
      totalGuestCollection: 0,
      statusCounts: {
        toBePaid: 0,
        paid: 0,
        vendorConfirmed: 0,
        cancelled: 0
      }
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / Number(limit));
    const offset = (Number(page) - 1) * Number(limit);

    const paginated = paginate === 'false'
      ? filtered
      : filtered.slice(offset, offset + Number(limit));

    // Filter dropdown options
    const uniqueVendors = [...new Set(records.map(r => r.Vendor).filter(Boolean))].sort();
    const uniqueCarTypes = [...new Set(records.map(r => r["Car Type"]).filter(Boolean))].sort();
    const statuses = ['To be paid', 'Paid', 'Vendor Confirmed', 'Cancelled'];

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
      filters: {
        vendors: uniqueVendors,
        carTypes: uniqueCarTypes,
        statuses
      },
      source: fromCache ? 'cache' : 'sheets'
    });
  } catch (err) {
    console.error("Failed to fetch car accounts records:", err);
    res.status(500).json({ message: "Failed to fetch accounts records", error: err.message });
  }
});

// GET /api/car-packages/accounts/:id - Get single account by Vendorwise ID or row index
router.get('/car-packages/accounts/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id.trim().toLowerCase();
    let records = cache.get(CAR_ACCOUNTS_CACHE_KEY);
    if (!records) {
      records = await fetchCarAccountsRecords();
      cache.set(CAR_ACCOUNTS_CACHE_KEY, records, 180);
    }

    let account = records.find(r => 
      (r["Vendorwise ID"] || "").trim().toLowerCase() === id ||
      r._rowIndex?.toString() === id
    );

    // If not in Accounts, fallback to master
    if (!account) {
      let masterRecords = cache.get(CAR_MASTER_CACHE_KEY) || await fetchCarMasterRecords();
      const master = masterRecords.find(m => 
        (m["Vendorwise ID"] || "").trim().toLowerCase() === id ||
        (m["Booking ID"] || "").trim().toLowerCase() === id
      );

      if (master) {
        account = {
          "Vendorwise ID": master["Vendorwise ID"] || id.toUpperCase(),
          "Guest Name": master["Guest Name"] || '',
          "Date": master["Start Date"] || master["Booking Date"] || '',
          "Car Type": '',
          "Purchase Price": master["Purchase Cost"] || '0',
          "Advance to be Paid": master["Advance Recieved"] || '0',
          "Advance Status": 'To be paid',
          "Secondary Advance": '',
          "Secondary Advance Status": 'To be paid',
          "Guest Collection": master["Due Collection"] || '',
          "Vendor": master["Vendor"] || '',
          "Remarks": ''
        };
      }
    }

    if (!account) {
      return res.status(404).json({ message: "Account record not found" });
    }

    res.json({ account });
  } catch (err) {
    console.error("Failed to fetch account detail:", err);
    res.status(500).json({ message: "Failed to fetch account detail", error: err.message });
  }
});

// PUT /api/car-packages/accounts/:id - Edit an existing account entry
router.put('/car-packages/accounts/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    const result = await updateCarAccountRecord(id, updates);
    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    cache.del(CAR_MASTER_CACHE_KEY);

    res.json({
      success: true,
      message: 'Vendor account updated successfully in Google Sheet',
      result
    });
  } catch (err) {
    console.error("Failed to update car account record:", err);
    res.status(500).json({ message: "Failed to update account record", error: err.message });
  }
});

// PATCH /api/car-packages/accounts/:id/status - Quick status update
router.patch('/car-packages/accounts/:id/status', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { status, field = 'advance' } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status value is required" });
    }

    const updates = {};
    if (field === 'secondary') {
      updates["Secondary Advance Status"] = status;
    } else {
      updates["Advance Status"] = status;
    }

    await updateCarAccountRecord(id, updates);
    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    cache.del(CAR_MASTER_CACHE_KEY);

    res.json({
      success: true,
      message: `Payment status updated to ${status}`,
      status
    });
  } catch (err) {
    console.error("Failed to update payment status:", err);
    res.status(500).json({ message: "Failed to update payment status", error: err.message });
  }
});

// POST /api/car-packages/accounts - Create a manual account entry
router.post('/car-packages/accounts', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data["Vendorwise ID"] && !data["Guest Name"]) {
      return res.status(400).json({ message: "Vendorwise ID or Guest Name is required" });
    }

    await updateCarAccountRecord(data["Vendorwise ID"] || Date.now().toString(), data);
    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    cache.del(CAR_MASTER_CACHE_KEY);

    res.status(201).json({
      success: true,
      message: "Vendor account record saved to Google Sheet successfully!"
    });
  } catch (err) {
    console.error("Failed to create vendor account record:", err);
    res.status(500).json({ message: "Failed to create account record", error: err.message });
  }
});

// POST /api/car-packages/accounts/sync - Force sync from Master to Accounts
router.post('/car-packages/accounts/sync', requireAuth, async (req, res) => {
  try {
    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    cache.del(CAR_MASTER_CACHE_KEY);

    const doc = await initializeCarSheets();
    const count = await syncAccountsFromMaster(doc);
    const refreshed = await fetchCarAccountsRecords();
    cache.set(CAR_ACCOUNTS_CACHE_KEY, refreshed, 180);

    res.json({
      success: true,
      message: "Vendor accounts synchronized with Master successfully",
      syncedCount: count,
      totalCount: refreshed.length
    });
  } catch (err) {
    console.error("Failed to sync accounts from master:", err);
    res.status(500).json({ message: "Failed to sync accounts", error: err.message });
  }
});

module.exports = router;

