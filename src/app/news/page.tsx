import Link from 'next/link';
import StripeBar from '@/components/StripeBar';
import { ARTICLES } from '@/lib/news';

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar />
      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
          ← Home
        </Link>
        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mt-6 mb-8">Paddle News</h1>

        <div className="space-y-10">
          {ARTICLES.map((a) => (
            <article key={a.url} className="rounded-2xl overflow-hidden border-2 border-navy/15 bg-white">
              {a.image && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                  <figure className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image.src} alt={a.image.caption ?? a.headline} className="w-full aspect-[1200/630] object-cover" style={{ objectPosition: a.image.position }} />
                    {(a.image.caption || a.image.credit) && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-10 pb-3 text-white text-[11px] leading-snug">
                        {a.image.caption}
                        {a.image.credit && <span className="opacity-70"> ({a.image.credit})</span>}
                      </figcaption>
                    )}
                  </figure>
                </a>
              )}

              <div className="px-5 py-5 space-y-3">
                <p className="text-terracotta text-[11px] font-black uppercase tracking-widest">
                  {a.source} <span className="text-navy opacity-40">· {longDate(a.date)}</span>
                </p>
                <h2 className="text-navy font-black text-2xl leading-tight [text-wrap:balance]">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-terracotta transition-colors">
                    {a.headline}
                  </a>
                </h2>
                {a.byline && <p className="text-navy opacity-50 text-xs font-bold uppercase tracking-wider">By {a.byline}</p>}
                <p className="text-navy opacity-75 text-[15px] leading-relaxed">{a.summary}</p>
                {a.note && (
                  <p className="text-navy text-sm leading-relaxed border-l-4 border-gold bg-gold/10 rounded-r-lg px-3 py-2">
                    {a.note}
                  </p>
                )}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-navy text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-lg hover:bg-terracotta transition-colors"
                >
                  Read the full story →
                </a>
              </div>
            </article>
          ))}
        </div>

        {ARTICLES.length === 0 && <p className="text-navy opacity-50 text-sm">Articles to come.</p>}
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
