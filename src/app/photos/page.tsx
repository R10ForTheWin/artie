import Link from 'next/link';
import StripeBar from '@/components/StripeBar';

export default function PhotosPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <StripeBar side="top" />
      <div className="flex-1 px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-navy opacity-50 hover:opacity-100 text-sm font-bold uppercase tracking-wider">
            ← Home
          </Link>
        </div>

        <h1 className="text-navy font-black uppercase tracking-widest text-3xl mb-1">Team Photos</h1>
        <p className="text-navy opacity-40 text-sm mb-8">Team Topaz shared album</p>

        <div className="border-2 border-navy border-opacity-20 rounded-xl p-6 bg-cream-light mb-4">
          <p className="text-navy font-bold mb-1">Shared iCloud Album</p>
          <p className="text-navy opacity-50 text-sm mb-5">View and add photos from races, training, and team events. Add yours from the Photos app on your iPhone.</p>
          <a
            href="https://www.icloud.com/sharedalbum/#B275VaUrzGG4pHH"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-terracotta text-white font-black uppercase tracking-wider text-sm px-5 py-3 rounded-lg hover:opacity-80 transition-opacity"
          >
            Open Album →
          </a>
        </div>

        <div className="border-2 border-navy border-opacity-10 rounded-xl p-5 bg-white">
          <p className="text-navy font-bold text-sm mb-2">How to add photos</p>
          <ol className="text-navy opacity-50 text-sm space-y-1 list-decimal list-inside">
            <li>Text DJ and request an invite to the shared album</li>
            <li>Find your photo and tap Share</li>
            <li>Select "Add to Shared Album"</li>
            <li>Choose the Team Topaz album</li>
          </ol>
        </div>
      </div>
      <StripeBar side="bottom" />
    </main>
  );
}
