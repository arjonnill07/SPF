import React from 'react';
import { LogOut, LayoutDashboard, Settings, Shield } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onSettingsClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onSettingsClick }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="bg-white w-full md:w-64 flex-shrink-0 flex flex-col border-r border-gray-200 z-20">
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
               <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-800 tracking-tight text-lg">SPF Intel</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Dashboard
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg transition-all font-medium">
            <LayoutDashboard className="w-4.5 h-4.5 text-indigo-600" />
            <span>Live Monitor</span>
          </button>
          
          <div className="px-3 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Configuration
          </div>
          <button 
            onClick={onSettingsClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all group"
          >
            <Settings className="w-4.5 h-4.5 group-hover:text-indigo-600 transition-colors" />
            <span>Preferences</span>
          </button>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 border border-indigo-200">
              {user.username.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};