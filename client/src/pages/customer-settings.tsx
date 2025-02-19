import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertCustomerSchema, type Customer, insertUserSchema, type InsertUser, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, ArrowLeft, Users, UserPlus, Pencil, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
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
import * as z from 'zod';

type CustomerFormValues = {
  name: string;
  address: string;
  phoneNumber: string;
  adminName: string;
  adminEmail: string;
};

type UserFormData = Omit<InsertUser, 'password'> & {
  password?: string;
  status: 'active' | 'inactive';
};

export default function CustomerSettings() {
  const { toast } = useToast();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const params = new URLSearchParams(window.location.search);
  const defaultTab = params.get('tab') || "customer-settings";

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(insertCustomerSchema.omit({ status: true })),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      adminName: "",
      adminEmail: "",
    },
  });

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(
      insertUserSchema.omit({ password: true }).extend({
        password: insertUserSchema.shape.password.optional(),
        status: z.enum(['active', 'inactive']).default('active')
      })
    ),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      title: "",
      mobile: "",
      status: "active" as const
    },
  });

  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customer-settings"],
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: [`/api/customers/${customer?.id}/users`],
    enabled: !!customer?.id
  });

  const createUser = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!customer?.id) throw new Error("No customer ID available");
      const response = await apiRequest(
        "POST",
        `/api/customers/${customer.id}/users`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      setIsUserFormOpen(false);
      userForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer?.id}/users`] });
      toast({
        title: "Success",
        description: "User has been created successfully.",
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

  const updateUser = useMutation({
    mutationFn: async (data: UserFormData & { id: number }) => {
      const { id, ...updateData } = data;
      if (!customer?.id) throw new Error("No customer ID available");

      console.log('Starting user update mutation:', {
        userId: id,
        customerData: customer?.id,
        fields: Object.keys(updateData),
        timestamp: new Date().toISOString()
      });

      try {
        const response = await apiRequest(
          "PATCH",
          `/api/customers/${customer?.id}/users/${id}`,
          updateData
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Update failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            timestamp: new Date().toISOString()
          });
          throw new Error(errorData || 'Failed to update user');
        }

        const result = await response.json();
        console.log('Update successful:', {
          userId: id,
          result,
          timestamp: new Date().toISOString()
        });
        return result;
      } catch (error) {
        console.error('Update mutation error:', {
          error,
          userId: id,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Update mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer?.id}/users`] });
      setIsUserFormOpen(false);
      setSelectedUser(null);
      userForm.reset();
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Update user error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!customer?.id) throw new Error("No customer ID available");
      const response = await apiRequest(
        "PATCH",
        `/api/customers/${customer?.id}/users/${userId}`,
        { status: 'inactive' }
      );
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer?.id}/users`] });
      toast({
        title: "Success",
        description: "User has been deleted successfully",
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

  const onSubmit = async (data: UserFormData) => {
    console.log('Form submission started:', {
      formData: { ...data, password: data.password ? '[REDACTED]' : undefined },
      timestamp: new Date().toISOString()
    });

    // Check for form validation errors
    const errors = userForm.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.error('Form validation errors:', errors);
      toast({
        title: "Validation Error",
        description: "Please check the form for errors",
        variant: "destructive",
      });
      return;
    }

    if (selectedUser) {
      updateUser.mutate({ ...data, id: selectedUser.id });
    } else {
      createUser.mutate(data);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      title: user.title || "",
      mobile: user.mobile || "",
      status: user.status,
    });
    setIsUserFormOpen(true);
  };

  React.useEffect(() => {
    if (customer) {
      customerForm.reset({
        name: customer.name,
        address: customer.address,
        phoneNumber: customer.phoneNumber,
        adminName: customer.adminName,
        adminEmail: customer.adminEmail,
      });
    }
  }, [customer, customerForm]);

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      return await apiRequest("PATCH", "/api/customer-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-settings"] });
      toast({
        title: "Success",
        description: "Customer information has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save customer information",
        variant: "destructive",
      });
    },
  });

  if (isLoadingCustomer || isLoadingUsers) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-10">
        <Tabs defaultValue={defaultTab} className="space-y-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <TabsList className="w-full border-b px-2 bg-card">
            <TabsTrigger
              value="customer-settings"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-primary hover:bg-muted/50 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Customer Settings
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-primary hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer-settings" className="mt-6">
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-primary" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...customerForm}>
                  <form
                    onSubmit={customerForm.handleSubmit((data) =>
                      updateCustomerMutation.mutate(data)
                    )}
                    className="space-y-6"
                  >
                    <FormField
                      control={customerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your customer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer phone number" {...field} />
                          </FormControl>
                          <FormDescription>
                            Format: +1 (123) 456-7890 or 1234567890
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="adminName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter admin name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter admin email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateCustomerMutation.isPending}
                    >
                      {updateCustomerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Customer Information"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="border-2 shadow-sm">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5 text-primary" />
                    User Management
                  </CardTitle>
                  <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedUser(null);
                          userForm.reset();
                        }}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {selectedUser ? "Edit User" : "Add New User"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...userForm}>
                        <form onSubmit={userForm.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={userForm.control}
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
                            control={userForm.control}
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
                          <FormField
                            control={userForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!selectedUser && (
                            <FormField
                              control={userForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" />
                                  </FormControl>
                                  <FormDescription>
                                    Must be at least 8 characters with a number and special
                                    character
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <FormField
                            control={userForm.control}
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
                            control={userForm.control}
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
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={createUser.isPending || updateUser.isPending}
                          >
                            {createUser.isPending || updateUser.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {selectedUser ? "Updating..." : "Creating..."}
                              </>
                            ) : selectedUser ? (
                              "Update User"
                            ) : (
                              "Create User"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive/90"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user
                                    "{user.firstName} {user.lastName}" and remove their access to the system.
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}