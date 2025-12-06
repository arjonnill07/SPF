import React, { useState, useEffect } from 'react';
import { X, Save, Monitor, Globe, MapPin, Layout } from 'lucide-react';
import { AppSettings, COUNTRIES, LANGUAGES } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentSettings, 
  onSave 
}) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Monitor className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Platform Preferences</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-3 h-3" /> Default Parameters
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Language
                </label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({...settings, defaultLanguage: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">This language will be selected automatically on login.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Region
                </label>
                <select
                  value={settings.defaultCountry}
                  onChange={(e) => setSettings({...settings, defaultCountry: e.target.value})}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Primary region for intelligence gathering.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-3 h-3" /> Display Options
            </h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:border-indigo-200 transition-colors cursor-pointer"
                 onClick={() => setSettings({...settings, compactMode: !settings.compactMode})}
            >
              <div>
                <span className="block text-sm font-medium text-gray-900">Compact Mode</span>
                <span className="block text-xs text-gray-500">Hide article snippets to see more results.</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.compactMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${settings.compactMode ? 'left-6' : 'left-1'}`} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  );
};