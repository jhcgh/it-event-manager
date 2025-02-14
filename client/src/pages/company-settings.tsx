import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { useLocation } from "wouter";
import type { Company } from "@shared/schema";

const companySettingsSchema = z.object({
  maxUsers: z.number().min(1, "Must allow at least 1 user"),
  maxEvents: z.number().min(1, "Must allow at least 1 event"),
  requireEventApproval: z.boolean(),
  allowedEventTypes: z.array(z.string())
});

type CompanySettings = z.infer<typeof companySettingsSchema>;

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${user?.companyId}`],
    enabled: !!user?.companyId,
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
      const response = await apiRequest<Company>(`/api/companies/${user?.companyId}/settings`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${user?.companyId}`] });
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

  if (!user?.companyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">You are not associated with any company.</p>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Company Settings</h1>

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
    </div>
  );
}