import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

// GET /api/qr — return the gym check-in QR code as a data URL
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const checkInUrl = `${appUrl}/checkin`;

  const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#0f0f0f', light: '#ffffff' },
  });

  return NextResponse.json({ qr: qrDataUrl, url: checkInUrl });
}
