import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2,  Trash2, ArrowLeft } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


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
            <Link href="/profile">
              <Button 
                size="sm"
                variant="ghost" 
                className="flex items-center hover:bg-accent h-7 w-7 p-0"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
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

      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">My Events</h2>
            <CreateEventDialog />
          </div>
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
                    No events found. Create your first event to get started.
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
                        <EditEventDialog event={event} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 text-destructive hover:bg-destructive/10">
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}