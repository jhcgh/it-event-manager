import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertCustomerSchema, type Customer, insertUserSchema, type InsertUser } from "@shared/schema";
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
import { Loader2, Building2, ArrowLeft, Users, UserPlus } from "lucide-react";
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

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customer-settings"],
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

  const onSubmitUser = (data: UserFormData) => {
    createUser.mutate(data);
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

  if (isLoading) {
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
            <div className="flex gap-2">
              <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
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
                        disabled={createUser.isPending}
                      >
                        {createUser.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create User"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Link href="/company-users">
                <Button className="gap-2">
                  <Users className="h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
            </div>
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
        </Tabs>
      </div>
    </div>
  );
}