import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#171717',
          letterSpacing: '-0.02em'
        }}>
          Playables Admin Platform
        </h1>
        <p style={{ color: '#737373', fontSize: '16px' }}>
          Internal tool for Interactive Ads and UA analytics management
        </p>
      </div>

      <div style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      }}>
        <Link href="/playables">
          <div className="card" style={{
            cursor: 'pointer',
            height: '100%'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#171717'
            }}>
              Playables
            </h2>
            <p style={{ color: '#737373', lineHeight: '1.6', fontSize: '14px' }}>
              Manage your interactive ad creatives and track their performance
            </p>
          </div>
        </Link>

        <Link href="/analytics">
          <div className="card" style={{
            cursor: 'pointer',
            height: '100%'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#171717'
            }}>
              Analytics
            </h2>
            <p style={{ color: '#737373', lineHeight: '1.6', fontSize: '14px' }}>
              View performance metrics, insights, and detailed reports
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
