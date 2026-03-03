"use client";

import { useState } from "react";
import { deletePayrollRun } from "@/app/actions/payroll";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeletePayrollButton({ runId, month, status }: { runId: string, month: string, status: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (status === 'final') {
            alert("Cannot delete a finalized payroll run. Please reopen it first if you need to delete.");
            return;
        }

        if (confirm(`Are you absolutely sure you want to delete the payroll run for ${month}?\n\nThis will permanently remove all related payroll records and data. This action cannot be undone.`)) {
            setIsDeleting(true);
            const res = await deletePayrollRun(runId);
            setIsDeleting(false);

            if (res.error) {
                alert(`Error deleting payroll run: ${res.message}`);
            } else {
                router.refresh();
            }
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting || status === 'final'}
            className="btn btn-danger"
            style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.875rem',
                display: 'inline-flex',
                gap: '0.4rem',
                backgroundColor: status === 'final' ? 'var(--background)' : '#ef4444',
                color: status === 'final' ? 'var(--text-muted)' : 'white',
                border: status === 'final' ? '1px solid var(--border)' : 'none',
                cursor: status === 'final' ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.7 : 1
            }}
            title={status === 'final' ? "Cannot delete finalized runs" : "Delete Payroll Run"}
        >
            <Trash2 size={14} /> {isDeleting ? "Deleting..." : "Delete"}
        </button>
    );
}
