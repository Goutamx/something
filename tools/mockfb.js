/* Development-only in-memory Firebase compat double. Never loaded by index.html.
 * Models document/query snapshots, merged/dotted updates, auth, batches and
 * FieldValue operations. It does NOT validate Firebase security rules or OAuth.
 */
(() => {
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const now = Date.now();
  const user = {
    uid: 'goutam', displayName: 'Goutam', email: 'goutam@example.test',
    photoURL: null, isAnonymous: false,
    providerData: [{ providerId: 'google.com', uid: 'google-goutam' }],
    getIdToken: () => Promise.resolve('test-only-token')
  };
  const member = (displayName, age, extra = {}) => ({
    displayName, authProvider: 'google', avatarColor: '#5E6AD2',
    updatedAt: now - age, lastSeen: now - age,
    xp: 0, percent: 0, subjects: ['English', 'History'], ...extra
  });
  const seed = {
    'leagues/STUDY1': { code: 'STUDY1', name: 'Class 12 — Official League' },
    'leagues/STUDY1/members/goutam': member('Goutam', 0),
    'leagues/STUDY1/members/madhaw-old': member('Madhaw', 86400000, { xp: 200 }),
    'leagues/STUDY1/members/priya': member('Priya', 1000),
    'leagues/STUDY1/members/kabir': member('Kabir', 2000),
    'leagues/STUDY1/members/madhaw-new': member('Madhaw', 500),
    'leagues/STUDY1/members/nameless': member('  ', 500),
    'leagues/STUDY1/members/anonymous': member('Anonymous ghost', 500, { authProvider: 'anonymous' }),
    'leagues/STUDY1/messages/welcome': {
      text: 'Welcome to our Class 12 league', senderUid: 'priya', senderName: 'Priya',
      senderColor: '#5E6AD2', createdAt: now - 60000, reactions: {}
    },
    'leagues/STUDY1/sharedNotes/history-note': {
      title: 'Harappan revision', content: 'Revise town planning and seals.',
      subjectKey: 'History', book: 'ThemesInIndianHistory', chapter: '1. Bricks, Beads and Bones',
      authorUid: 'priya', authorName: 'Priya',
      authorColor: '#5E6AD2', createdAt: now - 60000, votes: {}, commentsCount: 0
    }
  };
  for (const [path, row] of Object.entries(seed)) {
    if (/^leagues\/STUDY1\/members\/[^/]+$/.test(path)) row.uid = path.split('/').at(-1);
  }
  const data = new Map(Object.entries(seed));
  const watchers = new Set();
  const writes = [];
  let sequence = 0;
  const getField = (obj, path) => path.split('.').reduce((v, k) => v == null ? undefined : v[k], obj);
  const resolveField = (value, previous) => {
    if (value && value.__operation === 'increment') return (Number(previous) || 0) + value.amount;
    if (value && value.__operation === 'arrayUnion') return [...new Set([...(previous || []), ...value.values])];
    if (value && value.__operation === 'arrayRemove') return (previous || []).filter(x => !value.values.includes(x));
    return copy(value);
  };
  const setField = (obj, path, value) => {
    const keys = path.split('.');
    let target = obj;
    for (const k of keys.slice(0, -1)) target = target[k] || (target[k] = {});
    const key = keys.at(-1);
    if (value && value.__operation === 'delete') delete target[key];
    else target[key] = resolveField(value, target[key]);
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function docSnapshot(path) {
    const value = data.get(path);
    return { id: path.split('/').at(-1), exists: value !== undefined,
      ref: new Ref(path, true), data: () => copy(value), get: key => getField(value, key) };
  }
  class Ref {
    constructor(path, isDoc = false, filters = [], orders = [], cap = Infinity) {
      Object.assign(this, { path, isDoc, filters, orders, cap });
      this.id = path.split('/').at(-1);
    }
    doc(id = `auto-${++sequence}`) { return new Ref(`${this.path}/${id}`, true); }
    collection(name) { return new Ref(`${this.path}/${name}`); }
    where(...filter) { return new Ref(this.path, false, [...this.filters, filter], this.orders, this.cap); }
    orderBy(key, direction = 'asc') { return new Ref(this.path, false, this.filters, [...this.orders, [key, direction]], this.cap); }
    limit(n) { return new Ref(this.path, false, this.filters, this.orders, n); }
    get() { return Promise.resolve(this.snapshot()); }
    snapshot() {
      if (this.isDoc) return docSnapshot(this.path);
      let docs = [...data.keys()].filter(path => path.startsWith(this.path + '/') && path.slice(this.path.length + 1).indexOf('/') < 0).map(docSnapshot);
      docs = docs.filter(doc => this.filters.every(([key, op, expected]) => {
        const actual = doc.get(key);
        switch (op) {
          case '==': return same(actual, expected);
          case '!=': return !same(actual, expected);
          case '>=': return actual >= expected;
          case '>': return actual > expected;
          case '<=': return actual <= expected;
          case '<': return actual < expected;
          case 'in': return expected.includes(actual);
          case 'array-contains': return (actual || []).includes(expected);
          default: throw new Error(`Mock query operator not implemented: ${op}`);
        }
      }));
      if (this.orders.length) docs.sort((a, b) => {
        for (const [key, dir] of this.orders) {
          const x = a.get(key), y = b.get(key);
          if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1);
        }
        return 0;
      });
      docs = docs.slice(0, this.cap);
      return { docs, size: docs.length, empty: !docs.length,
        forEach: fn => docs.forEach(fn), docChanges: () => docs.map(doc => ({ type: 'added', doc })) };
    }
    onSnapshot(next, error) {
      if (typeof next === 'object') { error = next.error; next = next.next; }
      const watcher = { ref: this, next, error, active: true, queued: false };
      watchers.add(watcher);
      schedule(watcher);
      return () => { watcher.active = false; watchers.delete(watcher); };
    }
    set(value, options = {}) {
      const previous = data.get(this.path);
      const updated = options.merge ? copy(previous || {}) : {};
      for (const [key, entry] of Object.entries(value)) setField(updated, key, entry);
      writes.push({ path: this.path, type: 'set', value: copy(value) });
      if (!same(previous, updated)) { data.set(this.path, updated); notify(this.path); }
      return Promise.resolve();
    }
    update(value) { return this.set(value, { merge: true }); }
    delete() {
      if (data.delete(this.path)) notify(this.path);
      writes.push({ path: this.path, type: 'delete' });
      return Promise.resolve();
    }
    add(value) { const ref = this.doc(); return ref.set(value).then(() => ref); }
  }
  function schedule(watcher) {
    if (watcher.queued) return;
    watcher.queued = true;
    setTimeout(() => {
      watcher.queued = false;
      if (!watcher.active) return;
      try { watcher.next(watcher.ref.snapshot()); }
      catch (error) { window.__mockErrors.push(error.stack || String(error)); throw error; }
    }, 0);
  }
  function notify(path) {
    for (const watcher of watchers) {
      if (watcher.ref.isDoc ? watcher.ref.path === path : path.slice(0, path.lastIndexOf('/')) === watcher.ref.path) schedule(watcher);
    }
  }
  const db = {
    collection: path => new Ref(path), doc: path => new Ref(path, true),
    enablePersistence: () => Promise.resolve(), settings: () => {},
    batch() {
      const operations = [];
      const batch = {
        set: (...args) => { operations.push(() => args[0].set(...args.slice(1))); return batch; },
        update: (ref, value) => { operations.push(() => ref.update(value)); return batch; },
        delete: ref => { operations.push(() => ref.delete()); return batch; },
        commit: () => Promise.all(operations.map(op => op()))
      };
      return batch;
    },
    runTransaction: fn => fn({ get: ref => ref.get(), set: (ref, ...args) => ref.set(...args), update: (ref, value) => ref.update(value) })
  };
  const authListeners = new Set();
  const authState = {
    currentUser: user,
    onAuthStateChanged(callback) {
      authListeners.add(callback);
      setTimeout(() => { if (authListeners.has(callback)) callback(authState.currentUser); }, 0);
      return () => authListeners.delete(callback);
    },
    getRedirectResult: () => Promise.resolve(null),
    setPersistence: () => Promise.resolve(),
    signOut: () => { authState.currentUser = null; authListeners.forEach(fn => fn(null)); return Promise.resolve(); },
    signInWithPopup: () => Promise.resolve({ user }),
    signInWithRedirect: () => Promise.resolve()
  };
  function auth() { return authState; }
  auth.GoogleAuthProvider = class { setCustomParameters() {} addScope() {} };
  auth.Auth = { Persistence: { LOCAL: 'local' } };
  function firestore() { return db; }
  firestore.FieldValue = {
    serverTimestamp: () => Date.now(), delete: () => ({ __operation: 'delete' }),
    increment: amount => ({ __operation: 'increment', amount }),
    arrayUnion: (...values) => ({ __operation: 'arrayUnion', values }),
    arrayRemove: (...values) => ({ __operation: 'arrayRemove', values })
  };
  firestore.Timestamp = { now: () => Date.now(), fromDate: date => date.getTime(), fromMillis: ms => ms };
  window.__mockErrors = [];
  window.__mockFB = {
    writes, read: path => copy(data.get(path)),
    dump: () => Object.fromEntries([...data].map(([k, v]) => [k, copy(v)])),
    seed: (path, value) => { data.set(path, copy(value)); notify(path); }
  };
  window.firebase = { apps: [], initializeApp(config) { this.apps.push({ options: config }); return this.apps[0]; }, auth, firestore };
})();
