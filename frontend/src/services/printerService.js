// Printer Service - Web Bluetooth API for thermal printers
// Uses ESC/POS commands for compatibility with most thermal printers

class PrinterService {
  constructor() {
    this.device = null;
    this.server = null;
    this.printerService = null;
    this.writeCharacteristic = null;
    this.isConnected = false;
  }

  // Check if Web Bluetooth is supported
  isBluetoothSupported() {
    return 'bluetooth' in navigator;
  }

  // Request Bluetooth device
  async requestDevice() {
    if (!this.isBluetoothSupported()) {
      throw new Error('Bluetooth tidak didukung di browser ini. Silakan gunakan browser Chrome/Edge.');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        // Accept all devices, then filter for printers
        acceptAllDevices: true,
        optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb'] // Common SPP service UUID
      });

      this.device = device;
      console.log('Device selected:', device.name);
      
      device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        console.log('Printer disconnected');
      });

      return device;
    } catch (error) {
      console.error('Error requesting device:', error);
      throw error;
    }
  }

  // Connect to the device
  async connect() {
    if (!this.device) {
      throw new Error('Tidak ada perangkat yang dipilih');
    }

    try {
      this.server = await this.device.gatt.connect();
      this.isConnected = true;
      console.log('Connected to GATT server');
      return true;
    } catch (error) {
      console.error('Error connecting:', error);
      throw error;
    }
  }

  // Find and get the write characteristic
  async findWriteService() {
    if (!this.server) {
      throw new Error('Belum terhubung ke server');
    }

    try {
      // Try common service UUIDs for thermal printers
      const serviceUUIDs = [
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal printer SPP
        '0000fee7-0000-1000-8000-00805f9b34fb', // Another common UUID
        '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        '00001801-0000-1000-8000-00805f9b34fb'  // Generic Attribute
      ];

      for (const serviceUUID of serviceUUIDs) {
        try {
          const service = await this.server.getPrimaryService(serviceUUID);
          const characteristics = await service.getCharacteristics();
          
          for (const char of characteristics) {
            // Look for writable characteristics
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.writeCharacteristic = char;
              this.printerService = service;
              console.log('Found write characteristic:', char.uuid);
              return true;
            }
          }
        } catch (e) {
          continue;
        }
      }

      throw new Error('Tidak dapat menemukan layanan printer yang kompatibel');
    } catch (error) {
      console.error('Error finding service:', error);
      throw error;
    }
  }

  // Connect to a printer
  async connectToPrinter() {
    try {
      await this.requestDevice();
      await this.connect();
      await this.findWriteService();
      return {
        name: this.device.name || 'Printer Tidak Dikenal',
        connected: true
      };
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  // Disconnect from printer
  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.printerService = null;
    this.writeCharacteristic = null;
  }

  // Send data to printer
  async sendData(data) {
    if (!this.writeCharacteristic) {
      throw new Error('Printer belum terhubung dengan benar');
    }

    try {
      const buffer = typeof data === 'string' ? this.stringToBuffer(data) : data;
      await this.writeCharacteristic.writeValue(buffer);
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
      throw error;
    }
  }

  // Convert string to ArrayBuffer
  stringToBuffer(str) {
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return buffer;
  }

  // ESC/POS Commands
  static get COMMANDS() {
    return {
      // Initialize printer
      INIT: '\x1b\x40',
      
      // Line feed
      LF: '\x0a',
      CR: '\x0d',
      
      // Bold
      BOLD_ON: '\x1b\x45\x01',
      BOLD_OFF: '\x1b\x45\x00',
      
      // Underline
      UNDERLINE_ON: '\x1b\x2d\x01',
      UNDERLINE_OFF: '\x1b\x2d\x00',
      
      // Text alignment
      ALIGN_LEFT: '\x1b\x61\x00',
      ALIGN_CENTER: '\x1b\x61\x01',
      ALIGN_RIGHT: '\x1b\x61\x02',
      
      // Font size
      FONT_NORMAL: '\x1d\x21\x00',
      FONT_LARGE: '\x1d\x21\x01',
      FONT_LARGE2: '\x1d\x21\x11',
      
      // Cut paper
      CUT_PARTIAL: '\x1d\x56\x01',
      CUT_FULL: '\x1d\x56\x00',
      
      // Open cash drawer
      OPEN_DRAWER: '\x1b\x70\x00\x19\xfa',
      
      // Feed lines
      FEED_LINES: (n) => '\x1b\x64' + String.fromCharCode(n),
    };
  }

  // Format receipt text for thermal printer
  formatReceiptForPrinter(receiptData) {
    const { notaSettings, showReceipt, paymentMethod, calculateTax } = receiptData;
    const WIDTH = 32; // Standard thermal printer width
    
    let printData = '';
    
    // Initialize
    printData += PrinterService.COMMANDS.INIT;
    printData += PrinterService.COMMANDS.FONT_NORMAL;
    printData += PrinterService.COMMANDS.ALIGN_CENTER;
    
    // Shop name
    printData += PrinterService.COMMANDS.BOLD_ON;
    printData += this.centerText(notaSettings.shop_name || 'Toko', WIDTH) + '\n';
    printData += PrinterService.COMMANDS.BOLD_OFF;
    
    // Address and phone
    if (notaSettings.address) {
      printData += this.centerText(notaSettings.address, WIDTH) + '\n';
    }
    if (notaSettings.phone) {
      printData += this.centerText('Telp: ' + notaSettings.phone, WIDTH) + '\n';
    }
    
    // Divider
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    // Order number
    printData += PrinterService.COMMANDS.ALIGN_LEFT;
    printData += 'No. Pesanan: ' + showReceipt.order_number + '\n';
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    // Items
    printData += PrinterService.COMMANDS.ALIGN_LEFT;
    showReceipt.items.forEach(item => {
      const itemLine = `${item.product_name}`;
      const qtyLine = `x${item.quantity}`;
      const priceLine = this.formatMoney(item.subtotal);
      printData += this.padBoth(itemLine, WIDTH - 12) + priceLine + '\n';
    });
    
    // Divider
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    // Subtotal
    const subtotalStr = 'Subtotal';
    printData += subtotalStr + this.padLeft(this.formatMoney(showReceipt.total_amount), WIDTH - subtotalStr.length) + '\n';
    
    // Tax
    if (notaSettings.tax_rate > 0) {
      const taxAmount = calculateTax(showReceipt.total_amount, notaSettings.tax_rate);
      const taxStr = `Pajak (${notaSettings.tax_rate}%)`;
      printData += taxStr + this.padLeft(this.formatMoney(taxAmount), WIDTH - taxStr.length) + '\n';
    }
    
    // Total
    const totalWithTax = notaSettings.tax_rate > 0 
      ? showReceipt.total_amount + calculateTax(showReceipt.total_amount, notaSettings.tax_rate)
      : showReceipt.total_amount;
    
    printData += PrinterService.COMMANDS.BOLD_ON;
    const totalStr = 'TOTAL';
    printData += totalStr + this.padLeft(this.formatMoney(totalWithTax), WIDTH - totalStr.length) + '\n';
    printData += PrinterService.COMMANDS.BOLD_OFF;
    
    // Payment method
    printData += this.repeatChar('-', WIDTH) + '\n';
    const methodName = showReceipt.payment_method === 'cash' ? 'Tunai' : 
                      showReceipt.payment_method === 'qris' ? 'QRIS' : 'Kartu Debit';
    printData += 'Pembayaran: ' + methodName + '\n';
    
    // Footer
    printData += '\n';
    printData += PrinterService.COMMANDS.ALIGN_CENTER;
    printData += notaSettings.shop_name || 'Toko' + '\n';
    printData += notaSettings.footer_text || 'Terima kasih' + '\n';
    
    // Feed and cut
    printData += '\n\n';
    printData += PrinterService.COMMANDS.FEED_LINES(3);
    printData += PrinterService.COMMANDS.CUT_PARTIAL;
    
    return printData;
  }

  // Helper: Center text
  centerText(text, width) {
    const padding = Math.floor((width - this.stripAnsi(text).length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  }

  // Helper: Pad left
  padLeft(text, width) {
    const padding = Math.max(0, width - this.stripAnsi(text).length);
    return ' '.repeat(padding) + text;
  }

  // Helper: Pad both
  padBoth(text, width) {
    const stripped = this.stripAnsi(text);
    const padding = Math.max(0, width - stripped.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  // Helper: Repeat character
  repeatChar(char, count) {
    return char.repeat(count);
  }

  // Helper: Format money
  formatMoney(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
  }

  // Helper: Strip ANSI codes (simplified)
  stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }

  // Print receipt directly to Bluetooth printer
  async printReceipt(receiptData) {
    if (!this.isConnected || !this.writeCharacteristic) {
      throw new Error('Printer belum terhubung');
    }

    const printData = this.formatReceiptForPrinter(receiptData);
    await this.sendData(printData);
    return true;
  }
}

// Export singleton instance and class
const printerService = new PrinterService();
export default printerService;
export { PrinterService };

