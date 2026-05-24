import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  /** Current search params (without `page`). */
  baseParams: URLSearchParams;
}

const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }));
const disabledClass = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "pointer-events-none opacity-50"
);

export function PaginationBar({ page, pageSize, total, baseParams }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const linkFor = (p: number) => {
    const next = new URLSearchParams(baseParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/employees?${qs}` : "/employees";
  };

  const prev = page > 1;
  const nextOk = page < pageCount;

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <div className="text-sm text-muted-foreground">
        {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {total.toLocaleString()}
      </div>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link href={linkFor(page - 1)} className={linkClass}>
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            Previous
          </span>
        )}
        <div className="text-sm tabular-nums">
          Page {page} of {pageCount.toLocaleString()}
        </div>
        {nextOk ? (
          <Link href={linkFor(page + 1)} className={linkClass}>
            Next
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled>
            Next
          </span>
        )}
      </div>
    </div>
  );
}
