/* Test double for vendor/supabase.js: sign-in by email code 123456, rpc and insert go through the bridge to a real PostgreSQL. Never shipped. */
(function () {
  var post = function (path, body) { return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); };
  window.supabase = {
    createClient: function () {
      var KEY = 'test.session';
      var cur = function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
      var email = function () { var s = cur(); return s && s.user.email; };
      var wrap = function (r) { return r.error ? { data: null, error: r.error } : { data: r.data, error: null }; };
      return {
        auth: {
          signInWithIdToken: function (o) {   // the fake Google credential is the email address
            var em = o.token, u = { id: 'u-' + em, email: em, email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: em === 'asha@example.in' ? 'Asha Rao' : '' } };
            localStorage.setItem(KEY, JSON.stringify({ user: u }));
            return Promise.resolve({ data: { user: u, session: { user: u } }, error: null });
          },
          signInWithOtp: function () { return Promise.resolve({ data: {}, error: null }); },
          verifyOtp: function (o) {
            if (o.token !== '123456') return Promise.resolve({ data: {}, error: { message: 'Token has expired or is invalid' } });
            var u = { id: 'u-' + o.email, email: o.email, email_confirmed_at: new Date().toISOString() };
            localStorage.setItem(KEY, JSON.stringify({ user: u }));
            return Promise.resolve({ data: { user: u, session: { user: u } }, error: null });
          },
          getSession: function () { var s = cur(); return Promise.resolve({ data: { session: s ? { user: s.user } : null } }); },
          getUser: function () { var s = cur(); return Promise.resolve({ data: { user: s ? s.user : null } }); },
          signOut: function () { localStorage.removeItem(KEY); return Promise.resolve({ error: null }); },
          onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
        },
        rpc: function (fn, args) { return post('/__rpc', { fn: fn, args: args, email: email() }).then(wrap); },
        from: function (t) {
          return {
            insert: function (row) { return post('/__insert', { table: t, row: row, email: email() }).then(wrap); },
            select: function () { return Promise.resolve({ data: [], error: null }); }
          };
        },
        functions: {
          invoke: function (name) {
            if (name === 'admin') return email() === 'owner@legalstaff.test' ? Promise.resolve({ data: { messages: [], settings: {}, admins: [] }, error: null }) : Promise.resolve({ data: null, error: { message: 'This account is not a Legal Staff administrator.' } });
            return Promise.resolve({ data: null, error: { message: 'not available in the test' } });
          }
        },
        storage: { from: function () { return { upload: function () { return Promise.resolve({ data: {}, error: null }); }, createSignedUrl: function () { return Promise.resolve({ data: { signedUrl: 'about:blank' }, error: null }); } }; } }
      };
    }
  };
})();
