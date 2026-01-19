'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Home' },
    { href: '/playables', label: 'Playables' },
    { href: '/analytics', label: 'Analytics' },
  ]

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e5e5e5',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        height: '64px'
      }}>
        <div style={{
          color: '#171717',
          fontWeight: '600',
          fontSize: '16px',
          marginRight: '48px',
          letterSpacing: '-0.01em'
        }}>
          Playables Admin
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                color: pathname === link.href ? '#171717' : '#737373',
                background: pathname === link.href ? '#fafafa' : 'transparent',
                fontWeight: pathname === link.href ? '500' : '400',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
