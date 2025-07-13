import { useEffect, useState } from "react";
import { fetchAdminStats } from "../api/statistics";

export default function AdminStatsPanel() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchAdminStats();
            setStats(data);
        } catch (err) {
            setError("Erreur lors du chargement des statistiques.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Chargement…</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    if (!stats) return <div>Aucune statistique disponible.</div>;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 shadow rounded">
                    <h3 className="text-sm text-gray-500">Demandes totales</h3>
                    <p className="text-2xl font-bold">{stats.total_requests}</p>
                </div>
                <div className="bg-white p-4 shadow rounded">
                    <h3 className="text-sm text-gray-500">Techniciens actifs</h3>
                    <p className="text-2xl font-bold">{stats.technicians_active}</p>
                </div>
                <div className="bg-white p-4 shadow rounded">
                    <h3 className="text-sm text-gray-500">Clients inscrits</h3>
                    <p className="text-2xl font-bold">{stats.clients_total}</p>
                </div>
                <div className="bg-white p-4 shadow rounded">
                    <h3 className="text-sm text-gray-500">Note moyenne</h3>
                    <p className="text-2xl font-bold">{stats.avg_rating?.toFixed(2) || "N/A"}</p>
                </div>
            </div>
            <div className="bg-white p-4 shadow rounded">
                <h3 className="font-semibold mb-2">Demandes par mois</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-max text-xs">
                        <thead>
                            <tr>
                                <th className="px-2 py-1">Mois</th>
                                <th className="px-2 py-1">Nombre</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.monthly_requests?.map((row: any) => (
                                <tr key={row.month}>
                                    <td className="px-2 py-1">{row.month}</td>
                                    <td className="px-2 py-1">{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 