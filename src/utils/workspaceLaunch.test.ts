import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearCustomProjectUrl,
  formatMailtoHref,
  formatTelHref,
  loadCustomProjectUrl,
  probeWorkspaceEndpoint,
  resolveProjectUrl,
  saveCustomProjectUrl,
  validateWorkspaceUrl,
} from './workspaceLaunch';
import { MOTHERS_HUT_CONTACT, WORKSPACE_PROJECTS } from '../data/projects';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

test('WORKSPACE_PROJECTS contains exactly 4 named modules with expected default URLs', () => {
  assert.equal(WORKSPACE_PROJECTS.length, 4);
  const byName = new Map(WORKSPACE_PROJECTS.map((p) => [p.name, p]));

  assert.equal(byName.get('Meal Verifier System')?.defaultUrl, 'https://mh-meal-verifier-1.onrender.com/');
  assert.equal(byName.get('Kitchen Hygiene Monitoring')?.defaultUrl, 'https://kitchen-monitor.onrender.com/');
  assert.equal(byName.get('Smart Parking Analyzer')?.defaultUrl, 'https://mothers-hut-backend.onrender.com/');
  assert.equal(byName.get('Customer Grouping & Marketing Strategy Manager')?.defaultUrl, 'https://mothers-hut-backend.onrender.com/');
});

test('validateWorkspaceUrl accepts valid http/https URLs and rejects unsafe or empty inputs', () => {
  const ok = validateWorkspaceUrl('  https://example.onrender.com/dashboard  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalizedUrl, 'https://example.onrender.com/dashboard');
  assert.equal(ok.error, null);

  const empty = validateWorkspaceUrl('   ');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const badScheme = validateWorkspaceUrl('javascript:alert(1)');
  assert.equal(badScheme.valid, false);
  assert.ok(badScheme.error);

  const malformed = validateWorkspaceUrl('not-a-valid-url');
  assert.equal(malformed.valid, false);
});

test('custom URL persistence round-trips cleanly and resolves configurable project', () => {
  const storage = createMemoryStorage();
  const configurableProject = {
    id: 'customer-marketing' as const,
    defaultUrl: null,
    configurable: true,
  };

  assert.equal(resolveProjectUrl(configurableProject, {}), null);
  assert.equal(loadCustomProjectUrl('customer-marketing', storage), null);

  const saved = saveCustomProjectUrl('customer-marketing', 'https://mh-crm.onrender.com', storage);
  assert.equal(saved.valid, true);
  assert.equal(saved.normalizedUrl, 'https://mh-crm.onrender.com/');

  const loaded = loadCustomProjectUrl('customer-marketing', storage);
  assert.equal(loaded, 'https://mh-crm.onrender.com/');
  assert.equal(
    resolveProjectUrl(configurableProject, { 'customer-marketing': loaded }),
    'https://mh-crm.onrender.com/'
  );

  clearCustomProjectUrl('customer-marketing', storage);
  assert.equal(loadCustomProjectUrl('customer-marketing', storage), null);
});

test('contact link helpers format official Mother\'s Hut email and phone cleanly', () => {
  assert.equal(
    formatMailtoHref(MOTHERS_HUT_CONTACT.email),
    'mailto:care.mothershut@gmail.com'
  );
  assert.equal(
    formatTelHref(MOTHERS_HUT_CONTACT.phoneDisplay),
    'tel:+919002525999'
  );
});

test('probeWorkspaceEndpoint handles success, network failure, and timeout gracefully', async () => {
  const okResult = await probeWorkspaceEndpoint('https://mh-meal-verifier-1.onrender.com/', {
    fetchImpl: async () => new Response(null, { status: 200 }),
  });
  assert.equal(okResult.reachable, true);
  assert.equal(okResult.timedOut, false);

  const failResult = await probeWorkspaceEndpoint('https://unreachable.invalid/', {
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  assert.equal(failResult.reachable, false);
  assert.equal(failResult.timedOut, false);
  assert.equal(failResult.reason, 'Failed to fetch');

  const timeoutResult = await probeWorkspaceEndpoint('https://slow.example/', {
    timeoutMs: 15,
    fetchImpl: (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  });
  assert.equal(timeoutResult.reachable, false);
  assert.equal(timeoutResult.timedOut, true);
});
