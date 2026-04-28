import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  Store,
  ShoppingCart,
  AlertCircle,
  BarChart3,
  Users,
  Flag,
  Send,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

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

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      className="w-64 bg-white border-r border-gray-200 overflow-y-auto
        transition-all duration-300"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">NearBy</h1>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>

      <nav className="px-3 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md
                transition-colors text-sm font-medium
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
