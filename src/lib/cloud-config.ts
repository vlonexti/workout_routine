/*
 * Point the site at your Supabase project so everyone's lifters and PRs live
 * in one place instead of on one phone.
 *
 *   1. Make a free project at https://supabase.com
 *   2. SQL Editor -> paste and run everything in supabase/schema.sql
 *   3. Project Settings -> API -> copy the Project URL and the "anon public" key
 *   4. Paste both below, then commit and push
 *
 * Leave them blank and the site still works — it just saves to this browser
 * only, exactly as before.
 *
 * The anon key is designed to be public; it ships inside every Supabase web
 * app. What controls access is the row-level security policy in schema.sql,
 * which here lets anyone read and write. That is the cost of having no login.
 * The README explains how to lock it down if you ever need to.
 */

export const SUPABASE_URL = ''

export const SUPABASE_ANON_KEY = ''

/* --- nothing below here needs editing --- */

const env = import.meta.env as Record<string, string | undefined>
const pick = (literal: string, key: string) => (literal || env[key] || '').trim().replace(/\/+$/, '')

export const cloudUrl = pick(SUPABASE_URL, 'VITE_SUPABASE_URL')
export const cloudKey = pick(SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')
export const isCloudConfigured = Boolean(cloudUrl && cloudKey)
