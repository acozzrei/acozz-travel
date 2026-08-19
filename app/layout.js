import "./globals.css";

// Root layout is intentionally minimal — just the HTML shell. The owner's
// app (with the Trips/Settings nav) and the public read-only share page
// each bring their own header via nested layouts, so a link handed out for
// one trip can never lead a viewer into the rest of the account.
export const metadata = {
  title: "A.Cozz Travel — Trip Itineraries",
  description: "Build itineraries from real bookings, with real photos of every place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
