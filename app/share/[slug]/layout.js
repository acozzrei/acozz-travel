// Minimal public header for shared trip links — deliberately has no nav to
// the trip list or Settings, since this page is meant to be handed to
// people who shouldn't see (or edit) anything beyond the one trip shared
// with them.
export default function ShareLayout({ children }) {
  return (
    <>
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-sm">✈</span>
          <span className="font-semibold text-lg tracking-tight">A.Cozz Travel</span>
          <span className="text-xs text-stone-400 ml-1">Shared itinerary</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
