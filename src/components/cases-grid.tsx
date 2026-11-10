"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClassParams,
} from "ag-grid-community";
import type { CaseStatus } from "@/lib/cases";
import { StatusBadge } from "./case-ui";

ModuleRegistry.registerModules([AllCommunityModule]);

export type CaseRow = {
  id: string;
  item: string;
  buyer: string;
  amount: number;
  status: CaseStatus;
  atRisk: number;
  dispute: string;
  respondBy: string | null;
  agent: string;
  lastActivity: string | null;
  urgent: boolean;
};

const usd = (n: number) => (n ? `$${n.toFixed(2)}` : "-");
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

const theme = themeQuartz.withParams({
  fontFamily: "inherit",
  headerFontWeight: 600,
  headerBackgroundColor: "#f8fafc",
  rowHoverColor: "#eef2ff",
  accentColor: "#4f46e5",
  borderRadius: 12,
  wrapperBorderRadius: 12,
});

export function CasesGrid({ rows }: { rows: CaseRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const columns = useMemo<ColDef<CaseRow>[]>(
    () => [
      {
        field: "item",
        headerName: "Item",
        flex: 2,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<CaseRow>) => (
          <div className="leading-tight">
            <div className="font-medium">{p.data?.item}</div>
            <div className="font-mono text-xs text-neutral-500">{p.data?.id}</div>
          </div>
        ),
      },
      { field: "buyer", headerName: "Buyer", flex: 1, minWidth: 100 },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<CaseRow>) => (p.data ? <StatusBadge status={p.data.status} /> : null),
      },
      { field: "dispute", headerName: "Dispute", flex: 1, minWidth: 130 },
      { field: "agent", headerName: "Agent", flex: 1, minWidth: 150 },
      { field: "amount", headerName: "Amount", type: "rightAligned", width: 105, valueFormatter: (p) => usd(p.value) },
      {
        field: "atRisk",
        headerName: "At risk",
        type: "rightAligned",
        width: 105,
        valueFormatter: (p) => usd(p.value),
        cellClass: (p) => (p.value > 0 ? "font-semibold text-red-700 " : ""),
      },
      { field: "respondBy", headerName: "Respond by", width: 130, valueFormatter: (p) => date(p.value) },
    ],
    [],
  );

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items, buyers, statuses…"
        className="mb-3 w-full max-w-sm rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="h-[560px] w-full">
        <AgGridReact<CaseRow>
          theme={theme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          quickFilterText={search}
          rowHeight={56}
          getRowId={(p) => p.data.id}
          getRowStyle={(p: RowClassParams<CaseRow>) => (p.data?.urgent ? { boxShadow: "inset 3px 0 0 #dc2626" } : undefined)}
          onRowClicked={(e) => e.data && router.push(`/cases/${e.data.id}`)}
          rowStyle={{ cursor: "pointer" }}
          overlayNoRowsTemplate="No cases match your search."
        />
      </div>
    </div>
  );
}
