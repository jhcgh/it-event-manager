import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar, 
  Globe, 
  MapPin, 
  Link as LinkIcon,
  Tag,
  Info,
  Type
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function EventDetailsPage() {
  const { id } = useParams();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="overflow-hidden">
          <div className="relative w-full aspect-video bg-muted">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
              <h1 className="text-4xl font-bold text-white">{event.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(event.date), "PPP")}
                </Badge>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 capitalize">
                  <Tag className="h-3 w-3 mr-1" />
                  {event.type}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="grid gap-8 p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5" />
                About This Event
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Event Format
                </h2>
                <p className="text-muted-foreground">
                  {event.isHybrid ? "In Person & Online" : 
                   event.isRemote ? "Online" : "In Person"}
                </p>
              </div>

              {!event.isRemote && (
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </h2>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.city}, {event.country}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Event Type
                </h2>
                <p className="text-muted-foreground capitalize">{event.type}</p>
              </div>

              {event.url && (
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Event URL
                  </h2>
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Visit Event Website
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}