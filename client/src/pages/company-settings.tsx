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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import type { Company } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const EVENT_TYPES = ["conference", "workshop", "seminar", "meetup", "training"];

const companySettingsSchema = z.object({
  maxUsers: z.number().min(1, "Must allow at least 1 user"),
  maxEvents: z.number().min(1, "Must allow at least 1 event"),
  requireEventApproval: z.boolean(),
  allowedEventTypes: z.array(z.string()).min(1, "Must allow at least one event type")
});

type CompanySettings = z.infer<typeof companySettingsSchema>;

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [location] = useLocation();

  console.log('CompanySettings - User:', { 
    isSuperAdmin: user?.isSuperAdmin,
    userId: user?.id,
    location 
  });

  const params = new URLSearchParams(location.split('?')[1] || "");
  const companyId = parseInt(params.get('id') || (user?.companyId?.toString() || ''));

  // Redirect if not a super admin
  if (!user?.isSuperAdmin) {
    console.log('Redirecting non-super admin user');
    navigate('/admin');
    return null;
  }

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${companyId}`],
    enabled: !!companyId,
  });

  const form = useForm<CompanySettings>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      maxUsers: company?.settings?.maxUsers ?? 10,
      maxEvents: company?.settings?.maxEvents ?? 20,
      requireEventApproval: company?.settings?.requireEventApproval ?? false,
      allowedEventTypes: company?.settings?.allowedEventTypes ?? ["conference", "workshop", "seminar"]
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (data: CompanySettings) => {
      const response = await apiRequest("PATCH", `/api/companies/${companyId}/settings`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}`] });
      toast({
        title: "Settings Updated",
        description: "Company settings have been successfully updated."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update company settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (!companyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid company ID.</p>
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

  const onSubmit = (data: CompanySettings) => {
    updateSettings.mutate(data);
  };

  const toggleEventType = (type: string) => {
    const currentTypes = form.getValues("allowedEventTypes");
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    form.setValue("allowedEventTypes", newTypes, { shouldValidate: true });
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
              <Badge variant="destructive">Super Admin Mode</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Company Settings</h1>
            {user?.isSuperAdmin && (
              <Badge variant="outline" className="text-destructive border-destructive">
                Advanced Settings Enabled
              </Badge>
            )}
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
                      Maximum number of users allowed in your company
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
                      Maximum number of events your company can create
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requireEventApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Require Event Approval
                      </FormLabel>
                      <FormDescription>
                        Events will need approval before being published
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowedEventTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed Event Types</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPES.map(type => (
                        <Badge
                          key={type}
                          variant={field.value.includes(type) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleEventType(type)}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                    <FormDescription>
                      Select the types of events that can be created
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