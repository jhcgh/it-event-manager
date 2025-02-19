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
import { Helmet } from "react-helmet";

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
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading event details">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" role="alert">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description,
    "startDate": event.date,
    "eventAttendanceMode": event.isHybrid 
      ? "https://schema.org/MixedEventAttendanceMode"
      : event.isRemote 
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": event.isRemote 
      ? {
          "@type": "VirtualLocation",
          "url": event.url
        }
      : {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": event.city,
            "addressCountry": event.country
          }
        },
    "image": event.imageUrl || [],
    "organizer": {
      "@type": "Organization",
      "name": "ITEvents.io"
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${event.title} | ITEvents.io`}</title>
        <meta name="description" content={event.description} />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50" role="banner">
          <div className="container mx-auto px-4 py-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Events
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8" role="main">
          <article className="rounded-lg border bg-card overflow-hidden">
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
                    <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                    <time dateTime={event.date}>{format(new Date(event.date), "PPP")}</time>
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 capitalize">
                    <Tag className="h-3 w-3 mr-1" aria-hidden="true" />
                    {event.type}
                  </Badge>
                </div>
              </div>
            </div>

            <CardContent className="grid gap-8 p-6">
              <section className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Info className="h-5 w-5" aria-hidden="true" />
                  About This Event
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                <section className="space-y-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5" aria-hidden="true" />
                    Event Format
                  </h2>
                  <p className="text-muted-foreground">
                    {event.isHybrid ? "In Person & Online" : 
                     event.isRemote ? "Online" : "In Person"}
                  </p>
                </section>

                {!event.isRemote && (
                  <section className="space-y-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                      Location
                    </h2>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {event.city}, {event.country}
                    </p>
                  </section>
                )}

                <section className="space-y-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Type className="h-5 w-5" aria-hidden="true" />
                    Event Type
                  </h2>
                  <p className="text-muted-foreground capitalize">{event.type}</p>
                </section>

                {event.url && (
                  <section className="space-y-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" aria-hidden="true" />
                      Event URL
                    </h2>
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      Visit Event Website
                    </a>
                  </section>
                )}
              </div>
            </CardContent>
          </article>
        </main>
      </div>
    </>
  );
}