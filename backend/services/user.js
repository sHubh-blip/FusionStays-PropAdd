const crypto = require('crypto');
const { initializeSheets } = require('./googleSheets');
const cache = require('./cache');

// Helper to generate salt and hash passwords
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Get the Users sheet (creating it if it doesn't exist, and seeding the default admin)
async function getUserSheet() {
  const doc = await initializeSheets();
  if (!doc) return null;

  let sheet = doc.sheetsByTitle['Users'];
  if (!sheet) {
    console.log("Creating 'Users' worksheet in Google Sheet...");
    sheet = await doc.addSheet({
      title: 'Users',
      headerValues: ['email', 'passwordHash', 'salt', 'role', 'status', 'createdAt']
    });
  }

  // Seed default admin if sheet is empty
  const rows = await sheet.getRows();
  if (rows.length === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fusionstays.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'securepassword123';
    console.log(`Seeding default admin user: ${adminEmail}`);

    const salt = generateSalt();
    const passwordHash = hashPassword(adminPassword, salt);

    await sheet.addRow({
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      salt,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  return sheet;
}

// Find user by email (with in-memory caching for instant logins)
async function findUserByEmail(email) {
  if (!email) return null;
  const searchEmail = email.toLowerCase().trim();
  const cacheKey = `user_auth_${searchEmail}`;
  
  const cachedUser = cache.get(cacheKey);
  if (cachedUser) return cachedUser;

  const sheet = await getUserSheet();
  if (!sheet) {
    // Mock Mode fallback
    const mockAdminEmail = (process.env.ADMIN_EMAIL || 'admin@fusionstays.com').toLowerCase().trim();
    if (searchEmail === mockAdminEmail) {
      const mockAdminPassword = process.env.ADMIN_PASSWORD || 'securepassword123';
      const salt = 'mocksalt';
      const mockUser = {
        email: mockAdminEmail,
        passwordHash: hashPassword(mockAdminPassword, salt),
        salt,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        isMock: true
      };
      cache.set(cacheKey, mockUser, 300);
      return mockUser;
    }
    return null;
  }

  const rows = await sheet.getRows();
  const foundRow = rows.find(r => (r.get('email') || '').toLowerCase().trim() === searchEmail);

  if (!foundRow) return null;

  const userData = {
    email: foundRow.get('email'),
    name: foundRow.get('name') || '',
    passwordHash: foundRow.get('passwordHash'),
    salt: foundRow.get('salt'),
    role: foundRow.get('role'),
    status: foundRow.get('status'),
    createdAt: foundRow.get('createdAt'),
    _row: foundRow // Reference to save updates
  };

  cache.set(cacheKey, userData, 300); // 5 min cache
  return userData;
}

// List all users
async function listUsers() {
  const cachedUsers = cache.get('all_users');
  if (cachedUsers) return cachedUsers;

  const sheet = await getUserSheet();
  if (!sheet) {
    // Mock mode fallback
    const mockAdminEmail = (process.env.ADMIN_EMAIL || 'admin@fusionstays.com').toLowerCase().trim();
    return [{
      email: mockAdminEmail,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    }];
  }

  const rows = await sheet.getRows();
  const users = rows.map(row => ({
    email: row.get('email'),
    name: row.get('name') || '',
    role: row.get('role'),
    status: row.get('status'),
    createdAt: row.get('createdAt')
  }));

  cache.set('all_users', users, 120); // 2 minute cache
  return users;
}

// Create new user
async function createUser({ name, email, password, role, status }) {
  const sheet = await getUserSheet();

  // Extract first name (case-insensitive check)
  const rawFirstName = (name || email.split('@')[0]).trim().split(' ')[0];
  const cleanFirstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase();
  const firstNameLower = cleanFirstName.toLowerCase();
  const cleanEmail = `${firstNameLower}@workspace.com`;

  // Check if first name or email already exists (case-insensitive)
  const allUsers = await listUsers();
  const existsByFirstName = allUsers.some(u => {
    const uEmailPrefix = (u.email || '').split('@')[0].toLowerCase().trim();
    const uFirstName = (u.name || '').trim().split(' ')[0].toLowerCase();
    return uEmailPrefix === firstNameLower || uFirstName === firstNameLower;
  });

  const userExists = await findUserByEmail(cleanEmail);

  if (existsByFirstName || userExists) {
    throw new Error('User already exists');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    email: cleanEmail,
    name: cleanFirstName,
    passwordHash,
    salt,
    role: role || 'prop_add',
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  // Sync new user single name to the Excel agent dropdown list
  try {
    const { ensureDropdownValue } = require('../utils/dropdownManager');
    await ensureDropdownValue('agent', cleanFirstName);
  } catch (err) {
    console.warn("Could not sync new user to Excel dropdown agent list:", err.message);
  }

  if (!sheet) {
    // Mock mode write bypass
    console.log("Mock Mode: User created", newUser);
    cache.del('all_users');
    return newUser;
  }

  await sheet.addRow(newUser);
  cache.del('all_users');
  return {
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    status: newUser.status,
    createdAt: newUser.createdAt
  };
}

// Update user details
async function updateUser(email, updates) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');

  if (user.isMock) {
    console.log("Mock Mode: User updated", updates);
    return { email, ...updates };
  }

  const row = user._row;
  if (updates.name && updates.name.trim()) {
    const rawName = updates.name.trim().split(' ')[0];
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    row.assign({ name: cleanName });

    try {
      const { ensureDropdownValue } = require('../utils/dropdownManager');
      await ensureDropdownValue('agent', cleanName);
    } catch (err) {
      console.warn("Could not sync updated name to agent dropdown:", err.message);
    }
  }

  if (updates.role) row.assign({ role: updates.role });
  if (updates.status) row.assign({ status: updates.status });
  if (updates.password) {
    const salt = generateSalt();
    const passwordHash = hashPassword(updates.password, salt);
    row.assign({ passwordHash, salt });
  }

  await row.save();
  cache.del('all_users');
  cache.del(`user_auth_${email.toLowerCase().trim()}`);
  return {
    email: row.get('email'),
    name: row.get('name'),
    role: row.get('role'),
    status: row.get('status'),
    createdAt: row.get('createdAt')
  };
}

// Delete user
async function deleteUser(email) {
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');

  if (user.isMock) {
    console.log("Mock Mode: User deleted", email);
    cache.del('all_users');
    cache.del(`user_auth_${email.toLowerCase().trim()}`);
    return true;
  }

  const row = user._row;
  await row.delete();
  cache.del('all_users');
  cache.del(`user_auth_${email.toLowerCase().trim()}`);
  return true;
}

module.exports = {
  getUserSheet,
  findUserByEmail,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  hashPassword
};
