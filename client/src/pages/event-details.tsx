import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Globe, MapPin } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Events
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(event.date), "PPP")}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Location</h2>
              <p className="flex items-center gap-2 text-muted-foreground">
                {event.isRemote ? (
                  <>
                    <Globe className="h-4 w-4" />
                    Remote Event
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    {event.city}, {event.country}
                  </>
                )}
              </p>
            </div>

            {event.url && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Event URL</h2>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-block"
                >
                  Visit Event Website
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
