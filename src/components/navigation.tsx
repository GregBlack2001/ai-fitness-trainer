'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function Navigation() {
  const pathname = usePathname()
  
  // Don't show nav on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          AI Fitness Trainer
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/chat">
            <Button variant="ghost">Chat</Button>
          </Link>
          <Link href="/plan">
            <Button variant="ghost">My Plan</Button>
          </Link>
          <Link href="/progress">
            <Button variant="ghost">Progress</Button>
          </Link>
          
          {/* Auth buttons - we'll make these functional later */}
          <Link href="/login">
            <Button variant="outline">Login</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}