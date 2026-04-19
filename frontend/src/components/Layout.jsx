import { Outlet, Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { LayoutDashboard, Package, LogOut, Sun, Moon, ShoppingCart, TrendingUp, Download, Users, Truck, FileText, Settings } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const { logout } = useContext(AuthContext);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Stock / Inventory', icon: Package },
    { to: '/purchase', label: 'Purchase (Buying)', icon: ShoppingCart },
    { to: '/sales', label: 'Sales (Billing)', icon: TrendingUp },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/export', label: 'GST Export', icon: Download },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-500">📦 InventoryGST</h1>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors font-medium ${
                  isActive(to)
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                }`}>
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={logout} className="flex items-center w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10">
          <LogOut className="w-5 h-5 mr-3" /> Logout
        </button>
      </div>
    </aside>
  );
};

const Topbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center md:hidden">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-500">InvGST</h1>
      </div>
      <div className="flex-1"></div>
      <div className="flex items-center space-x-4">
        <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none rounded-full focus:ring-2 focus:ring-primary-500">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="flex items-center space-x-2 border-l pl-4 border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
            {user?.name?.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
