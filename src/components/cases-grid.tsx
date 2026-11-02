"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
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

const lightTheme = themeQuartz.withParams({ fontFamily: "inherit", headerFontWeight: 500, rowHoverColor: "rgba(0,0,0,0.03)" });
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams({ fontFamily: "inherit", headerFontWeight: 500 });

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(media.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export function CasesGrid({ rows }: { rows: CaseRow[] }) {
  const router = useRouter();
  const dark = useDarkMode();
  const [search, setSearch] = useState("");

  const columns = useMemo<ColDef<CaseRow>[]>(
    () => [
      {
        field: "item",
        headerName: "Item",
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<CaseRow>) => (
          <div className="leading-tight">
            <div className="font-medium">{p.data?.item}</div>
            <div className="font-mono text-xs text-neutral-500">{p.data?.id}</div>
          </div>
        ),
      },
      { field: "buyer", headerName: "Buyer", flex: 1, minWidth: 120 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 170,
        cellRenderer: (p: ICellRendererParams<CaseRow>) => (p.data ? <StatusBadge status={p.data.status} /> : null),
      },
      { field: "dispute", headerName: "Dispute", minWidth: 150 },
      { field: "agent", headerName: "Agent", minWidth: 190 },
      { field: "amount", headerName: "Amount", type: "rightAligned", minWidth: 110, valueFormatter: (p) => usd(p.value) },
      {
        field: "atRisk",
        headerName: "At risk",
        type: "rightAligned",
        minWidth: 110,
        valueFormatter: (p) => usd(p.value),
        cellClass: (p) => (p.value > 0 ? "font-semibold text-red-700 dark:text-red-300" : ""),
      },
      { field: "respondBy", headerName: "Respond by", minWidth: 140, valueFormatter: (p) => date(p.value) },
      { field: "lastActivity", headerName: "Last activity", minWidth: 140, valueFormatter: (p) => date(p.value) },
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
        className="mb-3 w-full max-w-sm rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />
      <div className="h-[560px] w-full">
        <AgGridReact<CaseRow>
          theme={dark ? darkTheme : lightTheme}
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
