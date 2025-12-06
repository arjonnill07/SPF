import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { Layout } from './components/Layout';
import { OperatorGuide } from './components/OperatorGuide';
import { SettingsModal } from './components/SettingsModal';
import { User, LoginState, SearchParams, COUNTRIES, LANGUAGES, NewsArticle, AppSettings } from './types';
import { fetchNews, exportToCSV } from './services/newsService';
import { Search, Download, RefreshCw, Calendar, Globe, AlertCircle, ExternalLink, Check, Loader2, MapPin } from 'lucide-react';

export default function App() {
  const [authStatus, setAuthStatus] = useState<LoginState>(LoginState.LOGGED_OUT);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    defaultCountry: 'BD',
    defaultLanguage: 'en',
    compactMode: false
  });

  // Search State
  const [query, setQuery] = useState('politics');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // These initialize from settings, but can be changed per search
  const [language, setLanguage] = useState(settings.defaultLanguage);
  const [country, setCountry] = useState(settings.defaultCountry);

  // Update local state if defaults change in settings
  useEffect(() => {
    if (!activeSearch) {
        // Only auto-update form fields if we haven't run a specific search yet
        setLanguage(settings.defaultLanguage);
        setCountry(settings.defaultCountry);
    }
  }, [settings.defaultLanguage, settings.defaultCountry]);

  // Metadata for the currently displayed results
  const [activeSearch, setActiveSearch] = useState<SearchParams | null>(null);

  // Results State
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executedSearch, setExecutedSearch] = useState(false);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthStatus(LoginState.LOGGED_IN);
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthStatus(LoginState.LOGGED_OUT);
    setArticles([]);
    setExecutedSearch(false);
    setActiveSearch(null);
  }, []);

  // Auto-Logout Logic (15 Minutes Inactivity)
  useEffect(() => {
    if (authStatus !== LoginState.LOGGED_IN) return;

    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        console.log("User logged out due to inactivity.");
      }, TIMEOUT_MS);
    };

    // Initial timer start
    resetTimer();

    // Event listeners for activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [authStatus, handleLogout]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Reset States
    setLoading(true);
    setError(null);
    setArticles([]); 
    
    const searchParams = {
        query: query.trim(),
        startDate,
        endDate,
        language,
        country
    };

    if (!searchParams.query) {
        setError("Please enter a search keyword.");
        setLoading(false);
        return;
    }

    try {
      const results = await fetchNews(searchParams);
      setArticles(results);
      setActiveSearch(searchParams);
      setExecutedSearch(true);
      
      if (results.length === 0) {
        setError("No articles found matching your criteria. Try broadening your date range or removing specific filters.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch news. Please check your connection.");
      setActiveSearch(null);
    } finally {
      setLoading(false);
    }
  };

  const getCountryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name || code;
  const getLanguageName = (code: string) => LANGUAGES.find(l => l.code === code)?.name || code;

  if (authStatus === LoginState.LOGGED_OUT) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <Layout 
      user={currentUser!} 
      onLogout={handleLogout}
      onSettingsClick={() => setIsSettingsOpen(true)}
    >
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={settings}
        onSave={setSettings}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SPF Intelligence Dashboard</h1>
        <p className="text-gray-500 mt-2">Real-time news monitoring and analysis platform</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
              <Search className="w-5 h-5 text-indigo-600" />
              Search Configuration
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  placeholder="e.g. economy AND (inflation OR tax)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-500" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                     <Calendar className="w-3 h-3 text-gray-500" /> End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-gray-500" /> Language
                  </label>
                  <div className="relative">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg border-gray-300 border p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-500" /> Country
                  </label>
                  <div className="relative">
                    <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full rounded-lg border-gray-300 border p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? 'Scanning Sources...' : 'Run Analysis'}
              </button>
            </form>
          </div>

          <OperatorGuide />
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">System Alert</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!executedSearch && !loading && !error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Ready to Search</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                Configure your parameters on the left and click "Run Analysis" to fetch real-time intelligence from Google News.
              </p>
            </div>
          )}
          
          {loading && !articles.length && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Analyzing Sources</h3>
                <p className="text-gray-500 mt-2">Connecting to global news feeds...</p>
            </div>
          )}

          {executedSearch && activeSearch && articles.length > 0 && (
            <>
              {/* Stats Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Found <strong>{articles.length}</strong> articles</span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        <span>{getCountryName(activeSearch.country)}</span>
                        <span className="text-gray-300">|</span>
                        <span>{getLanguageName(activeSearch.language)}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportToCSV(articles)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Results List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {articles.map((article) => (
                      <div key={article.guid} className={`hover:bg-gray-50 transition-colors group ${settings.compactMode ? 'p-3' : 'p-5'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                {article.source}
                              </span>
                              <span>•</span>
                              <span>{new Date(article.pubDate).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                              <a href={article.link} target="_blank" rel="noopener noreferrer">
                                {article.title}
                              </a>
                            </h3>
                            {!settings.compactMode && article.description && (
                                <div className="text-sm text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{__html: article.description}} />
                            )}
                          </div>
                          <a 
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                            title="Read Original Article"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}