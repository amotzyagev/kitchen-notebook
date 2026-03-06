import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">הדף לא נמצא</p>
      <Link href="/recipes" className="text-primary underline">
        חזרה למתכונים
      </Link>
    </div>
  )
}
