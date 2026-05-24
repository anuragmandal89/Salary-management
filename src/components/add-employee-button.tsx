"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeFormSheet } from "@/components/employee-form-sheet";

export function AddEmployeeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add employee
      </Button>
      <EmployeeFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
