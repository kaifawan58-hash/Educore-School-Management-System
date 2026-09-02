"use client";
import { useEffect, useState } from "react";
import { Card, EmptyState } from "@/components/ui";

type Vehicle = { id: string; plateNumber: string; model: string | null; capacity: number | null; driverName: string | null; driverPhone: string | null };
type Route = { id: string; vehicleId: string; name: string; stops: string | null; fee: number };
type Assignment = { id: string; routeId: string; stopName: string | null; studentFirstName: string; studentLastName: string };

export default function TransportPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transport").then((r) => r.json()).then((j) => {
      if (j.success) { setVehicles(j.data.vehicles); setRoutes(j.data.routes); setAssignments(j.data.assignments); }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-semibold">Transport</h1><p className="text-sm text-[var(--muted)]">Vehicles, routes and student assignments</p></div>

      <Card>
        <div className="p-4 pb-0"><h3 className="font-medium">Vehicles</h3></div>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : vehicles.length === 0 ? <EmptyState title="No vehicles registered" /> : (
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Plate #</th><th>Model</th><th>Capacity</th><th>Driver</th><th>Phone</th></tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{v.plateNumber}</td>
                  <td>{v.model ?? "-"}</td>
                  <td>{v.capacity ?? "-"}</td>
                  <td>{v.driverName ?? "-"}</td>
                  <td>{v.driverPhone ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="p-4 pb-0"><h3 className="font-medium">Routes</h3></div>
        {routes.length === 0 ? <EmptyState title="No routes configured" /> : (
          <div className="grid md:grid-cols-2 gap-3 p-4">
            {routes.map((r) => {
              const stops: string[] = r.stops ? JSON.parse(r.stops) : [];
              const vehicle = vehicles.find((v) => v.id === r.vehicleId);
              return (
                <div key={r.id} className="border border-[var(--border)] rounded-lg p-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-[var(--muted)]">Vehicle {vehicle?.plateNumber ?? "-"} · Fee PKR {r.fee.toLocaleString()}</p>
                  <p className="text-sm mt-2">{stops.join(" → ")}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="p-4 pb-0"><h3 className="font-medium">Assigned Students</h3></div>
        {assignments.length === 0 ? <EmptyState title="No students assigned to transport" /> : (
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Student</th><th>Stop</th></tr></thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4">{a.studentFirstName} {a.studentLastName}</td>
                  <td>{a.stopName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
