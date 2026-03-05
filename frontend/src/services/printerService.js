// Printer Service - Using Capacitor Bluetooth LE Plugin
// More stable and reliable than Web Bluetooth API

import { BluetoothLe } from '@capacitor-community/bluetooth-le';

class PrinterService {
  constructor() {
    this.deviceId = null;
    this.deviceName = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.writeChar = null;
  }

  // Initialize Bluetooth LE
  async initialize() {
    try {
      await BluetoothLe.initialize();
      this.isInitialized = true;
      console.log('Bluetooth LE initialized');
      return true;
    } catch (error) {
      console.error('Error initializing Bluetooth:', error);
      return false;
    }
  }

  // Check if Bluetooth is supported
  async isBluetoothSupported() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      const status = await BluetoothLe.getAdapterStatus();
      return status.isSupported;
    } catch (error) {
      console.error('Bluetooth support check error:', error);
      return false;
    }
  }

  // Check if Bluetooth is enabled
  async isBluetoothEnabled() {
    try {
      const status = await BluetoothLe.getAdapterStatus();
      return status.isEnabled;
    } catch (error) {
      console.error('Bluetooth enabled check error:', error);
      return false;
    }
  }

  // Request Bluetooth enable
  async requestEnable() {
    try {
      await BluetoothLe.requestEnable();
      return true;
    } catch (error) {
      console.error('Request enable error:', error);
      return false;
    }
  }

  // Request device permission (Android 12+)
  async requestPermissions() {
    try {
      const result = await BluetoothLe.requestPermissions();
      return result.bluetoothScan || result.bluetoothConnect ? true : false;
    } catch (error) {
      console.error('Request permissions error:', error);
      return false;
    }
  }

  // Scan for devices
  async scanDevices() {
    try {
      await this.requestPermissions();
      
      const enabled = await this.isBluetoothEnabled();
      if (!enabled) {
        const requested = await this.requestEnable();
        if (!requested) {
          throw new Error('Bluetooth tidak diaktifkan');
        }
      }

      const devices = await BluetoothLe.requestDevice({
        services: [],
        allowDuplicates: false,
      });
      
      return devices;
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  // Connect to device
  async connect(deviceId) {
    try {
      await BluetoothLe.connect({ deviceId });
      this.deviceId = deviceId;
      this.isConnected = true;
      console.log('Connected to device:', deviceId);
      return true;
    } catch (error) {
      console.error('Connect error:', error);
      throw error;
    }
  }

  // Disconnect from device
  async disconnect() {
    try {
      if (this.deviceId) {
        await BluetoothLe.disconnect({ deviceId: this.deviceId });
      }
      this.deviceId = null;
      this.deviceName = null;
      this.isConnected = false;
      this.writeChar = null;
      console.log('Disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  // Get services
  async getServices() {
    try {
      const services = await BluetoothLe.getServices({ deviceId: this.deviceId });
      return services;
    } catch (error) {
      console.error('Get services error:', error);
      throw error;
    }
  }

  // Get characteristics for a service
  async getCharacteristics(serviceUUID) {
    try {
      const characteristics = await BluetoothLe.getCharacteristics({
        deviceId: this.deviceId,
        service: serviceUUID,
      });
      return characteristics;
    } catch (error) {
      console.error('Get characteristics error:', error);
      throw error;
    }
  }

  // Write data to characteristic
  async writeData(serviceUUID, characteristicUUID, data) {
    try {
      await BluetoothLe.write({
        deviceId: this.deviceId,
        service: serviceUUID,
        characteristic: characteristicUUID,
        value: this.arrayBufferToBase64(data),
      });
      return true;
    } catch (error) {
      console.error('Write error:', error);
      throw error;
    }
  }

  // Find write characteristic in a service
  async findWriteCharacteristic(serviceUUID) {
    try {
      const characteristics = await this.getCharacteristics(serviceUUID);
      
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          return {
            uuid: char.uuid,
            write: char.properties.write,
            writeWithoutResponse: char.properties.writeWithoutResponse,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Find write characteristic error:', error);
      return null;
    }
  }

  // Common thermal printer service UUIDs
  static get PRINTER_SERVICE_UUIDS() {
    return [
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000fee7-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9f9d9712ce446',
    ];
  }

  // Connect to printer with auto-discovery
  async connectToPrinter() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const device = await this.scanDevices();
      
      if (!device || !device.deviceId) {
        throw new Error('Tidak ada perangkat yang dipilih');
      }

      this.deviceName = device.name || 'Printer Tidak Dikenal';

      await this.connect(device.deviceId);

      const services = await this.getServices();
      
      let writeChar = null;
      
      for (const serviceUUID of PrinterService.PRINTER_SERVICE_UUIDS) {
        const char = await this.findWriteCharacteristic(serviceUUID);
        if (char) {
          writeChar = { service: serviceUUID, ...char };
          break;
        }
      }

      if (!writeChar && services && services.length > 0) {
        for (const service of services) {
          const char = await this.findWriteCharacteristic(service.uuid);
          if (char) {
            writeChar = { service: service.uuid, ...char };
            break;
          }
        }
      }

      if (!writeChar) {
        throw new Error('Tidak dapat menemukan karakteristik yang dapat ditulis');
      }

      this.writeChar = writeChar;

      return {
        name: this.deviceName,
        connected: true,
        deviceId: this.deviceId,
      };
    } catch (error) {
      console.error('Connect to printer error:', error);
      await this.disconnect();
      throw error;
    }
  }

  // ESC/POS Commands
  static get COMMANDS() {
    return {
      INIT: '\x1b\x40',
      LF: '\x0a',
      CR: '\x0d',
      BOLD_ON: '\x1b\x45\x01',
      BOLD_OFF: '\x1b\x45\x00',
      UNDERLINE_ON: '\x1b\x2d\x01',
      UNDERLINE_OFF: '\x1b\x2d\x00',
      ALIGN_LEFT: '\x1b\x61\x00',
      ALIGN_CENTER: '\x1b\x61\x01',
      ALIGN_RIGHT: '\x1b\x61\x02',
      FONT_NORMAL: '\x1d\x21\x00',
      FONT_LARGE: '\x1d\x21\x01',
      FONT_LARGE2: '\x1d\x21\x11',
      CUT_PARTIAL: '\x1d\x56\x01',
      CUT_FULL: '\x1d\x56\x00',
      OPEN_DRAWER: '\x1b\x70\x00\x19\xfa',
      FEED_LINES: (n) => '\x1b\x64' + String.fromCharCode(n),
    };
  }

  // Convert ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Convert string to Uint8Array
  stringToUint8Array(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i);
    }
    return arr;
  }

  // Format receipt text for thermal printer
  formatReceiptForPrinter(receiptData) {
    const { notaSettings, showReceipt, calculateTax } = receiptData;
    const WIDTH = 32;
    
    let printData = '';
    
    printData += PrinterService.COMMANDS.INIT;
    printData += PrinterService.COMMANDS.FONT_NORMAL;
    printData += PrinterService.COMMANDS.ALIGN_CENTER;
    
    printData += PrinterService.COMMANDS.BOLD_ON;
    printData += this.centerText(notaSettings.shop_name || 'Toko', WIDTH) + '\n';
    printData += PrinterService.COMMANDS.BOLD_OFF;
    
    if (notaSettings.address) {
      printData += this.centerText(notaSettings.address, WIDTH) + '\n';
    }
    if (notaSettings.phone) {
      printData += this.centerText('Telp: ' + notaSettings.phone, WIDTH) + '\n';
    }
    
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    printData += PrinterService.COMMANDS.ALIGN_LEFT;
    printData += 'No. Pesanan: ' + showReceipt.order_number + '\n';
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    printData += PrinterService.COMMANDS.ALIGN_LEFT;
    showReceipt.items.forEach(item => {
      printData += `${item.product_name}\n`;
      printData += `x${item.quantity}  ${this.formatMoney(item.subtotal)}\n`;
    });
    
    printData += this.repeatChar('-', WIDTH) + '\n';
    
    const subtotalStr = 'Subtotal';
    printData += subtotalStr + this.padLeft(this.formatMoney(showReceipt.total_amount), WIDTH - subtotalStr.length) + '\n';
    
    if (notaSettings.tax_rate > 0) {
      const taxAmount = calculateTax(showReceipt.total_amount, notaSettings.tax_rate);
      const taxStr = `Pajak (${notaSettings.tax_rate}%)`;
      printData += taxStr + this.padLeft(this.formatMoney(taxAmount), WIDTH - taxStr.length) + '\n';
    }
    
    const totalWithTax = notaSettings.tax_rate > 0 
      ? showReceipt.total_amount + calculateTax(showReceipt.total_amount, notaSettings.tax_rate)
      : showReceipt.total_amount;
    
    printData += PrinterService.COMMANDS.BOLD_ON;
    const totalStr = 'TOTAL';
    printData += totalStr + this.padLeft(this.formatMoney(totalWithTax), WIDTH - totalStr.length) + '\n';
    printData += PrinterService.COMMANDS.BOLD_OFF;
    
    printData += this.repeatChar('-', WIDTH) + '\n';
    const methodName = showReceipt.payment_method === 'cash' ? 'Tunai' : 
                      showReceipt.payment_method === 'qris' ? 'QRIS' : 'Kartu Debit';
    printData += 'Pembayaran: ' + methodName + '\n';
    
    printData += '\n';
    printData += PrinterService.COMMANDS.ALIGN_CENTER;
    printData += notaSettings.shop_name || 'Toko' + '\n';
    printData += notaSettings.footer_text || 'Terima kasih' + '\n';
    
    printData += '\n\n';
    printData += PrinterService.COMMANDS.FEED_LINES(3);
    printData += PrinterService.COMMANDS.CUT_PARTIAL;
    
    return printData;
  }

  // Helper functions
  centerText(text, width) {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  }

  padLeft(text, width) {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
  }

  repeatChar(char, count) {
    return char.repeat(count);
  }

  formatMoney(amount) {
    return 'Rp' + new Intl.NumberFormat('id-ID').format(amount);
  }

  // Print receipt directly to Bluetooth printer
  async printReceipt(receiptData) {
    if (!this.isConnected || !this.writeChar) {
      throw new Error('Printer belum terhubung');
    }

    const printData = this.formatReceiptForPrinter(receiptData);
    const dataArray = this.stringToUint8Array(printData);
    const buffer = dataArray.buffer;
    
    await this.writeData(
      this.writeChar.service,
      this.writeChar.uuid,
      buffer
    );
    
    return true;
  }

  // Check connection status
  async checkConnection() {
    if (!this.deviceId) return false;
    
    try {
      const device = await BluetoothLe.getDevice({ deviceId: this.deviceId });
      return device && device.connected;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const printerService = new PrinterService();
export default printerService;
export { PrinterService };

