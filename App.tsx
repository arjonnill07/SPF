
import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { Layout } from './components/Layout';
import { OperatorGuide } from './components/OperatorGuide';
import { SettingsModal } from './components/SettingsModal';
import { User, LoginState, SearchParams, COUNTRIES, LANGUAGES, NewsArticle, VideoItem, AppSettings, DataSource, YoutubeMode, CommentItem } from './types';
import { fetchNews, exportToCSV } from './services/newsService';
import { fetchVideos, fetchVideoComments, exportVideosToCSV, exportCommentsToCSV } from './services/youtubeService';
import { Search, Download, RefreshCw, Calendar, Globe, AlertCircle, ExternalLink, Check, Loader2, MapPin, Youtube, Newspaper, Key, MessageSquare, Video, ThumbsUp, MessageCircle } from 'lucide-react';

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

  // Results State
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executedSearch, setExecutedSearch] = useState(false);

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
      } 
      else if (dataSource === 'youtube') {
        if (!youtubeApiKey.trim()) {
           throw new Error("YouTube API Key is required.");
        }

        if (youtubeMode === 'search') {
            if (!searchParams.query) throw new Error("Please enter a search keyword.");
            const results = await fetchVideos(searchParams, youtubeApiKey);
            setVideos(results);
            if (results.length === 0) setError("No videos found.");
            setActiveSearch(searchParams);
        } else {
            // Comment Scraping Mode
            if (!targetVideoUrl.trim()) throw new Error("Please enter a valid YouTube Video URL.");
            const results = await fetchVideoComments(targetVideoUrl, youtubeApiKey);
            setComments(results);
            if (results.length === 0) setError("No comments found or comments are disabled.");
            setActiveSearch(null); // Metadata not relevant for direct link scrape
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

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SPF Intelligence Dashboard</h1>
        <p className="text-gray-500 mt-2">Real-time multi-source monitoring platform</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
              <Search className="w-5 h-5 text-indigo-600" />
              Intelligence Configuration
            </h2>
            
            <form onSubmit={handleSearch} className="space-y-5">
              
              {/* Data Source Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setDataSource('news')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${dataSource === 'news' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Newspaper className="w-4 h-4" /> News
                    </button>
                    <button
                        type="button"
                        onClick={() => setDataSource('youtube')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${dataSource === 'youtube' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Youtube className="w-4 h-4" /> YouTube
                    </button>
                </div>
              </div>

              {/* YouTube Specific Modes */}
              {dataSource === 'youtube' && (
                <div className="animate-in fade-in slide-in-from-top-1 bg-red-50 p-3 rounded-lg border border-red-100 space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-semibold text-red-800 mb-1 flex items-center gap-1 uppercase tracking-wide">
                        <Key className="w-3 h-3" /> API Key
                    </label>
                    <input
                      type="text"
                      value={youtubeApiKey}
                      onChange={(e) => setYoutubeApiKey(e.target.value)}
                      className="w-full rounded bg-white border-red-200 border p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      placeholder="Required"
                      required
                    />
                  </div>

                  {/* Operation Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-red-800 mb-2 uppercase tracking-wide">Operation Mode</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="ytMode" 
                                checked={youtubeMode === 'search'} 
                                onChange={() => setYoutubeMode('search')}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1"><Video className="w-3 h-3"/> Find Videos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="ytMode" 
                                checked={youtubeMode === 'comments'} 
                                onChange={() => setYoutubeMode('comments')}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 flex items-center gap-1"><MessageSquare className="w-3 h-3"/> Extract Comments</span>
                        </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Inputs (Conditional) */}
              {dataSource === 'youtube' && youtubeMode === 'comments' ? (
                  // Comment Scraping Inputs
                   <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Video URL</label>
                    <input
                        type="text"
                        value={targetVideoUrl}
                        onChange={(e) => setTargetVideoUrl(e.target.value)}
                        className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Paste the full link to scrape user comments.</p>
                   </div>
              ) : (
                  // Standard Search Inputs (News or YT Video Search)
                  <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          className={`w-full rounded-lg border-gray-300 border p-2 focus:ring-2 outline-none transition-shadow ${dataSource === 'youtube' ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
                          placeholder={dataSource === 'youtube' ? "e.g. Dhaka protest" : "e.g. economy AND (inflation OR tax)"}
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
                          </div>
                        </div>
                      </div>
                  </>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all disabled:opacity-70 disabled:cursor-wait ${dataSource === 'youtube' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? 'Processing...' : 'Run Analysis'}
              </button>
            </form>
          </div>

          {dataSource === 'news' && <OperatorGuide />}
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dataSource === 'youtube' ? 'bg-red-50' : 'bg-indigo-50'}`}>
                {dataSource === 'youtube' ? <Youtube className="w-8 h-8 text-red-500" /> : <Newspaper className="w-8 h-8 text-indigo-500" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900">Ready to Analyze</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                Configure your parameters on the left and click "Run Analysis" to fetch real-time intelligence.
              </p>
            </div>
          )}
          
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className={`w-10 h-10 animate-spin mb-4 ${dataSource === 'youtube' ? 'text-red-600' : 'text-indigo-600'}`} />
                <h3 className="text-lg font-medium text-gray-900">Analyzing Sources</h3>
                <p className="text-gray-500 mt-2">Retrieving data from {dataSource === 'youtube' ? 'YouTube' : 'Google News'}...</p>
            </div>
          )}

          {executedSearch && hasResults && !loading && (
            <>
              {/* Stats Bar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Found <strong>
                            {hasNews ? articles.length : (hasVideos ? videos.length : comments.length)}
                        </strong> items</span>
                    </div>
                    {/* Show filters context only for Search modes, not direct link scrape */}
                    {activeSearch && (
                        <div className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            <span>{getCountryName(activeSearch.country)}</span>
                            <span className="text-gray-300">|</span>
                            <span>{getLanguageName(activeSearch.language)}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* News Results List */}
              {hasNews && (
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
              )}

              {/* YouTube Results Grid (Search Mode) */}
              {hasVideos && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map((video) => (
                      <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                         <div className="relative aspect-video bg-gray-100">
                            <img 
                                src={video.thumbnailUrl} 
                                alt={video.title} 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors" />
                            <a 
                                href={video.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-red-600 transition-colors"
                            >
                                <Youtube className="w-3 h-3" /> Watch
                            </a>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 leading-snug">
                                <a href={video.link} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
                                    {video.title}
                                </a>
                            </h3>
                            <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                <span className="font-medium text-gray-700">{video.channelTitle}</span>
                                <span>•</span>
                                <span>{new Date(video.publishTime).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
                                {video.description}
                            </p>
                         </div>
                      </div>
                    ))}
                  </div>
              )}

              {/* YouTube Comments List (Comment Mode) */}
              {hasComments && (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-red-500" /> Top Level Comments
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {comments.map((comment) => (
                            <div key={comment.id} className="p-5 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <img 
                                        src={comment.authorProfileImageUrl} 
                                        alt={comment.authorDisplayName}
                                        className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900">{comment.authorDisplayName}</span>
                                            <span className="text-xs text-gray-500">{new Date(comment.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.textOriginal}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <div className="flex items-center gap-1" title="Likes">
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                                <span>{comment.likeCount}</span>
                                            </div>
                                            {comment.replyCount > 0 && (
                                                <div className="flex items-center gap-1" title="Replies">
                                                    <MessageCircle className="w-3.5 h-3.5" />
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
              )}

            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
