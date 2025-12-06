export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  guid: string;
  description: string;
}

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