"use client";

import React from "react";

export function useEmployees(companyId: string | null) {
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState(true);
  const [employeeError, setEmployeeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchEmployees = async () => {
      if (!companyId) {
        setEmployees([]);
        setLoadingEmployees(false);
        return;
      }

      setLoadingEmployees(true);
      setEmployeeError(null);

      try {
        const params = new URLSearchParams({ companyId });
        const res = await fetch(`/api/employees?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch employees");
        if (!cancelled) setEmployees(data.employees || []);
      } catch (error) {
        if (!cancelled) {
          setEmployees([]);
          setEmployeeError(error instanceof Error ? error.message : "Failed to fetch employees");
        }
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    fetchEmployees();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { employees, setEmployees, loadingEmployees, employeeError };
}
