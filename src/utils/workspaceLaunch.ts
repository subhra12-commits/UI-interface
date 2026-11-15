import type { ProjectId, WorkspaceProject } from '../data/projects';

const CUSTOM_URL_STORAGE_PREFIX = 'mh_workspace_url_v1_';

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl: string | null;
  error: string | null;
}

export function validateWorkspaceUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: null,
      error: 'Please enter an application URL starting with https:// or http://.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalizedUrl: null,
      error: 'Enter a valid URL (for example, https://your-app.onrender.com/).',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      normalizedUrl: null,
      error: 'Only http:// and https:// URLs are supported.',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    error: null,
  };
}

export function getStorageKey(projectId: ProjectId): string {
  return `${CUSTOM_URL_STORAGE_PREFIX}${projectId}`;
}

export function loadCustomProjectUrl(
  projectId: ProjectId,
  storage?: Pick<Storage, 'getItem'> | null
): string | null {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return null;

  try {
    const raw = store.getItem(getStorageKey(projectId));
    if (!raw) return null;
    const validation = validateWorkspaceUrl(raw);
    return validation.valid ? validation.normalizedUrl : null;
  } catch {
    return null;
  }
}

export function saveCustomProjectUrl(
  projectId: ProjectId,
  rawUrl: string,
  storage?: Pick<Storage, 'setItem'> | null
): UrlValidationResult {
  const validation = validateWorkspaceUrl(rawUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    return validation;
  }

  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (store) {
    try {
      store.setItem(getStorageKey(projectId), validation.normalizedUrl);
    } catch {
      // Ignore storage quota errors while returning validated URL
    }
  }

  return validation;
}

export function clearCustomProjectUrl(
  projectId: ProjectId,
  storage?: Pick<Storage, 'removeItem'> | null
): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;

  try {
    store.removeItem(getStorageKey(projectId));
  } catch {
    // Ignore storage removal errors
  }
}

export function resolveProjectUrl(
  project: Pick<WorkspaceProject, 'id' | 'defaultUrl' | 'configurable'>,
  customUrls: Partial<Record<ProjectId, string | null>>
): string | null {
  if (project.configurable) {
    const custom = customUrls[project.id];
    if (custom) {
      const check = validateWorkspaceUrl(custom);
      if (check.valid && check.normalizedUrl) return check.normalizedUrl;
    }
  }
  return project.defaultUrl;
}

export function formatMailtoHref(email: string, subject?: string): string {
  const cleanEmail = email.trim();
  if (!subject) return `mailto:${cleanEmail}`;
  return `mailto:${cleanEmail}?subject=${encodeURIComponent(subject)}`;
}

export function formatTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, '');
  return `tel:${normalized}`;
}

export interface ProbeResult {
  reachable: boolean;
  timedOut: boolean;
  reason?: string;
}

export async function probeWorkspaceEndpoint(
  url: string,
  options: {
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<ProbeResult> {
  const timeoutMs = options.timeoutMs ?? 6000;
  const fetchFn = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  let didTimeout = false;

  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    await fetchFn(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return { reachable: true, timedOut: false };
  } catch (err) {
    if (didTimeout) {
      return {
        reachable: false,
        timedOut: true,
        reason: 'The destination application took too long to respond.',
      };
    }
    const message = err instanceof Error ? err.message : 'Network connection error';
    return {
      reachable: false,
      timedOut: false,
      reason: message,
    };
  } finally {
    clearTimeout(timer);
  }
}
