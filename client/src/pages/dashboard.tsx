import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, UserCircle, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id]
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <h1 className="text-base font-bold">My Dashboard</h1>
          <div className="flex items-center gap-1.5">
            <Link href="/">
              <Button size="sm" variant="ghost" className="text-xs h-7 px-2">Events List</Button>
            </Link>
            <Link href="/profile">
              <Button 
                size="sm"
                variant="ghost" 
                className="flex items-center gap-1 hover:bg-accent text-xs h-7 px-2"
              >
                <UserCircle className="h-3 w-3" />
                {user?.username}
              </Button>
            </Link>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => logoutMutation.mutate()} 
              className="text-xs h-7 px-2"
            >
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditEventDialog event={event} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the event
                              "{event.title}" and remove it from our records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteEventMutation.mutate(event.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteEventMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Deleting...
                                </>
                              ) : (
                                "Delete Event"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}