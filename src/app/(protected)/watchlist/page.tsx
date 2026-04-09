import { WatchlistDashboard } from "@/components/watchlist/WatchlistDashboard";

export const metadata = {
  title: "Watchlists | Sentinel Lens",
  description: "Monitor keywords and receive alerts for matching articles",
};

export default function WatchlistPage() {
  return <WatchlistDashboard />;
}
