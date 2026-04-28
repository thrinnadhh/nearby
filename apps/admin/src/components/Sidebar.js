import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from 'react-router-dom';
import { FileText, Store, ShoppingCart, AlertCircle, BarChart3, Users, Flag, Send, } from 'lucide-react';
const menuItems = [
    {
        label: 'KYC Review',
        path: '/kyc-queue',
        icon: FileText,
    },
    {
        label: 'Shop Management',
        path: '/shops',
        icon: Store,
    },
    {
        label: 'Order Monitor',
        path: '/orders',
        icon: ShoppingCart,
    },
    {
        label: 'Disputes',
        path: '/disputes',
        icon: AlertCircle,
    },
    {
        label: 'Analytics',
        path: '/analytics',
        icon: BarChart3,
    },
    {
        label: 'Delivery Partners',
        path: '/partners',
        icon: Users,
    },
    {
        label: 'Moderation',
        path: '/moderation',
        icon: Flag,
    },
    {
        label: 'Broadcast',
        path: '/broadcast',
        icon: Send,
    },
];
export default function Sidebar({ isOpen, setIsOpen }) {
    const location = useLocation();
    if (!isOpen) {
        return null;
    }
    return (_jsxs("aside", { className: "w-64 bg-white border-r border-gray-200 overflow-y-auto\n        transition-all duration-300", children: [_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "NearBy" }), _jsx("p", { className: "text-sm text-gray-500", children: "Admin Dashboard" })] }), _jsx("nav", { className: "px-3 py-6 space-y-1", children: menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (_jsxs(Link, { to: item.path, onClick: () => setIsOpen(false), className: `flex items-center gap-3 px-4 py-3 rounded-md
                transition-colors text-sm font-medium
                ${isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'}`, children: [_jsx(Icon, { size: 20 }), item.label] }, item.path));
                }) })] }));
}
//# sourceMappingURL=Sidebar.js.map