"use client";

import { Trash } from "lucide-react";

export default function DeleteButton() {
    return (
        <button
            type="submit"
            className="btn"
            style={{ padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
            onClick={(e) => {
                if (!window.confirm("Are you sure you want to delete this member? All associated websites and payroll records will be deleted as well.")) {
                    e.preventDefault();
                }
            }}
        >
            <Trash size={16} />
        </button>
    );
}
