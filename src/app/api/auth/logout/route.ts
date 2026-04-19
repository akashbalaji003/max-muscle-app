import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out' });
  req.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
  });
  return response;
}
