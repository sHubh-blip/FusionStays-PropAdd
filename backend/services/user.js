const crypto = require('crypto');
const { initializeSheets } = require('./googleSheets');

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

// Find user by email
async function findUserByEmail(email) {
  if (!email) return null;
  const sheet = await getUserSheet();
  if (!sheet) {
    // Mock Mode fallback
    const mockAdminEmail = (process.env.ADMIN_EMAIL || 'admin@fusionstays.com').toLowerCase().trim();
    if (email.toLowerCase().trim() === mockAdminEmail) {
      const mockAdminPassword = process.env.ADMIN_PASSWORD || 'securepassword123';
      const salt = 'mocksalt';
      return {
        email: mockAdminEmail,
        passwordHash: hashPassword(mockAdminPassword, salt),
        salt,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        isMock: true
      };
    }
    return null;
  }

  const rows = await sheet.getRows();
  const searchEmail = email.toLowerCase().trim();
  const foundRow = rows.find(r => (r.get('email') || '').toLowerCase().trim() === searchEmail);

  if (!foundRow) return null;

  return {
    email: foundRow.get('email'),
    passwordHash: foundRow.get('passwordHash'),
    salt: foundRow.get('salt'),
    role: foundRow.get('role'),
    status: foundRow.get('status'),
    createdAt: foundRow.get('createdAt'),
    _row: foundRow // Reference to save updates
  };
}

// List all users
async function listUsers() {
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
  return rows.map(row => ({
    email: row.get('email'),
    role: row.get('role'),
    status: row.get('status'),
    createdAt: row.get('createdAt')
  }));
}

// Create new user
async function createUser({ email, password, role, status }) {
  const sheet = await getUserSheet();
  const cleanEmail = email.toLowerCase().trim();
  const userExists = await findUserByEmail(cleanEmail);

  if (userExists) {
    throw new Error('User already exists');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    email: cleanEmail,
    passwordHash,
    salt,
    role: role || 'user',
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  if (!sheet) {
    // Mock mode write bypass
    console.log("Mock Mode: User created", newUser);
    return newUser;
  }

  await sheet.addRow(newUser);
  return {
    email: newUser.email,
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
  if (updates.role) row.assign({ role: updates.role });
  if (updates.status) row.assign({ status: updates.status });
  if (updates.password) {
    const salt = generateSalt();
    const passwordHash = hashPassword(updates.password, salt);
    row.assign({ passwordHash, salt });
  }

  await row.save();
  return {
    email: row.get('email'),
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
    return true;
  }

  const row = user._row;
  await row.delete();
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
