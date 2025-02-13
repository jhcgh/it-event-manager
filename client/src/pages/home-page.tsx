import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, LayoutDashboard, UserCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Event } from "@shared/schema";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { CreateEventDialog } from "@/components/create-event-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoverUserMenu } from "@/components/hover-user-menu";

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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">Failed to load events. Please try again later.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const filteredEvents = events.filter((event: Event) => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description.toLowerCase().includes(search.toLowerCase());
    const eventDate = new Date(event.date);
    const matchesMonth = !selectedMonth || (
      eventDate >= startOfMonth(selectedMonth) &&
      eventDate <= endOfMonth(selectedMonth)
    );
    const matchesType = selectedType === "all" || event.type === selectedType;
    const matchesLocation = !selectedLocation || 
                            (selectedLocation === "online" ? (event.isRemote && !event.isHybrid) :
                             selectedLocation === "in-person" ? (!event.isRemote && !event.isHybrid) :
                             event.isHybrid);
    return matchesSearch && matchesMonth && matchesType && matchesLocation;
  });

  const months = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return date;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mx-auto">
            ITEvents.io
          </h1>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {!user.isSuperAdmin && (
                  <>
                    <CreateEventDialog />
                    <Link href="/dashboard">
                      <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        My Dashboard
                      </Button>
                    </Link>
                  </>
                )}
                <HoverUserMenu user={user} />
              </>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="text-sm font-medium">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
            Discover Technology Events Worldwide
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find and join the best technology events, conferences, and workshops happening around the world.
            Connect with industry experts and grow your network.
            <span className="block mt-2 text-primary font-semibold">Post Events for Free</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <Select 
              value={selectedMonth?.toISOString()} 
              onValueChange={(value) => setSelectedMonth(new Date(value))}
            >
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border bg-card">
          <Table>
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
                    onClick={() => navigate(`/event/${event.id}`)}
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
        </div>
      </main>
    </div>
  );
}