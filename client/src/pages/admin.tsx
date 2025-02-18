import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Event, Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import {
  Loader2,
  Calendar,
  Users,
  AlertTriangle,
  Shield,
  Building2,
  UserPlus,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Redirect, Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { HoverUserMenu } from "@/components/hover-user-menu";
import { UploadEventsDialog } from "@/components/upload-events-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

function CustomerSection({ customers }: { customers: Customer[] }) {
  const { toast } = useToast();

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/customers/${customerId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "Success",
        description: "Customer has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer. Please ensure you have admin permissions.",
        variant: "destructive",
      });
    },
  });

  // Add delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, {
        status: 'inactive'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Only show active customers
  const customerGroups = customers.reduce((acc, customer) => {
    if (customer.status !== 'inactive') {
      if (!acc[customer.id]) {
        acc[customer.id] = {
          details: customer,
          users: []
        };
      }
    }
    return acc;
  }, {} as Record<number, { details: Customer, users: User[] }>);

  // Get all users for each customer
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Group users by their customerId, only including active users
  allUsers.forEach(user => {
    if (user.customerId && customerGroups[user.customerId] && user.status === 'active') {
      customerGroups[user.customerId].users.push(user);
    }
  });

  const sortedCustomers = Object.values(customerGroups).sort((a, b) =>
    a.details.name.localeCompare(b.details.name)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Customer Overview
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sortedCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active customers found
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {sortedCustomers.map(({ details, users }) => (
              <AccordionItem key={details.id} value={details.id.toString()} className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">{details.name}</span>
                    </div>
                    <Badge variant="outline">
                      {users.length} {users.length === 1 ? 'user' : 'users'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4">
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-muted-foreground">
                          <p>Admin: {details.adminName}</p>
                          <p>Email: {details.adminEmail}</p>
                          <p>Phone: {details.phoneNumber}</p>
                          <p>Address: {details.address}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Customer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to delete this customer?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will deactivate the customer
                                and all associated user accounts.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCustomerMutation.mutate(details.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteCustomerMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete Customer"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserEventsDialog user={user} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex items-center gap-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure you want to delete this user?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. The user will be deactivated
                                        and will no longer have access to the system.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {deleteUserMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                          </>
                                        ) : (
                                          "Delete User"
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function UserEventsDialog({ user }: { user: User }) {
  const { data: userEvents = [], isLoading, error } = useQuery<Event[]>({
    queryKey: [`/api/users/${user.id}/events`],
    enabled: !!user.id,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>View Events</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.username}'s Events</DialogTitle>
          <DialogDescription>View all events associated with this user</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {isLoading && <p className="text-center text-muted-foreground">Loading events...</p>}
          {error && <p className="text-center text-destructive">Error loading events</p>}
          {!isLoading && !error && userEvents.length === 0 && (
            <p className="text-center text-muted-foreground">No events found</p>
          )}
          {userEvents.map(event => (
            <div key={event.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  <div className="text-sm text-muted-foreground">
                    <p>Date: {format(new Date(event.date), "PPP 'at' p")}</p>
                    <p>Location: {event.isRemote ? "Online" : `${event.city}, ${event.country}`}</p>
                    <p>Type: {event.type}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateSuperUserDialog() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      customerName: "",
      title: "",
      mobile: "",
    },
  });

  const createSuperUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/users/super", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Super user created successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create Super User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Super User</DialogTitle>
          <DialogDescription>
            Create a new super user with full administrative privileges
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createSuperUserMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createSuperUserMutation.isPending}>
                {createSuperUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Super User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    return <Redirect to="/" />;
  }

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
  });

  const { data: allEvents = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    retry: 3
  });

  const events = allEvents
    .filter(event => {
      const eventDate = new Date(event.date);
      const now = new Date();

      // Set both dates to UTC midnight to compare just the dates
      const eventDateUTC = Date.UTC(
        eventDate.getUTCFullYear(),
        eventDate.getUTCMonth(),
        eventDate.getUTCDate()
      );
      const nowUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );

      return eventDateUTC >= nowUTC && event.status === 'active';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleDeleteEvent = async (event: Event) => {
    try {
      await apiRequest(
        "PATCH",
        `/api/events/${event.id}`,
        { status: 'inactive' }
      );
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
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

  if (isLoadingUsers || isLoadingEvents || isLoadingCustomers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const superUsers = users.filter(u => u.isSuperAdmin === true);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="w-32">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center hover:bg-accent h-7 w-7 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-1 justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Admin Portal
            </h1>
            <div className="w-32 flex justify-end items-center gap-1.5">
              {user && <HoverUserMenu user={user} />}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="grid w-[600px] grid-cols-4 mb-8">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Super Users
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Active Events
            </TabsTrigger>
            <TabsTrigger value="completed-events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Past Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {user?.isSuperAdmin && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Super Users
                  </CardTitle>
                  <CreateSuperUserDialog />
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{customers.find(c => c.id === u.customerId)?.name || 'N/A'}</TableCell>
                          <TableCell>{u.title}</TableCell>
                          <TableCell>{u.mobile}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.status === "active" ? "default" : "destructive"}
                              className="capitalize"
                            >
                              {u.status === 'inactive' ? 'inactive' : 'active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="customers">
            <CustomerSection customers={customers} />
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events
                  </CardTitle>
                  <UploadEventsDialog />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No upcoming events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => {
                        const organizer = users.find(
                          (u) => u.id === event.userId
                        );
                        return (
                          <TableRow
                            key={event.id}
                            className="cursor-pointer transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">
                              {event.title}
                            </TableCell>
                            <TableCell>
                              {format(new Date(event.date), "PPP 'at' p")}
                            </TableCell>
                            <TableCell>
                              {event.isHybrid ? "In Person & Online" :
                                event.isRemote ? "Online" :
                                  `${event.city}, ${event.country}`}
                            </TableCell>
                            <TableCell className="capitalize">
                              {event.type}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={event.status === "active" ? "default" : "destructive"}
                                className="capitalize"
                              >
                                {event.status === 'active' ? 'active' : 'inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>{organizer?.username}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <EditEventDialog event={event} onDelete={handleDeleteEvent} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="completed-events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Completed Events
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Organizer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No completed events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allEvents
                        .filter(event => {
                          const eventDate = new Date(event.date);
                          const now = new Date();

                          // Set both dates to UTC midnight to compare just the dates
                          const eventDateUTC = Date.UTC(
                            eventDate.getUTCFullYear(),
                            eventDate.getUTCMonth(),
                            eventDate.getUTCDate()
                          );
                          const nowUTC = Date.UTC(
                            now.getUTCFullYear(),
                            now.getUTCMonth(),
                            now.getUTCDate()
                          );

                          return eventDateUTC < nowUTC && event.status === 'active';
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((event) => {
                          const organizer = users.find(
                            (u) => u.id === event.userId
                          );
                          return (
                            <TableRow
                              key={event.id}
                              className="cursor-pointer transition-colors hover:bg-muted/50"
                            >
                              <TableCell className="font-medium">
                                {event.title}
                              </TableCell>
                              <TableCell>
                                {format(new Date(event.date), "PPP 'at' p")}
                              </TableCell>
                              <TableCell>
                                {event.isHybrid ? "In Person & Online" :
                                  event.isRemote ? "Online" :
                                    `${event.city}, ${event.country}`}
                              </TableCell>
                              <TableCell className="capitalize">
                                {event.type}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  Completed
                                </Badge>
                              </TableCell>
                              <TableCell>{organizer?.username}</TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}