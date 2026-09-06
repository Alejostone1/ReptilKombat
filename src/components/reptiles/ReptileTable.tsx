"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import type { Reptil, EstadoBalance } from "@/types/reptile";
import { AffinityBadge } from "@/components/affinities/AffinityBadge";
import { BalanceStatusBadge } from "@/components/ui/BalanceStatusBadge";
import { ReptileImage } from "./ReptileImage";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { STAT_LABELS, type StatKey } from "@/lib/game-engine/stat-labels";

function statHeader(key: StatKey) {
  const label = STAT_LABELS[key];
  return <span title={`${label.largo} (${label.corto})`}>{label.corto}</span>;
}

interface Row extends Reptil {
  estado: EstadoBalance;
}

const columnHelper = createColumnHelper<Row>();

export function ReptileTable({ data }: { data: Row[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "bst", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "imagen",
        header: "",
        cell: (info) => (
          <Link href={`/reptiles/${info.row.original.id}`}>
            <ReptileImage
              nombre={info.row.original.nombre}
              nombreCientifico={info.row.original.nombreCientifico}
              className="h-10 w-10 rounded-md"
            />
          </Link>
        ),
      }),
      columnHelper.accessor("nombre", {
        header: "Nombre",
        cell: (info) => (
          <Link href={`/reptiles/${info.row.original.id}`} className="font-medium text-foreground hover:text-reptile-green">
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("nombreCientifico", {
        header: "Nombre científico",
        cell: (info) => <span className="italic text-foreground-muted">{info.getValue()}</span>,
      }),
      columnHelper.accessor("familia", { header: "Familia" }),
      columnHelper.accessor("afinidad", {
        header: "Afinidad",
        cell: (info) => <AffinityBadge afinidad={info.getValue()} />,
      }),
      columnHelper.accessor("rolTactico", { header: "Rol" }),
      columnHelper.accessor("hp", { header: () => statHeader("hp") }),
      columnHelper.accessor("atk", { header: () => statHeader("atk") }),
      columnHelper.accessor("def", { header: () => statHeader("def") }),
      columnHelper.accessor("spd", { header: () => statHeader("spd") }),
      columnHelper.accessor("inst", { header: () => statHeader("inst") }),
      columnHelper.accessor("adp", { header: () => statHeader("adp") }),
      columnHelper.accessor("bst", {
        header: "BST",
        cell: (info) => <span className="font-mono font-semibold text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor("estado", {
        header: "Estado",
        cell: (info) => <BalanceStatusBadge estado={info.getValue()} />,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-panel-secondary">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted hover:text-foreground"
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        (sortDir === "asc" ? (
                          <ArrowUp size={12} />
                        ) : sortDir === "desc" ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-30" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border-subtle hover:bg-panel-secondary/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
