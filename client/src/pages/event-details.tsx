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
  ImageIcon
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.date), "PPP")}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                <Tag className="h-3 w-3 mr-1" />
                {event.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5" />
                Description
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Event Format</h3>
                  <p className="text-muted-foreground flex items-center gap-2">
                    {event.isHybrid ? (
                      <>
                        <Globe className="h-4 w-4" />
                        In Person & Online
                      </>
                    ) : event.isRemote ? (
                      <>
                        <Globe className="h-4 w-4" />
                        Online Event
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4" />
                        In Person Event
                      </>
                    )}
                  </p>
                </div>

                {!event.isRemote && (
                  <div>
                    <h3 className="font-medium mb-1">Physical Location</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.city}, {event.country}
                    </p>
                  </div>
                )}
              </div>
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

            {event.imageUrl && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Event Image
                </h2>
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="rounded-lg max-w-full h-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}