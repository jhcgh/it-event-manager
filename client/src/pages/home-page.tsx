import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Plus, LayoutDashboard, LogOut } from "lucide-react";
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

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<string>();
  const [selectedLocation, setSelectedLocation] = useState<"remote" | "in-person">();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"]
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description.toLowerCase().includes(search.toLowerCase());
    const eventDate = new Date(event.date);
    const matchesMonth = !selectedMonth || (
      eventDate >= startOfMonth(selectedMonth) &&
      eventDate <= endOfMonth(selectedMonth)
    );
    const matchesType = !selectedType || event.type === selectedType;
    const matchesLocation = !selectedLocation || 
                           (selectedLocation === "remote" ? event.isRemote : !event.isRemote);
    return matchesSearch && matchesMonth && matchesType && matchesLocation;
  });

  // Get next 24 months for the month picker
  const months = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return date;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            TechEvents.io
          </h1>
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                <CreateEventDialog />
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs h-7 px-2">
                    <LayoutDashboard className="h-3 w-3" />
                    My Dashboard
                  </Button>
                </Link>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-1 text-xs h-7 px-2"
                >
                  <LogOut className="h-3 w-3" />
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="text-xs h-7 px-2">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-8"
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
                <SelectItem value="seminar">Seminar</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={selectedLocation} 
              onValueChange={(val: "remote" | "in-person") => setSelectedLocation(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="in-person">In-person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Remote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
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
                      {event.isRemote ? "Remote" : `${event.city}, ${event.country}`}
                    </TableCell>
                    <TableCell className="capitalize">{event.type}</TableCell>
                    <TableCell>{event.contactInfo}</TableCell>
                    <TableCell>
                      {event.url && (
                        <a 
                          href={event.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.isRemote ? "Yes" : "No"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}