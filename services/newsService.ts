import { NewsArticle, SearchParams } from '../types';

// Primary and Backup Proxies for High Availability
const PROXY_PRIMARY = "https://api.allorigins.win/get?url=";
const PROXY_BACKUP = "https://corsproxy.io/?";
const GOOGLE_NEWS_BASE = "https://news.google.com/rss/search";

// Helper to decode HTML entities safely
const decodeHtmlEntities = (text: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<!doctype html><body>${text}`, "text/html");
    return doc.body.textContent || text;
  } catch (e) {
    return text;
  }
};

// Helper to fetch with timeout
const fetchWithTimeout = async (url: string, timeoutMs: number = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const fetchNews = async (params: SearchParams): Promise<NewsArticle[]> => {
  const { query, startDate, endDate, language, country } = params;

  let fullQuery = query;
  if (startDate) fullQuery += ` after:${startDate}`;
  if (endDate) fullQuery += ` before:${endDate}`;

  const encodedQuery = encodeURIComponent(fullQuery);
  
  // Strict casing for Google News params
  const safeLang = language.toLowerCase();
  const safeCountry = country.toUpperCase();
  
  const hl = `${safeLang}-${safeCountry}`; // e.g., en-US
  const gl = safeCountry;                // e.g., US
  const ceid = `${safeCountry}:${safeLang}`; // e.g., US:en

  const rssUrl = `${GOOGLE_NEWS_BASE}?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  // Strategy: Try Primary Proxy -> If Fail -> Try Backup Proxy
  try {
    return await attemptFetch(PROXY_PRIMARY, rssUrl, true);
  } catch (primaryError) {
    console.warn("Primary proxy failed, switching to backup...", primaryError);
    try {
      return await attemptFetch(PROXY_BACKUP, rssUrl, false);
    } catch (backupError) {
      console.error("All proxies failed:", backupError);
      throw new Error("Unable to connect to Google News. Please check your internet connection or try again later.");
    }
  }
};

const attemptFetch = async (proxyBase: string, targetUrl: string, isAllOrigins: boolean): Promise<NewsArticle[]> => {
  // Add timestamp to prevent caching
  const finalUrl = isAllOrigins 
    ? `${proxyBase}${encodeURIComponent(targetUrl)}&disableCache=true&_=${Date.now()}`
    : `${proxyBase}${encodeURIComponent(targetUrl)}?_=${Date.now()}`; // corsproxy style

  const response = await fetchWithTimeout(finalUrl, 12000);

  if (!response.ok) {
    throw new Error(`Proxy responded with status: ${response.status}`);
  }

  let xmlText = "";
  
  if (isAllOrigins) {
    const data = await response.json();
    if (!data.contents) throw new Error("Proxy returned empty content");
    xmlText = data.contents;
  } else {
    // Backup proxy returns raw text usually
    xmlText = await response.text();
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  // Check for XML parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Failed to parse news feed format.");
  }

  const items = xmlDoc.querySelectorAll("item");
  const articles: NewsArticle[] = [];

  if (items.length === 0) {
    // This is valid, just empty results
    return [];
  }

  items.forEach((item) => {
    // Safe extraction with fallbacks
    const rawTitle = item.querySelector("title")?.textContent || "No Title";
    const title = decodeHtmlEntities(rawTitle);
    
    const link = item.querySelector("link")?.textContent || "";
    const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
    
    const rawDesc = item.querySelector("description")?.textContent || "";
    // We keep description as HTML string for the UI to render, but you could decode it if you prefer plain text
    // Here we decode entities (like &lt;) back to tags (<) so the UI can render the HTML snippet
    const description = decodeHtmlEntities(rawDesc);

    const source = item.querySelector("source")?.textContent || "Google News";
    const guid = item.querySelector("guid")?.textContent || Math.random().toString(36).substring(7);

    // Basic validation to filter out broken items
    if (link && title) {
      articles.push({
        title,
        link,
        pubDate,
        description,
        source,
        guid
      });
    }
  });

  return articles;
};

export const exportToCSV = (articles: NewsArticle[]) => {
  if (articles.length === 0) return;

  const headers = ['Date', 'Source', 'Title', 'Link'];
  const rows = articles.map(a => {
    // Sanitize fields for CSV to prevent breaking the format
    const safeTitle = (a.title || "").replace(/"/g, '""').replace(/\n/g, " ");
    const safeSource = (a.source || "").replace(/"/g, '""');
    const safeDate = new Date(a.pubDate).toLocaleString().replace(/"/g, '""');
    
    return `"${safeDate}","${safeSource}","${safeTitle}","${a.link}"`;
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  // Sanitize filename
  const safeFilename = `news_report_${new Date().toISOString().slice(0,10)}.csv`;
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};