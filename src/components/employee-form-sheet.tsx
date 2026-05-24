"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, getCurrency } from "@/lib/countries";
import { employeeCreateSchema, EMPLOYMENT_TYPES } from "@/lib/validation";
import type { SerializedEmployee } from "@/lib/serialize";

const formSchema = employeeCreateSchema;
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing employee for edit mode; omit for create. */
  employee?: SerializedEmployee;
}

const employmentLabels: Record<(typeof EMPLOYMENT_TYPES)[number], string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

function defaultValues(employee?: SerializedEmployee): FormValues {
  if (employee) {
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      jobTitle: employee.jobTitle,
      department: employee.department,
      country: employee.country,
      salary: employee.salary,
      currency: employee.currency,
      employmentType: employee.employmentType as FormValues["employmentType"],
      hireDate: employee.hireDate,
    };
  }
  return {
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    department: "",
    country: "US",
    salary: 100_000,
    currency: "USD",
    employmentType: "FULL_TIME",
    hireDate: new Date().toISOString().slice(0, 10),
  };
}

export function EmployeeFormSheet({ open, onOpenChange, employee }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(employee);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(employee),
  });

  // Reset form when switching between create/edit or opening with a new row.
  useEffect(() => {
    if (open) reset(defaultValues(employee));
  }, [open, employee, reset]);

  const country = watch("country");
  const employmentType = watch("employmentType");

  // Auto-populate currency from country (user can still override).
  useEffect(() => {
    if (!isEdit && country) {
      setValue("currency", getCurrency(country));
    }
  }, [country, isEdit, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/employees/${employee!.id}`
        : "/api/employees";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          issues?: { path: string; message: string }[];
        };
        const detail =
          body.issues?.map((i) => `${i.path}: ${i.message}`).join("; ") ??
          body.message ??
          body.error ??
          res.statusText;
        toast.error(isEdit ? "Update failed" : "Create failed", {
          description: detail,
        });
        return;
      }
      toast.success(isEdit ? "Employee updated" : "Employee created");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast.error("Network error", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit employee" : "Add employee"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the fields you want to change."
              : "Create a new employee record."}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 px-4 pb-4 pt-2"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.firstName?.message}>
              <Input {...register("firstName")} autoFocus={!isEdit} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <Input {...register("lastName")} />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Job title" error={errors.jobTitle?.message}>
            <Input {...register("jobTitle")} />
          </Field>
          <Field label="Department" error={errors.department?.message}>
            <Input {...register("department")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country" error={errors.country?.message}>
              <Select
                value={country}
                onValueChange={(v) => v && setValue("country", v as FormValues["country"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a country" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Currency" error={errors.currency?.message}>
              <Input maxLength={3} {...register("currency")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Salary (annual)" error={errors.salary?.message}>
              <Input
                type="number"
                min={1}
                step={1}
                {...register("salary", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Employment type" error={errors.employmentType?.message}>
              <Select
                value={employmentType}
                onValueChange={(v) =>
                  v && setValue("employmentType", v as FormValues["employmentType"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {employmentLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Hire date" error={errors.hireDate?.message}>
            <Input type="date" {...register("hireDate")} />
          </Field>
          <SheetFooter className="px-0">
            <SheetClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </SheetClose>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : isEdit
                ? "Save changes"
                : "Create employee"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
