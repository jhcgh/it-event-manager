import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import type { Company } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

// Simplified schema without allowedEventTypes
const customerSettingsSchema = z.object({
  maxUsers: z.number().min(1, "Must allow at least 1 user"),
  maxEvents: z.number().min(1, "Must allow at least 1 event"),
});

type CustomerSettings = z.infer<typeof customerSettingsSchema>;

export default function CustomerSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [location] = useLocation();

  console.log('CustomerSettings - User:', { 
    isSuperAdmin: user?.isSuperAdmin,
    userId: user?.id,
    location 
  });

  const params = new URLSearchParams(location.split('?')[1] || "");
  const customerId = parseInt(params.get('id') || (user?.companyId?.toString() || ''));

  // Redirect if not a super admin
  if (!user?.isSuperAdmin) {
    console.log('Redirecting non-super admin user');
    navigate('/admin');
    return null;
  }

  const { data: customer, isLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${customerId}`],
    enabled: !!customerId,
  });

  const form = useForm<CustomerSettings>({
    resolver: zodResolver(customerSettingsSchema),
    defaultValues: {
      maxUsers: customer?.settings?.maxUsers ?? 10,
      maxEvents: customer?.settings?.maxEvents ?? 20,
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (data: CustomerSettings) => {
      const response = await apiRequest("PATCH", `/api/companies/${customerId}/settings`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${customerId}`] });
      toast({
        title: "Settings Updated",
        description: "Customer settings have been successfully updated."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid customer ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const onSubmit = (data: CustomerSettings) => {
    updateSettings.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
            {user?.isSuperAdmin && (
              <Badge variant="outline">Super Admin Mode</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Customer Settings</h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Users</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormDescription>
                      Maximum number of users allowed for this customer
                    </FormDescription>
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
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormDescription>
                      Maximum number of events this customer can create
                    </FormDescription>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
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
        </div>
      </main>
    </div>
  );
}