import React from 'react';
import {
    Users,
    Wrench,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    MapPin,
    Phone,
    Star,
    MessageSquare,
    BarChart2,
    Shield,
    Globe,
    AlertTriangle,
    UserCheck,
    FileText,
    Settings,
    Bell,
    Flag,
    Activity,
    CreditCard
} from 'lucide-react';

interface AdminNavBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const menuItems = [
    {
        id: 'requests',
        label: 'Demandes',
        icon: Wrench,
        color: 'text-blue-600',
        borderColor: 'border-blue-600'
    },
    {
        id: 'technicians',
        label: 'Techniciens',
        icon: Users,
        color: 'text-green-600',
        borderColor: 'border-green-600'
    },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        color: 'text-purple-600',
        borderColor: 'border-purple-600'
    },
    {
        id: 'security',
        label: 'Sécurité',
        icon: Shield,
        color: 'text-red-600',
        borderColor: 'border-red-600'
    },
    {
        id: 'reports',
        label: 'Signalements',
        icon: Flag,
        color: 'text-orange-600',
        borderColor: 'border-orange-600'
    },
    {
        id: 'alerts',
        label: 'Alertes',
        icon: AlertTriangle,
        color: 'text-yellow-600',
        borderColor: 'border-yellow-600'
    },
    {
        id: 'audit-logs',
        label: 'Journaux d\'audit',
        icon: Activity,
        color: 'text-indigo-600',
        borderColor: 'border-indigo-600'
    },
    {
        id: 'reviews',
        label: 'Modération avis',
        icon: Star,
        color: 'text-pink-600',
        borderColor: 'border-pink-600'
    },
    {
        id: 'statistics',
        label: 'Statistiques',
        icon: BarChart2,
        color: 'text-teal-600',
        borderColor: 'border-teal-600'
    },
    {
        id: 'configuration',
        label: 'Configuration',
        icon: Settings,
        color: 'text-gray-600',
        borderColor: 'border-gray-600'
    },
    {
        id: 'subscription-requests',
        label: 'Abonnements',
        icon: CreditCard,
        color: 'text-emerald-600',
        borderColor: 'border-emerald-600'
    }
];

const AdminNavBar: React.FC<AdminNavBarProps> = ({ activeTab, onTabChange }) => {
    return (
        <nav className="w-full bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4">
                <ul className="flex flex-row flex-nowrap overflow-x-auto gap-2 md:gap-4 py-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onTabChange(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-150 whitespace-nowrap font-medium text-sm
                                        ${isActive ? `${item.color} bg-blue-50 border-b-2 ${item.borderColor} shadow-sm` : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'}`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? item.color : 'text-gray-400'}`} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
};

export default AdminNavBar; 