/* Legal Staff — site configuration. Everything here is public and safe to commit; never put a secret in this file.

   googleClientId  OAuth 2.0 "Web application" Client ID from Google Cloud Console (APIs & Services → Credentials).
                   Add every address the site is served from under "Authorised JavaScript origins".
   supabaseUrl     Project URL of the Supabase project, e.g. https://abcd1234.supabase.co
   supabaseKey     The project's publishable (anon) key.

   With supabaseUrl and supabaseKey set, data is stored on the server and shared across devices and team members.
   Without them the site keeps data in the browser only. */
window.LS_CONFIG = {
  googleClientId: '',
  supabaseUrl: 'https://ihbbfgzzbpxznbpspyam.supabase.co',
  supabaseKey: 'sb_publishable_JFuccB-z-0I1zRlzuAi0VA_-84zj94g'
};
