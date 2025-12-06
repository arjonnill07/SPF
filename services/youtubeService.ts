
import { VideoItem, SearchParams, CommentItem, YouTubeResponse } from '../types';

const YOUTUBE_SEARCH_BASE = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_COMMENTS_BASE = "https://www.googleapis.com/youtube/v3/commentThreads";

export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const fetchVideos = async (
  params: SearchParams, 
  apiKey: string, 
  pageToken?: string
): Promise<YouTubeResponse<VideoItem>> => {
  if (!apiKey) {
    throw new Error("YouTube API Key is required for video search.");
  }

  const { query, startDate, endDate, language, country } = params;

  // Convert dates to RFC 3339 format required by YouTube API
  const publishedAfter = startDate ? new Date(startDate).toISOString() : undefined;
  // Set end date to end of day
  const publishedBefore = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString() : undefined;

  const urlParams = new URLSearchParams({
    part: 'snippet',
    maxResults: '12', // Slightly reduced batch size for smoother pagination
    q: query,
    type: 'video',
    key: apiKey,
    regionCode: country,
    relevanceLanguage: language,
  });

  if (publishedAfter) urlParams.append('publishedAfter', publishedAfter);
  if (publishedBefore) urlParams.append('publishedBefore', publishedBefore);
  if (pageToken) urlParams.append('pageToken', pageToken);

  try {
    const response = await fetch(`${YOUTUBE_SEARCH_BASE}?${urlParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `YouTube API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items) return { items: [] };

    const items = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishTime: item.snippet.publishedAt,
      link: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    return {
      items,
      nextPageToken: data.nextPageToken
    };

  } catch (error) {
    console.error("YouTube Fetch Error:", error);
    throw error;
  }
};

export const fetchVideoComments = async (
  url: string, 
  apiKey: string,
  pageToken?: string
): Promise<YouTubeResponse<CommentItem>> => {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please check the link and try again.");
  }
  
  if (!apiKey) {
    throw new Error("YouTube API Key is required.");
  }

  const urlParams = new URLSearchParams({
    part: 'snippet',
    videoId: videoId,
    maxResults: '50',
    key: apiKey,
    textFormat: 'plainText'
  });

  if (pageToken) urlParams.append('pageToken', pageToken);

  try {
    const response = await fetch(`${YOUTUBE_COMMENTS_BASE}?${urlParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      if (errorData.error?.errors?.[0]?.reason === 'commentsDisabled') {
        throw new Error("Comments are disabled for this video.");
      }
      
      throw new Error(errorData.error?.message || `YouTube API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items) return { items: [] };

    const items = data.items.map((item: any) => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        authorDisplayName: snippet.authorDisplayName,
        authorProfileImageUrl: snippet.authorProfileImageUrl,
        textDisplay: snippet.textDisplay,
        textOriginal: snippet.textOriginal,
        likeCount: snippet.likeCount,
        publishedAt: snippet.publishedAt,
        replyCount: item.snippet.totalReplyCount,
        videoLink: `https://www.youtube.com/watch?v=${videoId}`
      };
    });

    return {
      items,
      nextPageToken: data.nextPageToken
    };

  } catch (error) {
    console.error("YouTube Comments Fetch Error:", error);
    throw error;
  }
};

export const exportVideosToCSV = (videos: VideoItem[]) => {
  if (videos.length === 0) return;

  const headers = ['Date', 'Channel', 'Title', 'Link', 'Description'];
  const rows = videos.map(v => {
    const safeTitle = (v.title || "").replace(/"/g, '""').replace(/\n/g, " ");
    const safeChannel = (v.channelTitle || "").replace(/"/g, '""');
    const safeDesc = (v.description || "").replace(/"/g, '""').replace(/\n/g, " ");
    const safeDate = new Date(v.publishTime).toLocaleString().replace(/"/g, '""');
    
    return `"${safeDate}","${safeChannel}","${safeTitle}","${v.link}","${safeDesc}"`;
  });

  generateCSV(headers, rows, 'video_intel_report');
};

export const exportCommentsToCSV = (comments: CommentItem[]) => {
  if (comments.length === 0) return;

  const headers = ['Date', 'Author', 'Comment', 'Likes', 'Replies', 'Video Link'];
  const rows = comments.map(c => {
    const safeAuthor = (c.authorDisplayName || "").replace(/"/g, '""');
    const safeText = (c.textOriginal || "").replace(/"/g, '""').replace(/\n/g, " ");
    const safeDate = new Date(c.publishedAt).toLocaleString().replace(/"/g, '""');
    
    return `"${safeDate}","${safeAuthor}","${safeText}","${c.likeCount}","${c.replyCount}","${c.videoLink}"`;
  });

  generateCSV(headers, rows, 'comment_intel_report');
};

const generateCSV = (headers: string[], rows: string[], filenamePrefix: string) => {
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.csv`;
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
