import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CreateEventDialog } from "@/components/create-event-dialog";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id]
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost">Events List</Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost">{user?.username}</Button>
            </Link>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold">My Events</h2>
          <CreateEventDialog />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map(event => (
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
                <p className="text-sm text-muted-foreground mb-4">
                  {event.description}
                </p>
                <div className="space-y-2 text-sm">
                  <div>Date: {format(new Date(event.date), "PPP")}</div>
                  <div>Location: {event.location}</div>
                  <div>Type: {event.type}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}