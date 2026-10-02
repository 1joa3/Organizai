"use client";

import { useRouter, usePathname } from "next/navigation";
import Select from "./Select";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface PeriodSelectorProps {
  month: number;
  year: number;
}

export default function PeriodSelector({ month, year }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(nextMonth: number, nextYear: number) {
    router.push(`${pathname}?month=${nextMonth}&year=${nextYear}`);
  }

  const years = Array.from({ length: 6 }, (_, i) => year + 2 - i);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-[140px] sm:flex-none sm:w-40">
        <Select
          value={String(month)}
          onChange={(e) => navigate(Number(e.target.value), year)}
          options={MONTHS.map((label, i) => ({ value: String(i + 1), label }))}
        />
      </div>
      <div className="flex-1 min-w-[100px] sm:flex-none sm:w-28">
        <Select
          value={String(year)}
          onChange={(e) => navigate(month, Number(e.target.value))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>
    </div>
  );
}
