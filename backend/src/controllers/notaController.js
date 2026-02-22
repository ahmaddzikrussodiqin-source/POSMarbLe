const fs = require('fs');
const path = require('path');

const NOTA_FILE = path.join(__dirname, '../../data/nota.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

// Read nota settings from file
const getNotaData = () => {
  try {
    if (fs.existsSync(NOTA_FILE)) {
      const data = fs.readFileSync(NOTA_FILE, 'utf8');
      return { ...defaultNota, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error reading nota file:', error);
  }
  return defaultNota;
};

// Write nota settings to file
const saveNotaData = (data) => {
  try {
    fs.writeFileSync(NOTA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing nota file:', error);
    return false;
  }
};

// Get nota settings
exports.getNota = (req, res) => {
  try {
    const nota = getNotaData();
    res.json(nota);
  } catch (error) {
    console.error('Error getting nota:', error);
    res.status(500).json({ error: 'Failed to get nota settings' });
  }
};

// Update nota settings
exports.updateNota = (req, res) => {
  try {
    const currentNota = getNotaData();
    const updatedNota = { ...currentNota, ...req.body };
    
    if (saveNotaData(updatedNota)) {
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
exports.resetNota = (req, res) => {
  try {
    if (saveNotaData(defaultNota)) {
      res.json(defaultNota);
    } else {
      res.status(500).json({ error: 'Failed to reset nota settings' });
    }
  } catch (error) {
    console.error('Error resetting nota:', error);
    res.status(500).json({ error: 'Failed to reset nota settings' });
  }
};

