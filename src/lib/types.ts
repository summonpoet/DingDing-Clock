export interface TrackedAccount {
  handle: string;
  name: string;
  addedAt: string;
  profileImageUrl?: string;
  xUserId?: string;
}

export interface Tweet {
  id: string;
  text: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
  url: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface Summary {
  id: string;
  authorHandle: string;
  authorName: string;
  tweets: Tweet[];
  summary: string;
  keyInsights: string[];
  research: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface AppSettings {
  claudeApiKey: string;
  xApiBearerToken: string;
}

export interface AppState {
  settings: AppSettings;
  accounts: TrackedAccount[];
  summaries: Summary[];
}
