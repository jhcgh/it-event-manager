// Import the same content from company-settings.tsx but keep our customer-related changes
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertCustomerSchema, type Customer } from "@shared/schema";
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
import { Loader2, Building2, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

type CustomerFormValues = {
  name: string;
  address: string;
  phoneNumber: string;
  adminName: string;
  adminEmail: string;
};

export default function CustomerSettings() {
  const { toast } = useToast();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(insertCustomerSchema.omit({ status: true })),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      adminName: "",
      adminEmail: "",
    },
  });

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customer-settings"],
  });

  React.useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name,
        address: customer.address,
        phoneNumber: customer.phoneNumber,
        adminName: customer.adminName,
        adminEmail: customer.adminEmail,
      });
    }
  }, [customer, form]);

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
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Customer Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateCustomerMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
      </div>
    </div>
  );
}
