import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoverUserMenu } from "@/components/hover-user-menu";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id],
    select: (data) => data.filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();

      if (activeTab === "active") {
        return event.status === 'active' && eventDate >= today;
      } else if (activeTab === "saved") {
        return event.status === 'inactive';
      } else { // completed
        return event.status === 'active' && eventDate < today;
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  });

  const handleDeleteEvent = async (event: Event) => {
    try {
      await apiRequest(
        "PATCH",
        `/api/events/${event.id}`,
        { status: 'inactive' }
      );
      queryClient.invalidateQueries({ queryKey: ["/api/events", user?.id] });
      toast({
        title: "Success",
        description: "Event has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="w-32">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Events List
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex-1 text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            My Dashboard
          </h1>
          <div className="flex items-center gap-1.5 w-32 justify-end">
            {user && <HoverUserMenu user={user} />}
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Events Dashboard</h2>
            <CreateEventDialog />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="active">Active Events</TabsTrigger>
              <TabsTrigger value="saved">Saved Events</TabsTrigger>
              <TabsTrigger value="completed">Past Events</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Event Name</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Event Date</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No {activeTab === 'completed' ? 'past' : activeTab} events found.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="transition-colors hover:bg-muted/50">
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
                    <TableCell className="capitalize">{event.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EditEventDialog event={event} onDelete={handleDeleteEvent} />
                      </div>
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