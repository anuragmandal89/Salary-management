"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountryName } from "@/lib/countries";

interface Props {
  countries: { code: string; count: number }[];
  value: string;
}

export function CountryPicker({ countries, value }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const update = (next: string | null) => {
    if (!next) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("country", next);
    startTransition(() => router.replace(`/insights?${sp.toString()}`));
  };

  return (
    <Select value={value} onValueChange={update}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {getCountryName(c.code)} ({c.count.toLocaleString()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
