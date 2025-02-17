import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Event, UpdateUser, Company } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, companySettingsSchema } from "@shared/schema"; // Added import
import {
  Loader2,
  UserX,
  Calendar,
  Users,
  AlertTriangle,
  Shield,
  Ban,
  CheckCircle,
  UserPlus,
  ArrowLeft,
  LogOut,
  Settings,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Redirect, Link, useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { Trash2 } from "lucide-react";
import { HoverUserMenu } from "@/components/hover-user-menu";
import { UploadEventsDialog } from "@/components/upload-events-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

// Update the CompanySettingsDialog component to match the styling and functionality
function CompanySettingsDialog({ company }: { company: Company }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);

  const deleteCompany = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/companies/${company.id}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete company');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/companies'],
      });
      toast({
        title: "Success",
        description: `Company "${company.name}" has been deleted successfully.`,
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

  const form = useForm({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      maxUsers: company.settings.maxUsers || 10,
      maxEvents: company.settings.maxEvents || 20,
      requireEventApproval: company.settings.requireEventApproval || false,
      allowedEventTypes: company.settings.allowedEventTypes || ["conference", "workshop", "seminar"]
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/companies/${company.id}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      toast({
        title: "Success",
        description: "Company settings updated successfully",
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Manage Company
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Company Settings - {company.name}</DialogTitle>
          <DialogDescription>
            Configure company-wide settings and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Users</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Events</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </form>
          </Form>

          {user?.isSuperAdmin && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Danger Zone
              </h2>
              <div className="bg-destructive/10 border-destructive border rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Delete {company.name}</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      This action cannot be undone. This will permanently delete {company.name}
                      and remove all associated data including users, events, and settings.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setIsDeleteCompanyDialogOpen(true)}
                    disabled={deleteCompany.isPending}
                    className="shrink-0"
                  >
                    {deleteCompany.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Company"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog
        open={isDeleteCompanyDialogOpen}
        onOpenChange={setIsDeleteCompanyDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              This action cannot be undone. This will permanently delete
              {company.name} and all associated data including:
              <div className="mt-2">
                <ul className="list-disc list-inside">
                  <li>All user accounts in this company</li>
                  <li>All events created by this company</li>
                  <li>All company settings and configurations</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCompany.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {company.name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// Update CustomerSection to remove general delete company functionality
function CustomerSection({ customers, companies }: { customers: User[], companies: Company[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/companies/${companyId}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete company');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/companies'],
      });
      toast({
        title: "Success",
        description: `Company has been deleted successfully.`,
      });
      setCompanyToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  console.log('CustomerSection - User:', {
    isSuperAdmin: user?.isSuperAdmin,
    customers: customers.length,
    companies: companies.length
  });

  const customersByCompany = customers.reduce((acc, customer) => {
    const company = companies.find((c: Company) => c.id === customer.companyId);
    const companyName = company?.name || customer.companyName || 'Unassigned';
    if (!acc[companyName]) {
      acc[companyName] = {
        company,
        users: []
      };
    }
    acc[companyName].users.push(customer);
    return acc;
  }, {} as Record<string, { company: Company | undefined, users: User[] }>);

  const sortedCompanies = Object.keys(customersByCompany).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies and Users
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-4">
          {sortedCompanies.map((companyName) => {
            const { company, users } = customersByCompany[companyName];
            return (
              <AccordionItem key={companyName} value={companyName} className="border rounded-lg px-4">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-semibold">{companyName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {users.length} {users.length === 1 ? 'user' : 'users'}
                      </Badge>
                      {company && user?.isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <CompanySettingsDialog company={company} />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompanyToDelete(company);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Company
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Phone</TableHead>
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
                            <TableCell>{user.mobile}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserEventsDialog user={user} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex items-center gap-1"
                                    >
                                      <UserX className="h-4 w-4" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this user? This
                                        action cannot be undone.
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
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
            );
          })}
        </Accordion>

        {/* Delete Company Confirmation Dialog */}
        <AlertDialog 
          open={!!companyToDelete} 
          onOpenChange={() => setCompanyToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {companyToDelete?.name}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                This action cannot be undone. This will permanently delete
                {companyToDelete?.name} and all associated data including:
                <div className="mt-2">
                  <ul className="list-disc list-inside">
                    <li>All user accounts in this company</li>
                    <li>All events created by this company</li>
                    <li>All company settings and configurations</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => companyToDelete && deleteCompanyMutation.mutate(companyToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${companyToDelete?.name}`
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function UserEventsDialog({ user }: { user: User }) {
  const { data: userEvents = [], isLoading, error } = useQuery<Event[]>({
    queryKey: [`/api/users/${user.id}/events`],
    enabled: !!user.id,
  });

  const { toast } = useToast();
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/events`] });
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex items-center gap-1">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this event? This action cannot be undone.
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
      companyName: "",
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
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
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

function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const superUserDeleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Super user deleted successfully",
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

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    return <Redirect to="/" />;
  }

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const { data: allEvents = [], isLoading: isLoadingEvents, error: eventsError } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
    retry: 3
  });

  const events = allEvents
    .filter(event => event.status === 'active')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  const deleteEventMutationAdmin = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
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

  if (isLoadingUsers || isLoadingEvents || isLoadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (eventsError) {
    console.error("Events loading error:", eventsError);
    toast({
      title: "Error loading events",
      description: "There was a problem loading the events. Please try again.",
      variant: "destructive",
    });
  }

  const superUsers = users.filter(u => u.isSuperAdmin === true);
  const customers = users.filter(u => !u.isSuperAdmin);

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
              Admin Dashboard
            </h1>
            <div className="w-32 flex justify-end items-center gap-1.5">
              {user && <HoverUserMenu user={user} />}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="grid w-[400px] grid-cols-2 mb-8">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {user?.isSuperAdmin && (
              <Card className="mb-8">
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
                        <TableHead>Company</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{companies.find(c => c.id === u.companyId)?.name || 'N/A'}</TableCell>
                          <TableCell>{u.title}</TableCell>
                          <TableCell>{u.mobile}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.status === "active" ? "default" : "destructive"}
                              className="capitalize"
                            >
                              {u.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <CustomerSection customers={customers} companies={companies} />
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events Management
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
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.action-button')) {
                                e.stopPropagation();
                                return;
                              }
                              window.location.href = `/event/${event.id}`;
                            }}
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
                                {event.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{organizer?.username}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <EditEventDialog event={event} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="action-button flex items-center gap-1"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </Button>
                                                                 </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this event? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteEventMutationAdmin.mutate(event.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {deleteEventMutationAdmin.isPending ? (
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

export default AdminPage;