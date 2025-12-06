import React, { useState } from 'react';
import { Lock, User as UserIcon, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const CREDENTIALS = {
  ADMIN: {
    username: 'admin',
    password: 'SPF-Admin-2025',
    displayName: 'Administrator',
    role: 'admin' as const
  },
  ANALYST: {
    username: 'analyst',
    password: 'SPF-Analyst-2025',
    displayName: 'Intelligence Analyst',
    role: 'analyst' as const
  }
};

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (username === CREDENTIALS.ADMIN.username && password === CREDENTIALS.ADMIN.password) {
        onLogin({ username: CREDENTIALS.ADMIN.displayName, role: CREDENTIALS.ADMIN.role });
      } else if (username === CREDENTIALS.ANALYST.username && password === CREDENTIALS.ANALYST.password) {
        onLogin({ username: CREDENTIALS.ANALYST.displayName, role: CREDENTIALS.ANALYST.role });
      } else {
        setError('Invalid username or password.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Visual */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent"></div>
          <div className="relative z-10 flex justify-center mb-4">
             <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
             </div>
          </div>
          <h2 className="relative z-10 text-2xl font-bold text-white tracking-tight">SPF Intelligence</h2>
          <p className="relative z-10 text-indigo-100 text-sm mt-1">Secure Media Monitoring Portal</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="Enter Access ID"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${loading ? 'opacity-80' : ''}`}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <p className="text-xs text-gray-400">Restricted Access. Activity is logged.</p>
          </div>
        </div>
      </div>
    </div>
  );
};