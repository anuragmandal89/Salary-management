"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountryName } from "@/lib/countries";

interface Props {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

const ALL = "__all__";

export function EmployeesFilters({ countries, departments, jobTitles }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // Selects read from URL directly (URL is the source of truth). Only the
  // text input needs local state because users type before submitting.
  const country = params.get("country") ?? ALL;
  const department = params.get("department") ?? ALL;
  const jobTitle = params.get("jobTitle") ?? ALL;
  const [q, setQ] = useState(params.get("q") ?? "");

  const navigate = (overrides: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "" || v === ALL) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // any filter change resets to page 1
    const qs = next.toString();
    startTransition(() =>
      router.replace(qs ? `/employees?${qs}` : "/employees")
    );
  };

  const clear = () => {
    setQ("");
    startTransition(() => router.replace("/employees"));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ q });
      }}
      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto]"
    >
      <Input
        placeholder="Search name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Select
        value={country}
        onValueChange={(v) => navigate({ country: v ?? ALL })}
      >
        <SelectTrigger className="md:w-44">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All countries</SelectItem>
          {countries.map((c) => (
            <SelectItem key={c} value={c}>
              {getCountryName(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={department}
        onValueChange={(v) => navigate({ department: v ?? ALL })}
      >
        <SelectTrigger className="md:w-44">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={jobTitle}
        onValueChange={(v) => navigate({ jobTitle: v ?? ALL })}
      >
        <SelectTrigger className="md:w-56">
          <SelectValue placeholder="Job title" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL}>All titles</SelectItem>
          {jobTitles.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Search</Button>
      <Button type="button" variant="ghost" onClick={clear}>
        Clear
      </Button>
    </form>
  );
}
