import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export const DOCUMENTS_BUCKET = 'applicant-documents';
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

let browserClient: SupabaseClient | null = null;
let anonymousUserPromise: Promise<User> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (typeof window === 'undefined' || !url || !publishableKey) return null;

  if (!browserClient) {
    browserClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}

export function getOrCreateAnonymousUser(client: SupabaseClient): Promise<User> {
  if (!anonymousUserPromise) {
    anonymousUserPromise = (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      if (data.session?.user) {
        if (!data.session.user.is_anonymous) {
          throw new Error('The current Supabase session is not an anonymous document session.');
        }
        return data.session.user;
      }

      const { data: signInData, error: signInError } = await client.auth.signInAnonymously();
      if (signInError) throw signInError;
      if (!signInData.user?.is_anonymous) {
        throw new Error('Supabase did not create an anonymous document session.');
      }

      return signInData.user;
    })().catch(error => {
      anonymousUserPromise = null;
      throw error;
    });
  }

  return anonymousUserPromise;
}
