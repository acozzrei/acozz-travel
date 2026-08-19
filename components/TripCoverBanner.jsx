import { formatRange } from "@/lib/dates";

export default function TripCoverBanner({ trip }) {
  const range = formatRange(trip.startDate, trip.endDate);
  return (
    <div className="card overflow-hidden mb-6">
      <div className="h-48 bg-gradient-to-br from-teal-500 to-teal-700 relative">
        {trip.coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 p-5 text-white">
          <h1 className="text-2xl font-semibold">{trip.name}</h1>
          <p className="text-sm text-white/90">
            {trip.destination}
            {range ? ` · ${range}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
