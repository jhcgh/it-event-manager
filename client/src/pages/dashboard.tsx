import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, insertEventSchema, InsertEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(), // Set today as default
      location: "",
      isRemote: false,
      type: "seminar",
      contactInfo: "",
      url: "",
    }
  });

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id]
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: InsertEvent) => {
    createEventMutation.mutate(data);
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
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Fill in the event details below. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" {...form.register("title")} />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea id="description" {...form.register("description")} />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Calendar
                    mode="single"
                    selected={form.getValues("date")}
                    onSelect={(date) => form.setValue("date", date || new Date())}
                    className="rounded-md border"
                    fromDate={new Date()}
                    initialFocus
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input id="location" {...form.register("location")} />
                  {form.formState.errors.location && (
                    <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="isRemote"
                    checked={form.getValues("isRemote")}
                    onCheckedChange={(checked) => form.setValue("isRemote", checked)}
                  />
                  <Label htmlFor="isRemote">Remote Event</Label>
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={form.getValues("type")}
                    onValueChange={(value) => form.setValue("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactInfo">Contact Information *</Label>
                  <Input id="contactInfo" {...form.register("contactInfo")} />
                  {form.formState.errors.contactInfo && (
                    <p className="text-sm text-destructive">{form.formState.errors.contactInfo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Event URL</Label>
                  <Input id="url" type="url" {...form.register("url")} />
                  {form.formState.errors.url && (
                    <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Event
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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