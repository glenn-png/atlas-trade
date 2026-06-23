export function printHtml(title: string, subtitle: string, body: string): string {
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Atlas Trade</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      padding: 32px 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #1a1a2e;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .header-brand { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #555; margin-bottom: 4px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: 700; margin: 20px 0 10px; }
    h3 { font-size: 11px; font-weight: 700; margin: 0 0 6px; }
    .subtitle { font-size: 12px; color: #555; }
    .meta { font-size: 10px; color: #777; text-align: right; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-cell {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .summary-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #777; margin-bottom: 4px; }
    .summary-value { font-size: 18px; font-weight: 800; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 10.5px;
    }
    th {
      background: #f4f4f8;
      text-align: left;
      padding: 6px 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #ccc;
      border-top: 1px solid #ccc;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tfoot td {
      border-top: 2px solid #1a1a2e;
      border-bottom: none;
      padding-top: 8px;
      font-weight: 600;
    }
    .right { text-align: right; }
    .mono { font-family: 'Courier New', monospace; }
    .trade-section { margin-top: 24px; page-break-inside: avoid; }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .print-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 8px 18px;
      background: #1a1a2e;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      z-index: 100;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #999;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>

  <div class="header">
    <div>
      <div class="header-brand">Atlas Trade</div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
    </div>
    <div class="meta">Generated ${now}</div>
  </div>

  ${body}

  <div class="footer">
    <span>Atlas Trade — Confidential</span>
    <span>${title} &middot; ${now}</span>
  </div>
</body>
</html>`;
}

export function gbp(n: number): string {
  return `£${n.toFixed(2)}`;
}
