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
import { Loader2, Building2, ArrowLeft, Users, UserPlus, Pencil } from "lucide-react";
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

type CustomerFormValues = {
  name: string;
  address: string;
  phoneNumber: string;
  adminName: string;
  adminEmail: string;
};

type UserFormData = InsertUser;

export default function CustomerSettings() {
  const { toast } = useToast();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      title: "",
      mobile: "",
      status: "active"
    },
  });

  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customer-settings"],
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: [`/api/customers/${customer?.id}/users`],
    enabled: !!customer?.id,
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
      const { id, password, ...updateData } = data;  // Exclude password from updates
      if (!customer?.id) throw new Error("No customer ID available");

      console.log('Starting user update:', {
        userId: id,
        customerId: customer.id,
        updateFields: Object.keys(updateData)
      });

      const response = await apiRequest(
        "PATCH",
        `/api/customers/${customer.id}/users/${id}`,
        updateData
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update user failed:', errorData);
        throw new Error(errorData.message || 'Failed to update user');
      }

      const result = await response.json();
      console.log('Update successful:', { userId: id, result });
      return result;
    },
    onSuccess: () => {
      setIsUserFormOpen(false);
      setSelectedUser(null);
      userForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer?.id}/users`] });
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Update user mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleSubmitUser = async (formData: UserFormData) => {
    try {
      if (selectedUser) {
        console.log('Updating existing user:', {
          userId: selectedUser.id,
          formData: { ...formData, password: '[REDACTED]' }
        });
        await updateUser.mutateAsync({ ...formData, id: selectedUser.id });
      } else {
        console.log('Creating new user:', {
          formData: { ...formData, password: '[REDACTED]' }
        });
        await createUser.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save user information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: User) => {
    console.log('Editing user:', user);
    setSelectedUser(user);
    userForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      title: user.title,
      mobile: user.mobile,
      status: user.status
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
        <Tabs defaultValue="customer-settings" className="space-y-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
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
                  <Dialog open={isUserFormOpen} onOpenChange={(open) => {
                    if (!open) {
                      setSelectedUser(null);
                      userForm.reset();
                    }
                    setIsUserFormOpen(open);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedUser(null);
                          userForm.reset();
                          setIsUserFormOpen(true);
                        }}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedUser ? "Edit User" : "Add New User"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...userForm}>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            userForm.handleSubmit(handleSubmitUser)(e);
                          }}
                          className="space-y-4"
                        >
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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