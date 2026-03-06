import { Skeleton } from '@/components/ui/skeleton'

export default function RecipeDetailLoading() {
  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Skeleton className="mb-6 h-10 w-2/3" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mb-8">
        <Skeleton className="mb-3 h-7 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-5 w-full" />
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-7 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-5 w-full" />
        ))}
      </div>
      <Skeleton className="mt-6 h-20 w-full rounded-lg" />
    </div>
  )
}
