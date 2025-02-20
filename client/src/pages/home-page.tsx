import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, LayoutDashboard, Loader2, Calendar } from "lucide-react";
import { useState } from "react";
import { Event } from "@shared/schema";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { HoverUserMenu } from "@/components/hover-user-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");  
  const [selectedLocation, setSelectedLocation] = useState<"online" | "in-person" | "hybrid">();
  const [_, navigate] = useLocation();

  const { data: events = [], isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading events">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" role="alert">
        <p className="text-destructive">Failed to load events. Please try again later.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const filteredEvents = events.filter((event: Event) => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description.toLowerCase().includes(search.toLowerCase());
    const eventDate = new Date(event.date);
    const isUpcoming = eventDate >= new Date();
    const matchesMonth = !selectedMonth || (
      eventDate >= startOfMonth(selectedMonth) &&
      eventDate <= endOfMonth(selectedMonth)
    );
    const matchesType = selectedType === "all" || event.type === selectedType;
    const matchesLocation = !selectedLocation || 
                            (selectedLocation === "online" ? (event.isRemote && !event.isHybrid) :
                             selectedLocation === "in-person" ? (!event.isRemote && !event.isHybrid) :
                             event.isHybrid);
    return matchesSearch && matchesMonth && matchesType && matchesLocation && isUpcoming && event.status === 'active';
  });

  const months = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return date;
  });

  const handleEventClick = (eventId: number) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50" role="banner">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex-1 flex justify-center">
            <Link href="/">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent relative group transition-all duration-300 hover:scale-[1.02] select-none">
                <span className="inline-flex items-center gap-3">
                  <Calendar className="w-12 h-12 text-primary animate-pulse" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-5xl tracking-tight">ITEvents.io</span>
                    <span className="text-sm font-medium text-muted-foreground tracking-wider">
                      Connect • Learn • Grow
                    </span>
                  </span>
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" aria-hidden="true" />
                </span>
              </h1>
            </Link>
          </div>
          <nav className="flex items-center gap-2" role="navigation">
            {user ? (
              <>
                {!user.isSuperAdmin && (
                  <>
                    <CreateEventDialog />
                    <Link href="/dashboard">
                      <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                        <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                        My Dashboard
                      </Button>
                    </Link>
                  </>
                )}
                <HoverUserMenu user={user} />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth?mode=register">
                  <Button
                    variant="ghost"
                    className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600 font-semibold px-4 py-2 transition-all duration-200 hover:scale-105 hover:opacity-90"
                    style={{ 
                      fontSize: '1.09375rem',
                      filter: 'drop-shadow(0 0 2px rgba(var(--primary), 0.1))',
                    }}
                  >
                    Post Your Event for Free
                  </Button>
                </Link>
                <Button 
                  size="sm" 
                  className="text-sm font-medium"
                  onClick={() => navigate('/auth?mode=login')}
                >
                  Login
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-primary/5 to-background border-b" aria-labelledby="hero-heading">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h2 id="hero-heading" className="text-3xl md:text-4xl font-bold text-center mb-3">
            Discover Technology Events Worldwide
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find and join the best technology events, conferences, and workshops happening around the world.
            Connect with industry experts and grow your network.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto" role="search" aria-label="Event filters">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search events..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search events"
              />
            </div>

            <Select 
              value={selectedMonth?.toISOString()} 
              onValueChange={(value) => setSelectedMonth(new Date(value))}
            >
              <SelectTrigger aria-label="Select month">
                <SelectValue>
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy") : "Select month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((date) => (
                  <SelectItem key={date.toISOString()} value={date.toISOString()}>
                    {format(date, "MMMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger aria-label="Select event type">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seminar">Seminar</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={selectedLocation} 
              onValueChange={(val: "online" | "in-person" | "hybrid") => setSelectedLocation(val)}
            >
              <SelectTrigger aria-label="Select location type">
                <SelectValue placeholder="Location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in-person">In Person</SelectItem>
                <SelectItem value="hybrid">In Person & Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8" role="main">
        <section className="rounded-lg border bg-card" aria-label="Events list">
          <Table aria-label="Technology events">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Event Name</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Event Date</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No events found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event: Event) => (
                  <TableRow 
                    key={event.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleEventClick(event.id)}
                    role="link"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEventClick(event.id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {event.title}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {event.description}
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.date), "PPP")}
                    </TableCell>
                    <TableCell>
                      {event.isHybrid ? "In Person & Online" : 
                       event.isRemote ? "Online" : 
                       `${event.city}, ${event.country}`}
                    </TableCell>
                    <TableCell className="capitalize">
                      {event.type}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}