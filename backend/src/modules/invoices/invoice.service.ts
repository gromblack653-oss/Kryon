import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { query } from '../../db/pool';
import { NotFoundError } from '../../utils/errors';
import { OrderStatus } from '../../types';

interface InvoiceOrder {
  id: string;
  status: OrderStatus;
  total_cents: number;
  shipping_address: string;
  delivery_method: 'np_warehouse' | 'np_courier' | 'pickup';
  recipient_name: string | null;
  recipient_phone: string | null;
  ttn: string | null;
  payment_method: 'card' | 'cod';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
}

const DELIVERY_LABELS: Record<InvoiceOrder['delivery_method'], string> = {
  np_warehouse: 'Нова Пошта — відділення',
  np_courier: 'Нова Пошта — курʼєр',
  pickup: 'Самовивіз',
};

const PAYMENT_LABELS: Record<InvoiceOrder['payment_method'], string> = {
  card: 'Картка онлайн',
  cod: 'Накладений платіж',
};

const PAYMENT_STATUS_LABELS: Record<InvoiceOrder['payment_status'], string> = {
  unpaid: 'не оплачено',
  pending: 'очікує оплати',
  paid: 'оплачено',
  failed: 'оплата не пройшла',
  refunded: 'повернено',
};

interface InvoiceItem {
  title: string;
  price_cents: number;
  quantity: number;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Очікує оплати',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано',
};

/** Знаходить кириличний шрифт у кількох можливих локаціях (dev/prod). */
function resolveFont(): string {
  const candidates = [
    path.resolve(__dirname, '../../assets/fonts/DejaVuSans.ttf'),
    path.resolve(process.cwd(), 'src/assets/fonts/DejaVuSans.ttf'),
    path.resolve(process.cwd(), 'assets/fonts/DejaVuSans.ttf'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Cyrillic font DejaVuSans.ttf not found');
  return found;
}

function uah(cents: number): string {
  return `${(cents / 100).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
}

async function loadOrder(orderId: string): Promise<{ order: InvoiceOrder; items: InvoiceItem[] }> {
  const orders = await query<InvoiceOrder>(
    `SELECT o.id, o.status, o.total_cents, o.shipping_address, o.created_at,
            o.delivery_method, o.recipient_name, o.recipient_phone, o.ttn,
            o.payment_method, o.payment_status,
            u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [orderId],
  );
  const order = orders[0];
  if (!order) throw new NotFoundError('Order not found');
  const items = await query<InvoiceItem>(
    `SELECT title, price_cents, quantity FROM order_items WHERE order_id = $1 ORDER BY title`,
    [orderId],
  );
  return { order, items };
}

/**
 * Генерує PDF-накладну для замовлення й повертає готовий документ (stream).
 * Викликач пайпить його у res.
 */
export async function buildInvoicePdf(orderId: string): Promise<PDFKit.PDFDocument> {
  const { order, items } = await loadOrder(orderId);
  const font = resolveFont();

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.registerFont('main', font);
  doc.font('main');

  const num = order.id.slice(0, 8).toUpperCase();
  const date = new Date(order.created_at).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // --- Шапка ---
  doc.fontSize(20).fillColor('#4f46e5').text('Kryon', { continued: false });
  doc.fontSize(9).fillColor('#666').text('Інтернет-магазин відеокарт · kryon.ua', { paragraphGap: 2 });
  doc.moveDown(1.2);

  doc.fillColor('#111').fontSize(16).text(`Видаткова накладна № ${num}`);
  doc.fontSize(10).fillColor('#444').text(`від ${date}`);
  doc.fontSize(10).fillColor('#444').text(`Статус: ${STATUS_LABELS[order.status]}`);
  doc.moveDown(1);

  // --- Покупець ---
  doc.fontSize(11).fillColor('#111').text('Отримувач:');
  doc.fontSize(10).fillColor('#333')
    .text(order.recipient_name ?? order.customer_name)
    .text(`Email: ${order.customer_email}`)
    .text(`Телефон: ${order.recipient_phone ?? order.customer_phone ?? '—'}`);
  doc.moveDown(0.6);

  // --- Доставка й оплата ---
  doc.fontSize(11).fillColor('#111').text('Доставка та оплата:');
  doc.fontSize(10).fillColor('#333')
    .text(`Спосіб доставки: ${DELIVERY_LABELS[order.delivery_method]}`)
    .text(`Адреса: ${order.shipping_address}`);
  if (order.ttn) doc.text(`Номер накладної НП: ${order.ttn}`);
  doc.text(
    `Оплата: ${PAYMENT_LABELS[order.payment_method]} (${PAYMENT_STATUS_LABELS[order.payment_status]})`,
  );
  doc.moveDown(1);

  // --- Таблиця позицій ---
  const startX = 50;
  const colNum = startX;
  const colTitle = startX + 30;
  const colQty = 330;
  const colPrice = 390;
  const colSum = 480;
  const rowH = 22;

  function drawHeader(y: number) {
    doc.rect(startX, y - 4, 495, rowH).fill('#f1f0fb');
    doc.fillColor('#4f46e5').fontSize(9);
    doc.text('№', colNum + 4, y, { width: 24 });
    doc.text('Найменування', colTitle + 4, y, { width: colQty - colTitle - 8 });
    doc.text('К-сть', colQty, y, { width: 50 });
    doc.text('Ціна', colPrice, y, { width: 80 });
    doc.text('Сума', colSum, y, { width: 65, align: 'right' });
  }

  let y = doc.y + 6;
  drawHeader(y);
  y += rowH;

  doc.fontSize(9).fillColor('#222');
  items.forEach((it, i) => {
    if (y > 720) {
      doc.addPage();
      y = 60;
      drawHeader(y);
      y += rowH;
      doc.fontSize(9).fillColor('#222');
    }
    doc.text(String(i + 1), colNum + 4, y, { width: 24 });
    doc.text(it.title, colTitle + 4, y, { width: colQty - colTitle - 8 });
    doc.text(String(it.quantity), colQty, y, { width: 50 });
    doc.text(uah(it.price_cents), colPrice, y, { width: 80 });
    doc.text(uah(it.price_cents * it.quantity), colSum, y, { width: 65, align: 'right' });
    y += rowH;
    doc.moveTo(startX, y - 4).lineTo(startX + 495, y - 4).strokeColor('#eee').stroke();
  });

  // --- Разом ---
  y += 6;
  doc.fontSize(12).fillColor('#111').text('Разом до сплати:', colPrice - 60, y, { width: 130 });
  doc.fontSize(12).fillColor('#4f46e5').text(uah(order.total_cents), colSum - 40, y, { width: 105, align: 'right' });

  // --- Підпис ---
  doc.moveDown(4);
  doc.fontSize(9).fillColor('#666')
    .text('Склав(ла): ______________________', 50, doc.y)
    .moveDown(0.5)
    .text('Отримав(ла): ______________________');

  // doc.end() викликає роут ПІСЛЯ pipe(res) — правильний порядок для pdfkit.
  return doc;
}

/** Короткий номер накладної для імені файлу. */
export function invoiceNumber(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}
