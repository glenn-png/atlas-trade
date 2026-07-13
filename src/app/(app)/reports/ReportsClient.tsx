"use client";

import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";

interface ReportsClientProps {
  defaultFrom: string;
  defaultTo: string;
}

function DateRange({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="bg-navy-900 border border-white/12 rounded-[6px] text-white text-[12px] px-2.5 py-1.5 outline-none focus:border-accent"
      />
      <span className="text-slate-500 text-[12px]">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="bg-navy-900 border border-white/12 rounded-[6px] text-white text-[12px] px-2.5 py-1.5 outline-none focus:border-accent"
      />
    </div>
  );
}

interface ReportCardProps {
  title: string;
  description: string;
  sheets?: string[];
  hasDateRange?: boolean;
  from?: string;
  to?: string;
  onFromChange?: (v: string) => void;
  onToChange?: (v: string) => void;
  excelHref: string;
  printHref?: string;
}

function ReportCard({
  title, description, sheets, hasDateRange,
  from, to, onFromChange, onToChange,
  excelHref, printHref,
}: ReportCardProps) {
  return (
    <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[14px] font-bold text-white mb-1">{title}</div>
          <div className="text-[12px] text-slate-400 mb-3">{description}</div>

          {sheets && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {sheets.map((s) => (
                <span key={s} className="text-[10px] bg-navy-900 border border-white/7 text-slate-400 px-2 py-0.5 rounded font-mono">
                  {s}
                </span>
              ))}
            </div>
          )}

          {hasDateRange && from !== undefined && to !== undefined && onFromChange && onToChange && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Date range</div>
              <DateRange from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/7">
        <a
          href={excelHref}
          className="flex items-center gap-1.5 px-3 py-2 bg-success/10 border border-success/20 text-success text-[12px] font-semibold rounded-[6px] hover:bg-success/20 transition-colors"
        >
          <FileSpreadsheet size={13} />
          Download Excel
        </a>
        {printHref && (
          <a
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 border border-warning/25 text-warning text-[12px] font-semibold rounded-[6px] hover:bg-warning/20 transition-colors"
          >
            <Printer size={13} />
            Print / Save PDF
          </a>
        )}
      </div>
    </div>
  );
}

export function ReportsClient({ defaultFrom, defaultTo }: ReportsClientProps) {
  const [tradesFrom, setTradesFrom] = useState(defaultFrom);
  const [tradesTo, setTradesTo] = useState(defaultTo);
  const [vatFrom, setVatFrom] = useState(defaultFrom);
  const [vatTo, setVatTo] = useState(defaultTo);
  const [splitFrom, setSplitFrom] = useState(defaultFrom);
  const [splitTo, setSplitTo] = useState(defaultTo);
  const [inventoryStatus, setInventoryStatus] = useState("IN_STOCK");

  const tradesExcel = `/api/reports/trades?from=${tradesFrom}&to=${tradesTo}`;
  const vatExcel = `/api/reports/vat?from=${vatFrom}&to=${vatTo}`;
  const splitExcel = `/api/reports/payment-split?from=${splitFrom}&to=${splitTo}`;
  const inventoryExcel = `/api/reports/inventory?status=${inventoryStatus}`;
  const valuationExcel = `/api/reports/valuation`;

  return (
    <div className="space-y-4">

      {/* Section label */}
      <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">Available Reports</div>

      {/* Trade History */}
      <ReportCard
        title="Trade History"
        description="All trades in the selected date range with individual card breakdown."
        sheets={["Trade Summary", "Cards"]}
        hasDateRange
        from={tradesFrom}
        to={tradesTo}
        onFromChange={setTradesFrom}
        onToChange={setTradesTo}
        excelHref={tradesExcel}
        printHref={`/api/reports/print/trades?from=${tradesFrom}&to=${tradesTo}`}
      />

      {/* Purchase vs Credit Split */}
      <ReportCard
        title="Purchase vs Credit Split"
        description="Breakdown of trades by payment type — how much you paid out as purchase vs store credit, and the proportion of each."
        sheets={["Summary", "All Trades"]}
        hasDateRange
        from={splitFrom}
        to={splitTo}
        onFromChange={setSplitFrom}
        onToChange={setSplitTo}
        excelHref={splitExcel}
        printHref={`/api/reports/print/payment-split?from=${splitFrom}&to=${splitTo}`}
      />

      {/* Inventory */}
      <div className="bg-navy-800 border border-white/7 rounded-[10px] p-5">
        <div className="text-[14px] font-bold text-white mb-1">Inventory Report</div>
        <div className="text-[12px] text-slate-400 mb-3">
          Full card list with purchase prices, market values, and margin estimates.
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {["Inventory"].map((s) => (
            <span key={s} className="text-[10px] bg-navy-900 border border-white/7 text-slate-400 px-2 py-0.5 rounded font-mono">{s}</span>
          ))}
        </div>
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Stock filter</div>
          <div className="flex gap-2">
            {[
              { value: "IN_STOCK", label: "In Stock" },
              { value: "SOLD", label: "Sold" },
              { value: "ALL", label: "All Cards" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setInventoryStatus(value)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors border ${
                  inventoryStatus === value
                    ? "bg-accent text-white border-transparent"
                    : "bg-navy-900 text-slate-300 border-white/7 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-white/7">
          <a
            href={inventoryExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-success/10 border border-success/20 text-success text-[12px] font-semibold rounded-[6px] hover:bg-success/20 transition-colors"
          >
            <FileSpreadsheet size={13} />
            Download Excel
          </a>
          <a
            href={`/api/reports/print/inventory?status=${inventoryStatus}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 border border-warning/25 text-warning text-[12px] font-semibold rounded-[6px] hover:bg-warning/20 transition-colors"
          >
            <Printer size={13} />
            Print / Save PDF
          </a>
        </div>
      </div>

      {/* VAT Summary */}
      <ReportCard
        title="VAT Summary"
        description="Quarterly VAT breakdown for HMRC. Includes purchases, MS-Singles sales, margin, and VAT due. Three sheets: summary, daily sales log, purchase log."
        sheets={["VAT Summary", "Sales Log", "Purchase Log"]}
        hasDateRange
        from={vatFrom}
        to={vatTo}
        onFromChange={setVatFrom}
        onToChange={setVatTo}
        excelHref={vatExcel}
        printHref={`/api/reports/print/vat?from=${vatFrom}&to=${vatTo}`}
      />

      {/* Stock Valuation */}
      <ReportCard
        title="Stock Valuation"
        description="Point-in-time snapshot of current stock value at cost and at market. Includes unrealised gain per card."
        sheets={["Summary", "Stock Detail"]}
        excelHref={valuationExcel}
        printHref="/api/reports/print/valuation"
      />

    </div>
  );
}
