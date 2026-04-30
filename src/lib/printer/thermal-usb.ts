export interface ReceiptData {
  storeName: string
  cashierName: string
  date: string
  items: { name: string; qty: number; price: number }[]
  total: number
}

function formatReceipt(data: ReceiptData): string {
  const line = '--------------------------------'
  const pad = (left: string, right: string, width = 32) => {
    const space = width - left.length - right.length
    return left + ' '.repeat(Math.max(space, 1)) + right
  }
  const currency = (n: number) =>
    'Rp' + n.toLocaleString('id-ID')

  const lines = [
    data.storeName.toUpperCase().padStart(32 - Math.floor((32 - data.storeName.length) / 2)),
    line,
    `Kasir : ${data.cashierName}`,
    `Waktu : ${data.date}`,
    line,
    ...data.items.map(item =>
      `${item.name}\n${pad(`  ${item.qty} x ${currency(item.price)}`, currency(item.qty * item.price))}`
    ),
    line,
    pad('TOTAL', currency(data.total)),
    line,
    '      Terima kasih!      ',
    '',
    '',
  ]

  return lines.join('\n')
}

export async function printThermalUSB(data: ReceiptData): Promise<void> {
  const serial = (navigator as unknown as { serial?: { requestPort: () => Promise<unknown> } }).serial
  if (!serial) {
    throw new Error('Web Serial API tidak didukung di browser ini. Gunakan Chrome atau Edge.')
  }

  const port = await serial.requestPort() as {
    open: (opts: { baudRate: number }) => Promise<void>
    writable: { getWriter: () => { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void } }
    close: () => Promise<void>
  }

  await port.open({ baudRate: 9600 })

  const text = formatReceipt(data)
  const writer = port.writable.getWriter()

  try {
    // ESC/POS initialize
    await writer.write(new Uint8Array([0x1b, 0x40]))
    await writer.write(new TextEncoder().encode(text))
    // Cut paper (partial cut)
    await writer.write(new Uint8Array([0x1d, 0x56, 0x42, 0x00]))
  } finally {
    writer.releaseLock()
    await port.close()
  }
}
