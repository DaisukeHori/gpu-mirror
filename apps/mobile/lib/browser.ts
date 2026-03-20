type BrowserLocation = {
  href: string;
  origin: string;
  assign: (url: string) => void;
};

type BrowserHistory = {
  length: number;
  replaceState: (data: unknown, unused: string, url?: string) => void;
};

export function getBrowserLocation(): BrowserLocation | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const location = (window as { location?: Partial<BrowserLocation> }).location;
  if (
    !location ||
    typeof location.href !== 'string' ||
    typeof location.origin !== 'string' ||
    typeof location.assign !== 'function'
  ) {
    return null;
  }

  return location as BrowserLocation;
}

export function getBrowserHistoryLength(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const history = (window as { history?: Partial<BrowserHistory> }).history;
  return typeof history?.length === 'number' ? history.length : null;
}

export function replaceBrowserHistory(url: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const history = (window as { history?: Partial<BrowserHistory> }).history;
  if (!history || typeof history.replaceState !== 'function') {
    return false;
  }

  history.replaceState({}, document.title, url);
  return true;
}
