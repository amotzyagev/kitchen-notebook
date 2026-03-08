import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function resolveUserDisplayInfo(userId: string): Promise<{ name: string; email: string }> {
  const admin = createAdminClient()
  const { data: { user }, error } = await admin.auth.admin.getUserById(userId)
  if (error || !user) {
    return { name: '', email: '' }
  }
  const email = user.email || ''
  const name = user.user_metadata?.display_name || email
  return { name, email }
}
