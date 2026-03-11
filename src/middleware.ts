import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REDIRECT_TO = process.env.REDIRECT_TO?.trim();

export function middleware(request: NextRequest) {
  if (!REDIRECT_TO) return NextResponse.next();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="5;url=${REDIRECT_TO}">
  <title>Artie has moved!</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 480px; margin: 60px auto; padding: 24px; text-align: center; background: #f5f5f5; }
    h1 { font-size: 1.6em; color: #1a1a1a; }
    p { color: #555; line-height: 1.6; }
    a.btn { display: inline-block; margin: 16px 0; padding: 14px 28px; background: #1B2A4A; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1em; }
    .steps { text-align: left; background: white; border-radius: 12px; padding: 20px 24px; margin-top: 24px; }
    .steps h2 { font-size: 1em; margin-top: 0; }
    .steps ol { padding-left: 20px; color: #333; }
    .steps li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>🚀 Artie has a new home!</h1>
  <p>We've moved to a faster, more reliable server. You'll be redirected automatically in 5 seconds.</p>
  <a class="btn" href="${REDIRECT_TO}">Go to new Artie →</a>
  <div class="steps">
    <h2>📱 Re-add to your Home Screen:</h2>
    <ol>
      <li>Tap the button above to open the new site</li>
      <li>Tap the <strong>Share</strong> button (box with arrow ↑) in Safari</li>
      <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
      <li>Tap <strong>Add</strong> — done!</li>
    </ol>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
