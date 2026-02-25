import { TrackedAccount, Summary, AppSettings } from './types';

const KEYS = {
  settings: 'xtracker_settings',
  accounts: 'xtracker_accounts',
  summaries: 'xtracker_summaries',
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(): AppSettings {
  return getItem<AppSettings>(KEYS.settings, {
    claudeApiKey: '',
    xApiBearerToken: '',
  });
}

export function saveSettings(settings: AppSettings): void {
  setItem(KEYS.settings, settings);
}

export function getAccounts(): TrackedAccount[] {
  return getItem<TrackedAccount[]>(KEYS.accounts, []);
}

export function saveAccounts(accounts: TrackedAccount[]): void {
  setItem(KEYS.accounts, accounts);
}

export function addAccount(account: TrackedAccount): TrackedAccount[] {
  const accounts = getAccounts();
  const exists = accounts.some(
    (a) => a.handle.toLowerCase() === account.handle.toLowerCase()
  );
  if (!exists) {
    accounts.push(account);
    saveAccounts(accounts);
  }
  return accounts;
}

export function removeAccount(handle: string): TrackedAccount[] {
  const accounts = getAccounts().filter(
    (a) => a.handle.toLowerCase() !== handle.toLowerCase()
  );
  saveAccounts(accounts);
  return accounts;
}

export function getSummaries(): Summary[] {
  return getItem<Summary[]>(KEYS.summaries, []);
}

export function saveSummaries(summaries: Summary[]): void {
  setItem(KEYS.summaries, summaries);
}

export function addSummary(summary: Summary): Summary[] {
  const summaries = getSummaries();
  summaries.unshift(summary);
  // Keep max 200 summaries
  const trimmed = summaries.slice(0, 200);
  saveSummaries(trimmed);
  return trimmed;
}

export function getSummariesByHandle(handle: string): Summary[] {
  return getSummaries().filter(
    (s) => s.authorHandle.toLowerCase() === handle.toLowerCase()
  );
}

export function parseXHandle(input: string): string | null {
  const trimmed = input.trim();
  // Handle URL format: https://x.com/username or https://twitter.com/username
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/(@?[\w]+)\/?/
  );
  if (urlMatch) return urlMatch[1].replace('@', '');
  // Handle @username format
  if (trimmed.startsWith('@')) return trimmed.slice(1);
  // Handle plain username
  if (/^[\w]+$/.test(trimmed)) return trimmed;
  return null;
}
