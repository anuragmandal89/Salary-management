"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SerializedEmployee } from "@/lib/serialize";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: SerializedEmployee;
}

export function EmployeeDeleteDialog({ open, onOpenChange, employee }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        toast.error("Delete failed", { description: await res.text() });
        return;
      }
      toast.success("Employee deleted", { description: employee.fullName });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error("Network error", {
        description: err instanceof Error ? err.message : "Unknown",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{employee.fullName}</strong>{" "}
            ({employee.email}) from the directory. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
