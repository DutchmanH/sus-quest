import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SusQuest — trust no one.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D1F1A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 96px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(93,237,212,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: 200,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,99,99,0.10) 0%, transparent 70%)',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(93,237,212,0.12)',
            border: '1px solid rgba(93,237,212,0.3)',
            borderRadius: 100,
            padding: '8px 20px',
            marginBottom: 36,
          }}
        >
          <span style={{ color: '#5DEDC4', fontSize: 14, letterSpacing: '0.15em', fontWeight: 700 }}>
            PARTY GAME · MULTIPLAYER
          </span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
          <span style={{ fontSize: 96, fontWeight: 800, color: '#E8F5F2', lineHeight: 1, letterSpacing: '-2px' }}>
            SusQuest
          </span>
          <span style={{ fontSize: 64, fontWeight: 700, color: '#FF6363', fontStyle: 'italic', lineHeight: 1, marginTop: 8 }}>
            trust no one.
          </span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 26, color: '#8BA89E', maxWidth: 700, margin: 0, lineHeight: 1.5, fontWeight: 400 }}>
          Multiplayer party game — elke ronde heeft iemand een geheime opdracht. Wie is de sus?
        </p>

        {/* Bottom row */}
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            left: 96,
            right: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#8BA89E', fontSize: 18, letterSpacing: '0.1em', fontWeight: 600 }}>
            susquest.app
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            {['🕵️', '👀', '🚨'].map((e, i) => (
              <span key={i} style={{ fontSize: 32 }}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
