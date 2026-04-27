import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes glitch {
          0%, 89%, 100% { transform: translate(0); text-shadow: none; }
          90% { transform: translate(-3px, 1px); text-shadow: 3px 0 #FF6363; }
          92% { transform: translate(3px, -1px); text-shadow: -3px 0 #5DEDC4; }
          94% { transform: translate(-2px, 2px); text-shadow: 2px 0 #FF6363; }
          96% { transform: translate(2px, -1px); text-shadow: -2px 0 #5DEDC4; }
          98% { transform: translate(-1px, 1px); text-shadow: 1px 0 #FF6363; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(4deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(-5deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }

        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 100%; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        @keyframes badgeShake {
          0%, 100% { transform: rotate(-1deg); }
          50%       { transform: rotate(1deg); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes verdictPop {
          0%   { opacity: 0; transform: scale(0.92); }
          60%  { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }

        .glitch        { animation: glitch 4s infinite; }
        .float-a       { animation: float  3.8s ease-in-out infinite; }
        .float-b       { animation: floatB 5.1s ease-in-out infinite; animation-delay: 0.6s; }
        .float-c       { animation: floatC 4.4s ease-in-out infinite; animation-delay: 1.2s; }
        .badge-shake   { animation: badgeShake 1.8s ease-in-out infinite; }
        .blink         { animation: blink 1.1s step-end infinite; }

        .fu1 { animation: fadeUp  0.55s ease forwards; animation-delay: 0.1s; opacity: 0; }
        .fu2 { animation: fadeUp  0.55s ease forwards; animation-delay: 0.35s; opacity: 0; }
        .fu3 { animation: fadeUp  0.55s ease forwards; animation-delay: 0.6s;  opacity: 0; }
        .fu4 { animation: fadeUp  0.55s ease forwards; animation-delay: 0.85s; opacity: 0; }
        .fu5 { animation: fadeUp  0.55s ease forwards; animation-delay: 1.1s;  opacity: 0; }

        .si1 { animation: slideIn 0.4s ease forwards; animation-delay: 1.4s;  opacity: 0; }
        .si2 { animation: slideIn 0.4s ease forwards; animation-delay: 1.75s; opacity: 0; }
        .si3 { animation: slideIn 0.4s ease forwards; animation-delay: 2.1s;  opacity: 0; }

        .vp  { animation: verdictPop 0.5s ease forwards; animation-delay: 2.6s; opacity: 0; }
        .fu6 { animation: fadeUp  0.55s ease forwards; animation-delay: 3s;   opacity: 0; }

        .scanline-fx {
          position: absolute;
          left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(93,237,212,0.08) 50%, transparent 100%);
          animation: scanline 5s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div
        className="relative flex items-center justify-center min-h-svh overflow-hidden px-5 py-12"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="scanline-fx" />

        {/* Background deco emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
          <span className="float-a absolute text-5xl opacity-[0.07]" style={{ top: '8%',  left: '4%'  }}>🔍</span>
          <span className="float-b absolute text-4xl opacity-[0.07]" style={{ top: '18%', right: '6%' }}>👀</span>
          <span className="float-c absolute text-6xl opacity-[0.07]" style={{ top: '55%', left: '2%' }}>🚨</span>
          <span className="float-a absolute text-4xl opacity-[0.07]" style={{ bottom: '18%', right: '4%' }}>🕵️</span>
          <span className="float-b absolute text-3xl opacity-[0.07]" style={{ top: '38%', left: '12%' }}>❓</span>
          <span className="float-c absolute text-4xl opacity-[0.07]" style={{ bottom: '28%', right: '18%' }}>⚑</span>
          <span className="float-a absolute text-3xl opacity-[0.05]" style={{ top: '70%', left: '35%' }}>🤫</span>
        </div>

        <div className="w-full max-w-md flex flex-col items-center text-center">

          {/* Badge */}
          <div className="fu1 mb-5">
            <span className="badge-shake inline-block px-4 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-[var(--coral)] text-[var(--bg-primary)]">
              ⚑ VERDACHTE PAGINA GEVONDEN
            </span>
          </div>

          {/* 404 glitch */}
          <div className="fu2 mb-2">
            <h1
              className="glitch font-bold font-mono leading-none text-[var(--text-primary)]"
              style={{ fontSize: 'clamp(6rem, 28vw, 10rem)', letterSpacing: '-6px' }}
            >
              404
            </h1>
          </div>

          {/* Headline */}
          <div className="fu3 mb-7">
            <h2 className="text-3xl font-bold leading-tight mb-3">
              deze pagina<br />
              <span className="italic text-[var(--coral)]">is de sus.</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              iedereen heeft gestemd. de pagina is gevonden.<br />
              helaas voor hem — hij bestond waarschijnlijk nooit.
            </p>
          </div>

          {/* Vote cards */}
          <div className="fu4 w-full mb-6">
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3 text-left uppercase">
              Stemmen ingediend
            </p>
            <div className="flex flex-col gap-2">
              {[
                { icon: '🐺', name: 'Martijn' },
                { icon: '🦊', name: 'Jenna' },
                { icon: '🐻', name: 'Thomas' },
              ].map(({ icon, name }, i) => (
                <div
                  key={name}
                  className={`si${i + 1} flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-4 py-3`}
                >
                  <span className="text-xl shrink-0">{icon}</span>
                  <span className="text-sm text-[var(--text-muted)] font-mono flex-1 text-left">{name}</span>
                  <span className="text-xs font-bold text-[var(--coral)] font-mono tracking-widest">→ PAGINA</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div className="vp w-full mb-8 rounded-2xl px-5 py-4 border" style={{ background: 'rgba(255,99,99,0.07)', borderColor: 'rgba(255,99,99,0.25)' }}>
            <p className="text-[10px] font-mono tracking-widest text-[var(--coral)] mb-1 uppercase">Verdict</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">Unanimously eruit gegooid 🚪</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              fout getypt? of vertrouw je de URL niet? goed. <em>vertrouw niemand.</em>
            </p>
          </div>

          {/* CTAs */}
          <div className="fu6 w-full flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-4 rounded-3xl font-bold text-base text-center transition-opacity hover:opacity-90"
              style={{ background: 'var(--mint)', color: 'var(--bg-primary)' }}
            >
              Terug naar de lobby ⚡
            </Link>
            <Link
              href="/"
              className="w-full py-4 rounded-3xl font-semibold text-base text-center border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
              style={{ background: 'var(--bg-card)' }}
            >
              Home
            </Link>
          </div>

          {/* Cursor blink */}
          <p className="fu6 mt-8 text-xs font-mono opacity-30" style={{ color: 'var(--text-muted)' }}>
            sussing<span className="blink">█</span>
          </p>

        </div>
      </div>
    </>
  )
}
