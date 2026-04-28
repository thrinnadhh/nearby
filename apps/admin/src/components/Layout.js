import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
export default function Layout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    return (_jsxs("div", { className: "flex h-screen bg-gray-100", children: [_jsx(Sidebar, { isOpen: sidebarOpen, setIsOpen: setSidebarOpen }), _jsxs("div", { className: "flex flex-col flex-1", children: [_jsx("header", { className: "bg-white shadow-sm border-b border-gray-200", children: _jsxs("div", { className: "flex items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "p-1 hover:bg-gray-100 rounded-md", children: sidebarOpen ? (_jsx(X, { size: 24, className: "text-gray-600" })) : (_jsx(Menu, { size: 24, className: "text-gray-600" })) }), title && (_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: title }))] }), _jsxs("button", { onClick: handleLogout, className: "flex items-center gap-2 px-4 py-2 text-gray-700\n                hover:bg-gray-100 rounded-md transition-colors", children: [_jsx(LogOut, { size: 20 }), _jsx("span", { className: "text-sm font-medium", children: "Logout" })] })] }) }), _jsx("main", { className: "flex-1 overflow-auto p-6", children: children })] })] }));
}
//# sourceMappingURL=Layout.js.map