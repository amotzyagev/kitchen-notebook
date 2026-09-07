import { createClient } from '@/lib/supabase/server'
import { documentSchema, emptyDocument, hasPending } from '@/lib/shopping-list'
import { ShoppingPrint } from '@/components/shopping/shopping-print'
export default async function ShoppingPrintPage({ searchParams }: { searchParams: Promise<{ all?: string; version?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('shopping_lists').select('*').eq('user_id', user.id).maybeSingle()
  if (error) throw error
  const document = data ? documentSchema.parse(data.document) : emptyDocument()
  return <ShoppingPrint document={document} all={params.all === '1'} warning={hasPending(document) || Number(params.version) !== (data?.version ?? 0)} />
}
