import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { Shield, LayoutDashboard, Send, History, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { cn } from '../lib/utils';

export const Layout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/pay', icon: Send },
    { name: 'History', path: '/history', icon: History },
  ];

  const NavContent = () => (
    <>
      <div className="mb-12 hidden lg:block">
        <div className="text-[10px] tracking-[0.3em] uppercase opacity-40 font-semibold mb-2">Sentinel</div>
        <div className="text-2xl font-bold tracking-tighter italic">PAYPORTAL</div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                isActive 
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-6">
        <div className="border border-white/10 p-4 rounded-lg bg-white/5 hidden lg:block">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest opacity-60">SSL Secured</span>
          </div>
          <div className="text-[10px] opacity-40 leading-tight">
            Whitelisting & CSRF protection active. Session managed.
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 text-[10px] font-bold uppercase">
              {user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-semibold truncate">{user?.email}</p>
              <p className="text-[9px] opacity-40 uppercase tracking-tighter">Verified User</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] opacity-40 hover:opacity-100 transition-opacity w-full"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-40">
        <div className="flex flex-col">
          <span className="text-[8px] tracking-[0.2em] uppercase opacity-40 font-semibold">Sentinel</span>
          <span className="text-lg font-bold tracking-tighter italic leading-none">PAYPORTAL</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 border-r border-white/10 flex-col p-8 sticky top-0 h-screen">
        <NavContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-[#050505] p-8 flex flex-col pt-24 overflow-y-auto">
          <NavContent />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
};
