export interface ReceiptData {
  storeName: string
  cashierName: string
  date: string
  items: { name: string; qty: number; price: number }[]
  total: number
  paymentMethod?: 'cash' | 'transfer'
  amountPaid?: number
  change?: number
}

interface PrintResult {
  success: boolean
  message: string
  method: 'usb' | 'download' | 'error'
}

function formatReceipt(data: ReceiptData): string {
  const line = '--------------------------------'
  const pad = (left: string, right: string, width = 32) => {
    const space = width - left.length - right.length
    return left + ' '.repeat(Math.max(space, 1)) + right
  }
  const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')

  const lines: string[] = []
  
  // Header
  lines.push('')
  lines.push(data.storeName.toUpperCase().padStart(Math.floor((32 + data.storeName.length) / 2)))
  lines.push(line)
  lines.push(`Kasir : ${data.cashierName}`)
  lines.push(`Waktu : ${data.date}`)
  lines.push(line)
  
  // Items
  data.items.forEach(item => {
    lines.push(item.name.substring(0, 32))
    lines.push(pad(`  ${item.qty} x ${currency(item.price)}`, currency(item.qty * item.price)))
  })
  
  lines.push(line)
  lines.push(pad('TOTAL', currency(data.total)))
  
  // Payment info
  if (data.paymentMethod) {
    lines.push('')
    lines.push(`Metode: ${data.paymentMethod === 'cash' ? 'Tunai' : 'Transfer'}`)
    if (data.amountPaid) {
      lines.push(pad('Bayar', currency(data.amountPaid)))
    }
    if (data.change && data.change > 0) {
      lines.push(pad('Kembali', currency(data.change)))
    }
  }
  
  lines.push(line)
  lines.push('     Terima kasih!     ')
  lines.push('  Koperasi Gym POS    ')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

function downloadReceipt(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function isWebSerialSupported(): boolean {
  return 'serial' in navigator
}

export async function printThermalUSB(data: ReceiptData): Promise<PrintResult> {
  // Check browser support
  if (!isWebSerialSupported()) {
    // Fallback: download as text file
    const text = formatReceipt(data)
    downloadReceipt(text, `struk-${Date.now()}.txt`)
    return {
      success: true,
      message: 'Browser tidak mendukung printer USB. Struk diunduh sebagai file teks.',
      method: 'download'
    }
  }

  try {
    const serial = (navigator as any).serial
    
    // Request port with timeout
    const port = await Promise.race([
      serial.requestPort(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Tidak ada printer yang dipilih')), 10000)
      )
    ]) as any

    if (!port) {
      throw new Error('Tidak ada printer yang dipilih')
    }

    // Open port
    await port.open({ baudRate: 9600 })

    const text = formatReceipt(data)
    const encoder = new TextEncoder()
    const writer = port.writable.getWriter()

    try {
      // ESC/POS commands
      // Initialize printer
      await writer.write(new Uint8Array([0x1b, 0x40]))
      
      // Set encoding to UTF-8 (if supported)
      await writer.write(new Uint8Array([0x1b, 0x74, 0x00]))
      
      // Write text
      await writer.write(encoder.encode(text))
      
      // Feed paper
      await writer.write(new Uint8Array([0x0a, 0x0a, 0x0a]))
      
      // Cut paper (partial cut)
      await writer.write(new Uint8Array([0x1d, 0x56, 0x42, 0x00]))
      
      return {
        success: true,
        message: 'Struk berhasil dicetak!',
        method: 'usb'
      }
    } catch (writeError) {
      throw new Error(`Gagal menulis ke printer: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`)
    } finally {
      writer.releaseLock()
      await port.close()
    }
  } catch (error) {
    // On error, fallback to download
    const text = formatReceipt(data)
    downloadReceipt(text, `struk-${Date.now()}.txt`)
    
    return {
      success: true,
      message: `Printer error: ${error instanceof Error ? error.message : 'Unknown error'}. Struk diunduh sebagai file teks.`,
      method: 'download'
    }
  }
}

export function formatReceiptHTML(data: ReceiptData): string {
  const currency = (n: number) => 'Rp' + n.toLocaleString('id-ID')
  
  return `
    <div style="font-family: 'Courier New', monospace; width: 300px; padding: 20px; background: white; color: black;">
      <h2 style="text-align: center; margin: 0 0 10px 0; font-size: 18px;">${data.storeName.toUpperCase()}</h2>
      <hr style="border: 1px dashed black; margin: 10px 0;">
      <p style="margin: 5px 0; font-size: 12px;">Kasir: ${data.cashierName}</p>
      <p style="margin: 5px 0; font-size: 12px;">Waktu: ${data.date}</p>
      <hr style="border: 1px dashed black; margin: 10px 0;">
      
      ${data.items.map(item => `
        <div style="margin: 10px 0;">
          <p style="margin: 0; font-size: 12px;">${item.name}</p>
          <p style="margin: 0; font-size: 12px; display: flex; justify-content: space-between;">
            <span>${item.qty} x ${currency(item.price)}</span>
            <span>${currency(item.qty * item.price)}</span>
          </p>
        </div>
      `).join('')}
      
      <hr style="border: 1px dashed black; margin: 10px 0;">
      <p style="margin: 5px 0; font-size: 14px; font-weight: bold; display: flex; justify-content: space-between;">
        <span>TOTAL</span>
        <span>${currency(data.total)}</span>
      </p>
      
      ${data.paymentMethod ? `
        <p style="margin: 10px 0 5px 0; font-size: 12px;">Metode: ${data.paymentMethod === 'cash' ? 'Tunai' : 'Transfer'}</p>
        ${data.amountPaid ? `<p style="margin: 5px 0; font-size: 12px; display: flex; justify-content: space-between;"><span>Bayar:</span><span>${currency(data.amountPaid)}</span></p>` : ''}
        ${data.change && data.change > 0 ? `<p style="margin: 5px 0; font-size: 12px; display: flex; justify-content: space-between;"><span>Kembali:</span><span>${currency(data.change)}</span></p>` : ''}
      ` : ''}
      
      <hr style="border: 1px dashed black; margin: 10px 0;">
      <p style="text-align: center; margin: 10px 0; font-size: 12px;">Terima kasih!</p>
      <p style="text-align: center; margin: 0; font-size: 10px;">Koperasi Gym POS</p>
    </div>
  `
}

export function printWindow(content: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Popup blocker mencegah membuka jendela print')
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Struk</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">Tutup</button>
        </div>
      </body>
    </html>
  `)
  printWindow.document.close()
}
