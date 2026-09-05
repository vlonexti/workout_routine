/*
 * IRON stores everything in Supabase. Point it at your project:
 *
 *   1. Make a free project at https://supabase.com
 *   2. SQL Editor -> New query -> paste and run supabase/schema.sql
 *   3. Project Settings -> API -> copy the Project URL and the "anon public" key
 *   4. Paste both below, then commit and push
 *
 * The anon key is designed to be public; it ships inside every Supabase web
 * app. Access is controlled by the row-level security policies in
 * schema.sql, which allow anyone with the URL to read and write because the
 * app has no login. See the README before sharing the link widely.
 */

export const SUPABASE_URL = ''

export const SUPABASE_ANON_KEY = ''

/* --- nothing below here needs editing --- */

const env = import.meta.env as Record<string, string | undefined>
const pick = (literal: string, key: string) =>
  (literal || env[key] || '').trim().replace(/\/+$/, '')

export const supabaseUrl = pick(SUPABASE_URL, 'VITE_SUPABASE_URL')
export const supabaseKey = pick(SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')
export const isConfigured = Boolean(supabaseUrl && supabaseKey)
