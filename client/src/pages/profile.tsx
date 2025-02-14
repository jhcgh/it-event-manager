import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertUser, insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.omit({ password: true })
    ),
    defaultValues: {
      username: user?.username || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      companyName: user?.companyName || "",
      title: user?.title || "",
      mobile: user?.mobile || "",
    },
  });

  const onSubmit = (data: Partial<InsertUser>) => {
    const updates = {
      ...data,
      companyName: data.companyName || user?.companyName,
    };
    console.log('Profile update initiated:', {
      updates,
      timestamp: new Date().toISOString()
    });
    updateProfileMutation.mutate(updates);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      console.log('Making profile update request:', {
        data,
        timestamp: new Date().toISOString()
      });
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response;
    },
    onMutate: async (newData) => {
      console.log('Optimistic update started:', {
        newData,
        timestamp: new Date().toISOString()
      });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/user"] });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(["/api/user"]);

      // Optimistically update to new value immediately
      queryClient.setQueryData(["/api/user"], (old: any) => ({
        ...old,
        ...newData,
      }));

      console.log('Optimistic update completed');
      return { previousUser };
    },
    onError: (error: Error, _newData, context) => {
      console.error('Profile update error:', {
        error,
        timestamp: new Date().toISOString()
      });
      // Rollback on error
      queryClient.setQueryData(["/api/user"], context?.previousUser);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (updatedUser) => {
      console.log('Profile update success:', {
        updatedUser,
        timestamp: new Date().toISOString()
      });
      // Update cache with server response
      queryClient.setQueryData(["/api/user"], updatedUser);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <Input
                  id="username"
                  type="email"
                  {...form.register("username")}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  {...form.register("companyName")}
                />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  {...form.register("mobile")}
                />
                {form.formState.errors.mobile && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.mobile.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}