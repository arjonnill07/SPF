import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { Layout } from './components/Layout';
import { OperatorGuide } from './components/OperatorGuide';
import { SettingsModal } from './components/SettingsModal';
import { User, LoginState, SearchParams, COUNTRIES, LANGUAGES, NewsArticle, VideoItem, AppSettings, DataSource, YoutubeMode, CommentItem, SearchHistoryItem } from './types';
import { fetchNews, exportToCSV } from './services/newsService';
import { fetchVideos, fetchVideoComments, exportVideosToCSV, exportCommentsToCSV } from './services/youtubeService';
import { Search, Download, RefreshCw, Calendar, Globe, AlertCircle, ExternalLink, Check, Loader2, MapPin, Youtube, Newspaper, Key, MessageSquare, Video, ThumbsUp, MessageCircle, History, Clock, ArrowDownCircle, Filter } from 'lucide-react';

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
  const [dataSource, setDataSource] = useState<DataSource>('news');
  const [youtubeMode, setYoutubeMode] = useState<YoutubeMode>('search');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  
  // Inputs
  const [query, setQuery] = useState('politics');
  const [targetVideoUrl, setTargetVideoUrl] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // These initialize from settings, but can be changed per search
  const [language, setLanguage] = useState(settings.defaultLanguage);
  const [country, setCountry] = useState(settings.defaultCountry);

  // Metadata for the currently displayed results
  const [activeSearch, setActiveSearch] = useState<SearchParams | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Results State
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  
  // Pagination State
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executedSearch, setExecutedSearch] = useState(false);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('spf_search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) { console.error("Failed to load history"); }
    }
  }, []);

  const saveToHistory = (params: SearchParams, ds: DataSource, ytMode?: YoutubeMode, vidUrl?: string) => {
    const newItem: SearchHistoryItem = {
      ...params,
      id: Date.now().toString(),
      timestamp: Date.now(),
      dataSource: ds,
      youtubeMode: ytMode,
      targetVideoUrl: vidUrl
    };

    const newHistory = [newItem, ...searchHistory.filter(h => 
      // Simple deduplication based on query and source
      !(h.query === params.query && h.dataSource === ds && h.youtubeMode === ytMode && h.targetVideoUrl === vidUrl)
    )].slice(0, 10); // Keep last 10

    setSearchHistory(newHistory);
    localStorage.setItem('spf_search_history', JSON.stringify(newHistory));
  };

  const restoreHistory = (item: SearchHistoryItem) => {
    setDataSource(item.dataSource);
    if (item.youtubeMode) setYoutubeMode(item.youtubeMode);
    
    setQuery(item.query);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setLanguage(item.language);
    setCountry(item.country);
    if (item.targetVideoUrl) setTargetVideoUrl(item.targetVideoUrl);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update local state if defaults change in settings
  useEffect(() => {
    if (!activeSearch && !executedSearch) {
        setLanguage(settings.defaultLanguage);
        setCountry(settings.defaultCountry);
    }
  }, [settings.defaultLanguage, settings.defaultCountry, activeSearch, executedSearch]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthStatus(LoginState.LOGGED_IN);
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthStatus(LoginState.LOGGED_OUT);
    setArticles([]);
    setVideos([]);
    setComments([]);
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

    resetTimer();
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
    setVideos([]);
    setComments([]);
    setNextPageToken(undefined);
    
    const searchParams = {
        query: query.trim(),
        startDate,
        endDate,
        language,
        country
    };

    try {
      if (dataSource === 'news') {
        if (!searchParams.query) throw new Error("Please enter a search keyword.");
        const results = await fetchNews(searchParams);
        setArticles(results);
        if (results.length === 0) setError("No news articles found. Try broadening your criteria.");
        setActiveSearch(searchParams);
        saveToHistory(searchParams, 'news');
      } 
      else if (dataSource === 'youtube') {
        if (!youtubeApiKey.trim()) {
           throw new Error("YouTube API Key is required.");
        }

        if (youtubeMode === 'search') {
            if (!searchParams.query) throw new Error("Please enter a search keyword.");
            const { items, nextPageToken: token } = await fetchVideos(searchParams, youtubeApiKey);
            setVideos(items);
            setNextPageToken(token);
            if (items.length === 0) setError("No videos found.");
            setActiveSearch(searchParams);
            saveToHistory(searchParams, 'youtube', 'search');
        } else {
            // Comment Scraping Mode
            if (!targetVideoUrl.trim()) throw new Error("Please enter a valid YouTube Video URL.");
            const { items, nextPageToken: token } = await fetchVideoComments(targetVideoUrl, youtubeApiKey);
            setComments(items);
            setNextPageToken(token);
            if (items.length === 0) setError("No comments found or comments are disabled.");
            setActiveSearch(null); 
            saveToHistory(searchParams, 'youtube', 'comments', targetVideoUrl);
        }
      }
      
      setExecutedSearch(true);
      
    } catch (err: any) {
      setError(err.message || "Failed to fetch data. Please check your connection.");
      setActiveSearch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || !youtubeApiKey) return;
    
    setLoadingMore(true);
    try {
      if (dataSource === 'youtube' && youtubeMode === 'search' && activeSearch) {
         const { items, nextPageToken: token } = await fetchVideos(activeSearch, youtubeApiKey, nextPageToken);
         setVideos(prev => [...prev, ...items]);
         setNextPageToken(token);
      } else if (dataSource === 'youtube' && youtubeMode === 'comments' && targetVideoUrl) {
         const { items, nextPageToken: token } = await fetchVideoComments(targetVideoUrl, youtubeApiKey, nextPageToken);
         setComments(prev => [...prev, ...items]);
         setNextPageToken(token);
      }
    } catch (err: any) {
      console.error("Failed to load more items", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExport = () => {
      if (dataSource === 'news') {
          exportToCSV(articles);
      } else if (dataSource === 'youtube' && youtubeMode === 'search') {
          exportVideosToCSV(videos);
      } else {
          exportCommentsToCSV(comments);
      }
  };

  const getCountryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name || code;
  const getLanguageName = (code: string) => LANGUAGES.find(l => l.code === code)?.name || code;

  // Determine what result set is active
  const hasNews = dataSource === 'news' && articles.length > 0;
  const hasVideos = dataSource === 'youtube' && youtubeMode === 'search' && videos.length > 0;
  const hasComments = dataSource === 'youtube' && youtubeMode === 'comments' && comments.length > 0;
  const hasResults = hasNews || hasVideos || hasComments;

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

      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System Online</span>
           </div>
           <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Intelligence Dashboard</h1>
           <p className="text-gray-500 mt-1 text-sm">Real-time multi-source monitoring & extraction platform</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls (Width 4/12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200/75">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-5 flex items-center gap-2 pb-3 border-b border-gray-100">
              <Filter className="w-4 h-4" />
              Configuration Parameters
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-6">
              
              {/* Data Source Toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase">Data Source</label>
                <div className="flex bg-gray-100/80 p-1.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setDataSource('news')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${dataSource === 'news' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Newspaper className="w-4 h-4" /> Global News
                    </button>
                    <button
                        type="button"
                        onClick={() => setDataSource('youtube')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${dataSource === 'youtube' ? 'bg-white text-red-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Youtube className="w-4 h-4" /> YouTube Intel
                    </button>
                </div>
              </div>

              {/* YouTube Specific Modes */}
              {dataSource === 'youtube' && (
                <div className="animate-in fade-in slide-in-from-top-1 bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-semibold text-red-900 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                        <Key className="w-3.5 h-3.5" /> API Key
                    </label>
                    <input
                      type="text"
                      value={youtubeApiKey}
                      onChange={(e) => setYoutubeApiKey(e.target.value)}
                      className="w-full rounded-lg bg-white border-red-200 border p-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-red-200"
                      placeholder="Enter YouTube Data API Key"
                      required
                    />
                  </div>

                  {/* Operation Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-red-900 mb-2.5 uppercase tracking-wide">Mode Selection</label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${youtubeMode === 'search' ? 'bg-white border-red-300 text-red-700 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white/50'}`}>
                            <input 
                                type="radio" 
                                name="ytMode" 
                                checked={youtubeMode === 'search'} 
                                onChange={() => setYoutubeMode('search')}
                                className="hidden"
                            />
                            <Video className="w-4 h-4"/> 
                            <span className="text-xs font-medium">Video Search</span>
                        </label>
                        <label className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${youtubeMode === 'comments' ? 'bg-white border-red-300 text-red-700 shadow-sm' : 'border-transparent text-gray-500 hover:bg-white/50'}`}>
                            <input 
                                type="radio" 
                                name="ytMode" 
                                checked={youtubeMode === 'comments'} 
                                onChange={() => setYoutubeMode('comments')}
                                className="hidden"
                            />
                            <MessageSquare className="w-4 h-4"/> 
                            <span className="text-xs font-medium">Comments</span>
                        </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Inputs (Conditional) */}
              {dataSource === 'youtube' && youtubeMode === 'comments' ? (
                  // Comment Scraping Inputs
                   <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Video URL</label>
                    <input
                        type="text"
                        value={targetVideoUrl}
                        onChange={(e) => setTargetVideoUrl(e.target.value)}
                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Paste full link to extract user sentiment.
                    </p>
                   </div>
              ) : (
                  // Standard Search Inputs (News or YT Video Search)
                  <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Search Keywords</label>
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className={`w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 outline-none transition-all ${dataSource === 'youtube' ? 'focus:ring-red-500/20 focus:border-red-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                          placeholder={dataSource === 'youtube' ? "e.g. Dhaka protest" : "e.g. economy AND (inflation OR tax)"}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> From
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                             <Calendar className="w-3 h-3" /> To
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Language
                          </label>
                          <div className="relative">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full rounded-lg border-gray-300 border p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none"
                            >
                                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ArrowDownCircle className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Region
                          </label>
                          <div className="relative">
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full rounded-lg border-gray-300 border p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none"
                            >
                                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ArrowDownCircle className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                  </>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait disabled:hover:translate-y-0 ${dataSource === 'youtube' ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-indigo-200'}`}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? 'Executing Extraction...' : 'Initialize Analysis'}
              </button>
            </form>
          </div>

          {/* Search History Panel */}
          {searchHistory.length > 0 && (
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/75">
               <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                 <History className="w-4 h-4" /> Recent Operations
               </h3>
               <div className="space-y-2">
                 {searchHistory.map(item => (
                   <button 
                    key={item.id}
                    onClick={() => restoreHistory(item)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-gray-50 text-xs border border-transparent hover:border-gray-200 transition-all group relative overflow-hidden"
                   >
                     <div className="flex items-center gap-2.5 mb-1.5 relative z-10">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${item.dataSource === 'news' ? 'bg-indigo-50' : 'bg-red-50'}`}>
                          {item.dataSource === 'news' ? (
                            <Newspaper className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <Youtube className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 truncate flex-1">
                          {item.youtubeMode === 'comments' ? 'Comments Extract' : item.query}
                        </span>
                     </div>
                     <div className="flex items-center gap-2 text-gray-400 pl-[2.125rem] relative z-10">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span>•</span>
                        <span>{getCountryName(item.country)}</span>
                     </div>
                   </button>
                 ))}
               </div>
             </div>
          )}

          {dataSource === 'news' && <OperatorGuide />}
        </div>

        {/* Right Column: Results (Width 8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Extraction Failed</h3>
                <p className="text-sm text-red-700 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!executedSearch && !loading && !error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-[500px] flex flex-col items-center justify-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform rotate-3 transition-transform hover:rotate-6 ${dataSource === 'youtube' ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'}`}>
                {dataSource === 'youtube' ? <Youtube className="w-10 h-10 text-white" /> : <Newspaper className="w-10 h-10 text-white" />}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Ready to Analyze</h3>
              <p className="text-gray-500 mt-3 max-w-sm mx-auto text-sm leading-relaxed">
                Configure your search parameters on the left panel to initialize the intelligence gathering bot.
              </p>
            </div>
          )}
          
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-[500px] flex flex-col items-center justify-center">
                <div className="relative mb-6">
                    <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin ${dataSource === 'youtube' ? 'border-red-500' : 'border-indigo-500'}`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {dataSource === 'youtube' ? <Youtube className="w-6 h-6 text-red-500" /> : <Newspaper className="w-6 h-6 text-indigo-500" />}
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Gathering Intelligence</h3>
                <p className="text-gray-500 mt-2 text-sm">Scanning {dataSource === 'youtube' ? 'YouTube Data API' : 'Global News Networks'}...</p>
            </div>
          )}

          {executedSearch && hasResults && !loading && (
            <>
              {/* Stats Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/95">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-bold bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                        <Check className="w-4 h-4 text-green-600" />
                        <span>{hasNews ? articles.length : (hasVideos ? videos.length : comments.length)} Results</span>
                    </div>
                    {/* Show filters context only for Search modes, not direct link scrape */}
                    {activeSearch && (
                        <div className="hidden sm:flex text-xs text-gray-400 items-center gap-2">
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100"><Globe className="w-3 h-3" /> {getCountryName(activeSearch.country)}</span>
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">{getLanguageName(activeSearch.language)}</span>
                        </div>
                    )}
                </div>
                
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-300 shadow-sm hover:shadow"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>

              {/* News Results List */}
              {hasNews && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {articles.map((article) => (
                        <div key={article.guid} className={`group hover:bg-indigo-50/30 transition-all duration-200 border-l-4 border-transparent hover:border-indigo-500 ${settings.compactMode ? 'p-4' : 'p-6'}`}>
                          <div className="flex items-start justify-between gap-5">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 tracking-wide uppercase text-[10px]">
                                  {article.source}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(article.pubDate).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors">
                                <a href={article.link} target="_blank" rel="noopener noreferrer">
                                  {article.title}
                                </a>
                              </h3>
                              {!settings.compactMode && article.description && (
                                  <div className="text-sm text-gray-600 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{__html: article.description}} />
                              )}
                            </div>
                            <a 
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-2.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 rounded-lg transition-all shadow-sm hover:shadow-md"
                              title="Open Source"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* YouTube Results Grid (Search Mode) */}
              {hasVideos && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {videos.map((video) => (
                        <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group border-t-4 border-t-transparent hover:border-t-red-500">
                          <div className="relative aspect-video bg-gray-900 group">
                              <img 
                                  src={video.thumbnailUrl} 
                                  alt={video.title} 
                                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                  loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <a 
                                  href={video.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="absolute bottom-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-red-700 transition-colors shadow-lg"
                              >
                                  <Youtube className="w-3.5 h-3.5" /> WATCH
                              </a>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                              <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                  <span className="font-bold text-gray-700">{video.channelTitle}</span>
                                  <span className="text-gray-300">•</span>
                                  <span>{new Date(video.publishTime).toLocaleDateString()}</span>
                              </div>
                              <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 leading-tight group-hover:text-red-700 transition-colors">
                                  <a href={video.link} target="_blank" rel="noopener noreferrer">
                                      {video.title}
                                  </a>
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                  {video.description}
                              </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* YouTube Comments List (Comment Mode) */}
              {hasComments && (
                 <div className="space-y-6">
                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <MessageSquare className="w-4 h-4 text-red-500" /> Sentiment Data
                          </h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                          {comments.map((comment) => (
                              <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start gap-4">
                                      <div className="relative">
                                        <img 
                                            src={comment.authorProfileImageUrl} 
                                            alt={comment.authorDisplayName}
                                            className="w-10 h-10 rounded-full bg-gray-200 object-cover ring-2 ring-white shadow-sm"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                                        </div>
                                      </div>
                                      <div className="flex-1 space-y-2">
                                          <div className="flex items-center justify-between">
                                              <span className="text-sm font-bold text-gray-900">{comment.authorDisplayName}</span>
                                              <span className="text-xs font-medium text-gray-400">{new Date(comment.publishedAt).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.textOriginal}</p>
                                          <div className="flex items-center gap-4 mt-3">
                                              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md" title="Likes">
                                                  <ThumbsUp className="w-3 h-3" />
                                                  <span>{comment.likeCount}</span>
                                              </div>
                                              {comment.replyCount > 0 && (
                                                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md" title="Replies">
                                                      <MessageCircle className="w-3 h-3" />
                                                      <span>{comment.replyCount} replies</span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                   </div>
                 </div>
              )}

              {/* Pagination Load More Button */}
              {nextPageToken && (
                 <div className="flex justify-center pt-4 pb-12">
                    <button 
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="group flex items-center gap-2 px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-gray-50 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4 group-hover:animate-bounce" />}
                      {loadingMore ? 'Fetching Next Batch...' : 'Load More Results'}
                    </button>
                 </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}