const { query, useSQLite, saveDatabase } = require('../config/database');

// Default nota settings
const defaultNota = {
  shop_name: 'POSMarbLe',
  address: '',
  phone: '',
  footer_text: 'Terima kasih telah belanja di toko kami!',
  show_logo: true,
  show_qr_code: false,
  tax_rate: 0,
  currency: 'IDR',
};

// Ensure nota settings record exists
const ensureNotaExists = async () => {
  try {
    const [rows] = await query('SELECT * FROM nota_settings LIMIT 1');
    if (!rows || rows.length === 0) {
      // Create default record
      await query(
        `INSERT INTO nota_settings (shop_name, address, phone, footer_text, show_logo, show_qr_code, tax_rate, currency) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
    }
  } catch (error) {
    console.error('Error ensuring nota exists:', error);
  }
};

// Read nota settings from database
const getNotaData = async () => {
  try {
    await ensureNotaExists();
    const [rows] = await query('SELECT * FROM nota_settings LIMIT 1');
    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        shop_name: row.shop_name,
        address: row.address || '',
        phone: row.phone || '',
        footer_text: row.footer_text,
        show_logo: Boolean(row.show_logo),
        show_qr_code: Boolean(row.show_qr_code),
        tax_rate: row.tax_rate,
        currency: row.currency
      };
    }
  } catch (error) {
    console.error('Error reading nota from database:', error);
  }
  return defaultNota;
};

// Update nota settings in database
const saveNotaData = async (data) => {
  try {
    await ensureNotaExists();
    const [rows] = await query('SELECT id FROM nota_settings LIMIT 1');
    if (rows && rows.length > 0) {
      const id = rows[0].id;
      await query(
        `UPDATE nota_settings SET 
          shop_name = ?, 
          address = ?, 
          phone = ?, 
          footer_text = ?, 
          show_logo = ?, 
          show_qr_code = ?, 
          tax_rate = ?, 
          currency = ? 
         WHERE id = ?`,
        [
          data.shop_name,
          data.address,
          data.phone,
          data.footer_text,
          data.show_logo ? 1 : 0,
          data.show_qr_code ? 1 : 0,
          data.tax_rate,
          data.currency,
          id
        ]
      );
      if (useSQLite) saveDatabase();
      return true;
    }
  } catch (error) {
    console.error('Error saving nota to database:', error);
  }
  return false;
};

// Get nota settings
exports.getNota = async (req, res) => {
  try {
    const nota = await getNotaData();
    res.json(nota);
  } catch (error) {
    console.error('Error getting nota:', error);
    res.status(500).json({ error: 'Failed to get nota settings' });
  }
};

// Update nota settings
exports.updateNota = async (req, res) => {
  try {
    const currentNota = await getNotaData();
    const updatedNota = { ...currentNota, ...req.body };
    
    if (await saveNotaData(updatedNota)) {
      res.json(updatedNota);
    } else {
      res.status(500).json({ error: 'Failed to save nota settings' });
    }
  } catch (error) {
    console.error('Error updating nota:', error);
    res.status(500).json({ error: 'Failed to update nota settings' });
  }
};

// Reset nota settings to default
exports.resetNota = async (req, res) => {
  try {
    if (await saveNotaData(defaultNota)) {
      res.json(defaultNota);
    } else {
      res.status(500).json({ error: 'Failed to reset nota settings' });
    }
  } catch (error) {
    console.error('Error resetting nota:', error);
    res.status(500).json({ error: 'Failed to reset nota settings' });
  }
};
