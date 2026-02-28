const { query, useSQLite, saveDatabase } = require('../config/database');

// Default nota settings
const defaultNota = {
  shop_name: 'Toko Saya',
  address: '',
  phone: '',
  footer_text: 'Terima kasih telah belanja di toko kami!',
  show_logo: true,
  show_qr_code: false,
  tax_rate: 0,
  currency: 'IDR',
};

// Ensure nota settings record exists for a user
const ensureNotaExists = async (userId) => {
  try {
    console.log('[Nota] Ensuring nota exists for user:', userId);
    const [rows] = await query('SELECT * FROM nota_settings WHERE user_id = ?', [userId]);
    console.log('[Nota] Query result:', rows);
    
    if (!rows || rows.length === 0) {
      console.log('[Nota] Creating new nota settings for user:', userId);
      // Create default record for user
      await query(
        `INSERT INTO nota_settings (user_id, shop_name, address, phone, footer_text, show_logo, show_qr_code, tax_rate, currency) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          defaultNota.shop_name,
          defaultNota.address,
          defaultNota.phone,
          defaultNota.footer_text,
          defaultNota.show_logo ? 1 : 0,
          defaultNota.show_qr_code ? 1 : 0,
          defaultNota.tax_rate,
          defaultNota.currency
        ]
      );
      if (useSQLite) saveDatabase();
      console.log('[Nota] Created nota settings for user:', userId);
    } else {
      console.log('[Nota] Nota settings already exists for user:', userId);
    }
  } catch (error) {
    console.error('[Nota] Error ensuring nota exists:', error);
    throw error; // Re-throw to let caller handle it
  }
};

// Read nota settings from database for a user
const getNotaData = async (userId) => {
  try {
    // Ensure the record exists first
    await ensureNotaExists(userId);
    
    const [rows] = await query('SELECT * FROM nota_settings WHERE user_id = ?', [userId]);
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        shop_name: row.shop_name || defaultNota.shop_name,
        address: row.address || '',
        phone: row.phone || '',
        footer_text: row.footer_text || defaultNota.footer_text,
        show_logo: row.show_logo !== undefined ? Boolean(row.show_logo) : defaultNota.show_logo,
        show_qr_code: row.show_qr_code !== undefined ? Boolean(row.show_qr_code) : defaultNota.show_qr_code,
        tax_rate: row.tax_rate !== undefined ? parseFloat(row.tax_rate) : defaultNota.tax_rate,
        currency: row.currency || defaultNota.currency
      };
    }
  } catch (error) {
    console.error('Error reading nota from database:', error);
  }
  return { ...defaultNota };
};

// Update nota settings in database for a user
const saveNotaData = async (userId, data) => {
  try {
    // First ensure the record exists
    await ensureNotaExists(userId);
    
    // Then update it
    const result = await query(
      `UPDATE nota_settings SET 
        shop_name = ?, 
        address = ?, 
        phone = ?, 
        footer_text = ?, 
        show_logo = ?, 
        show_qr_code = ?, 
        tax_rate = ?, 
        currency = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        data.shop_name || defaultNota.shop_name,
        data.address || '',
        data.phone || '',
        data.footer_text || defaultNota.footer_text,
        data.show_logo !== undefined ? (data.show_logo ? 1 : 0) : (defaultNota.show_logo ? 1 : 0),
        data.show_qr_code !== undefined ? (data.show_qr_code ? 1 : 0) : (defaultNota.show_qr_code ? 1 : 0),
        data.tax_rate !== undefined ? data.tax_rate : defaultNota.tax_rate,
        data.currency || defaultNota.currency,
        userId
      ]
    );
    
    if (useSQLite) saveDatabase();
    
    console.log('Nota saved successfully for user:', userId, 'Data:', data);
    return true;
  } catch (error) {
    console.error('Error saving nota to database:', error);
    throw error; // Re-throw to let caller handle it
  }
};

// Get nota settings
exports.getNota = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[Nota] Getting nota for user:', userId);
    const nota = await getNotaData(userId);
    console.log('[Nota] Got nota:', nota);
    res.json(nota);
  } catch (error) {
    console.error('[Nota] Error getting nota:', error);
    res.status(500).json({ error: 'Failed to get nota settings: ' + error.message });
  }
};

// Update nota settings
exports.updateNota = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[Nota] Updating nota for user:', userId);
    console.log('[Nota] Request body:', req.body);
    
    const currentNota = await getNotaData(userId);
    console.log('[Nota] Current nota:', currentNota);
    
    const updatedNota = { ...currentNota, ...req.body };
    console.log('[Nota] Updated nota:', updatedNota);
    
    await saveNotaData(userId, updatedNota);
    res.json(updatedNota);
  } catch (error) {
    console.error('[Nota] Error updating nota:', error);
    res.status(500).json({ error: 'Failed to update nota settings: ' + error.message });
  }
};

// Reset nota settings to default
exports.resetNota = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[Nota] Resetting nota for user:', userId);
    await saveNotaData(userId, defaultNota);
    res.json(defaultNota);
  } catch (error) {
    console.error('[Nota] Error resetting nota:', error);
    res.status(500).json({ error: 'Failed to reset nota settings: ' + error.message });
  }
};
