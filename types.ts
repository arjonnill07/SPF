
export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
  description: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishTime: string;
  link: string;
}

export interface CommentItem {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
  videoLink: string;
}

export type DataSource = 'news' | 'youtube';
export type YoutubeMode = 'search' | 'comments';

export interface SearchParams {
  query: string;
  startDate: string;
  endDate: string;
  language: string;
  country: string;
}

export enum LoginState {
  LOGGED_OUT,
  LOGGED_IN,
}

export interface User {
  username: string;
  role: 'admin' | 'analyst';
}

export interface AppSettings {
  defaultCountry: string;
  defaultLanguage: string;
  compactMode: boolean;
}

export const COUNTRIES = [
  { code: 'BD', name: 'Bangladesh' },
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
];

export const LANGUAGES = [
  { code: 'bn', name: 'Bangla' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
];
