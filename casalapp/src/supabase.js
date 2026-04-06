import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ixmyotbmlsvvuwbifiap.supabase.co'
const SUPABASE_KEY = 'sb_publishable_6s8LlHQAmOvujP5DWFn9Sw_BOG-r8TJ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})
