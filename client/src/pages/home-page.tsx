import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon, MapPin, Video, Users } from "lucide-react";
import { useState } from "react";
import { Event } from "@shared/schema";
import { format } from "date-fns";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedType, setSelectedType] = useState<string>();
  const [selectedLocation, setSelectedLocation] = useState<"remote" | "in-person">();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"]
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !selectedDate || format(event.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
    const matchesType = !selectedType || event.type === selectedType;
    const matchesLocation = !selectedLocation || 
                           (selectedLocation === "remote" ? event.isRemote : !event.isRemote);
    return matchesSearch && matchesDate && matchesType && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            TechEvents.io
          </h1>
          <Link href="/auth">
            <Button>Login</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="w-full md:w-64 space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />

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

          <div className="flex-1 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map(event => (
              <Card key={event.id}>
                {event.imageUrl && (
                  <img 
                    src={event.imageUrl} 
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle>{event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(event.date), "PPP")}
                    </div>
                    <div className="flex items-center gap-2">
                      {event.isRemote ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {event.type}
                    </div>
                  </div>
                  <Button
                    variant="link"
                    className="mt-4 p-0"
                    asChild
                  >
                    <a href={`/api/events/${event.id}/calendar`} download>
                      Add to Calendar
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
