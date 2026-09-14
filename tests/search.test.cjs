const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the shipped inline script without adding a build or runtime dependency.
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const window = { location: {} };
window.top = window.self = window;
const context = { URL, URLSearchParams, window };
vm.createContext(context);
vm.runInContext(script.replace(/  \/\* ---------------- BOOT[\s\S]*$/, '\nglobalThis.search = { parseScope, getParams, buildGithubUrl };\n})();'), context);
const { parseScope, getParams, buildGithubUrl } = context.search;
const query = (...args) => new URL(buildGithubUrl(...args)).searchParams.get('q');

test('organization, personal account, and repository use distinct qualifiers', () => {
  assert.equal(query('auth', 'acme', 'code', 'org'), 'org:acme auth');
  assert.equal(query('auth', 'octocat', 'code', 'user'), 'user:octocat auth');
  assert.equal(query('auth', 'acme/project', 'code', 'repo'), 'repo:acme/project auth');
});
test('repository path is recognized even with organization selected', () => {
  assert.equal(query('auth', 'acme/project', 'code', 'org'), 'repo:acme/project auth');
});
test('GitHub URLs and surrounding whitespace are normalized', () => {
  assert.equal(parseScope(' https://github.com/acme/ ', 'org').value, 'acme');
  assert.equal(query('auth', 'https://github.com/acme/project/?tab=readme#top', 'code', 'org'), 'repo:acme/project auth');
});
test('invalid or empty scoped input never falls back to global search', () => {
  for (const value of ['', ' ', 'acme team', '-acme', 'acme-', 'acme--team', 'acme/', 'acme/..', 'acme/project/tree/main']) {
    assert.throws(() => buildGithubUrl('auth', value, 'code', 'org'), undefined, value);
  }
  assert.throws(() => buildGithubUrl('auth', 'acme', 'code', 'repo'));
  assert.throws(() => buildGithubUrl('auth', 'acme', 'code', 'invalid'));
});
test('unrelated and credential-bearing URLs are rejected', () => {
  for (const value of ['https://example.com/acme', 'https://github.com.example.com/acme', 'https://user@github.com/acme', 'https://github.com:8443/acme']) {
    assert.throws(() => parseScope(value, 'org'), undefined, value);
  }
});
test('global search remains unscoped', () => {
  assert.equal(query('hello', '', 'repositories', ''), 'hello');
});
test('legacy shared links preserve username scope and default type', () => {
  const p = getParams('?q=auth&u=octocat');
  assert.equal(p.kind, 'user');
  assert.equal(p.type, 'repositories');
  assert.equal(query(p.q, p.user, p.type, p.kind), 'user:octocat auth');
});
test('explicit scopes survive shared link parsing', () => {
  for (const [s, u] of [['org', 'acme'], ['user', 'octocat'], ['repo', 'acme/project']]) {
    const p = getParams('?' + new URLSearchParams({ q: 'auth', u, s, t: 'code' }));
    assert.equal(query(p.q, p.user, p.type, p.kind), `${s}:${u} auth`);
  }
});
test('invalid shared link scope is retained for an error, never silently dropped', () => {
  for (const search of ['?q=auth&u=bad+name', '?q=auth&s=org', '?q=auth&u=', '?q=auth&u=acme&s=invalid']) {
    const p = getParams(search);
    assert.throws(() => buildGithubUrl(p.q, p.user, p.type, p.kind));
  }
});
test('query punctuation and Unicode round-trip without changing destination', () => {
  const q = '100% "café" C++ & x=y #notes ?';
  const url = new URL(buildGithubUrl(q, 'acme', 'code', 'org'));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/search');
  assert.equal(url.searchParams.get('q'), `org:acme ${q}`);
  assert.equal(url.searchParams.size, 2);
});
test('unsupported search types fall back to repositories', () => {
  for (const t of ['not-a-type', 'constructor', '__proto__']) {
    assert.equal(new URL(buildGithubUrl('auth', '', t)).searchParams.get('type'), 'repositories');
  }
});

function creator() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', style: {}, listeners: {}, children: [],
      addEventListener(event, listener) { this.listeners[event] = listener; },
      removeAttribute() {}, scrollIntoView() {},
    });
    return elements.get(id);
  }
  element('type').value = 'repositories';
  element('scopeKind').value = 'org';
  const win = { location: { search: '', origin: 'https://lmgstfy.fun', pathname: '/' } };
  win.top = win.self = win;
  vm.runInNewContext(script, { window: win, document: { getElementById: element }, URL, URLSearchParams });
  return {
    element,
    scope(value) {
      element('scopeSeg').listeners.click({ target: { closest() { return { getAttribute() { return value; } }; } } });
    },
    type(value) {
      element('type').value = value;
      element('type').listeners.change();
    },
  };
}

test('Our repos defaults to Code and generates the reported repository search', () => {
  const ui = creator();
  ui.scope('user');
  assert.equal(ui.element('type').value, 'code');
  ui.element('q').value = 'cve-2024-13346';
  ui.element('user').value = 'hadriansecurity/nuclei-templates';
  ui.element('genBtn').listeners.click();
  const shared = new URL(ui.element('genLink').value);
  assert.equal(shared.searchParams.get('s'), 'repo');
  assert.equal(shared.searchParams.get('t'), 'code');
  assert.equal(new URL(ui.element('destination').href).searchParams.get('q'), 'repo:hadriansecurity/nuclei-templates cve-2024-13346');
});
test('scope defaults follow the selected scope until a type is chosen', () => {
  const ui = creator();
  ui.scope('user');
  ui.scope('all');
  assert.equal(ui.element('type').value, 'repositories');
  ui.scope('user');
  assert.equal(ui.element('type').value, 'code');
});
test('explicit search type is preserved across scope changes', () => {
  for (const type of ['issues', 'repositories', 'code']) {
    const ui = creator();
    ui.type(type);
    ui.scope('user');
    assert.equal(ui.element('type').value, type);
    ui.scope('all');
    assert.equal(ui.element('type').value, type);
  }
});
