import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft, UserPlus, Pencil, Trash2, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import type { User, InsertUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserFormData = InsertUser;

// Company Settings Schema
const companySettingsSchema = z.object({
  maxUsers: z.number().min(1, "Must allow at least 1 user"),
  maxEvents: z.number().min(1, "Must allow at least 1 event"),
  requireEventApproval: z.boolean(),
  allowedEventTypes: z.array(z.string()).min(1, "Must allow at least one event type")
});

export default function CompanyUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);

  // Company settings form
  const settingsForm = useForm({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      maxUsers: 10,
      maxEvents: 20,
      requireEventApproval: false,
      allowedEventTypes: ["conference", "workshop", "seminar"]
    }
  });

  // Delete company mutation
  const deleteCompany = useMutation({
    mutationFn: async () => {
      if (!user?.companyId) return;
      const response = await apiRequest(
        "DELETE",
        `/api/companies/${user.companyId}`
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
      navigate('/');
      toast({
        title: "Success",
        description: "Company has been deleted successfully.",
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

  const form = useForm<UserFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      title: "",
      mobile: "",
      companyName: "",
    },
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: [`/api/companies/${user?.companyId}/users`],
    enabled: !!user?.companyId,
  });

  const createUser = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest(
        "POST",
        `/api/companies/${user?.companyId}/users`,
        data
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/companies/${user?.companyId}/users`],
      });
      setIsUserFormOpen(false);
      form.reset();
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
      const response = await apiRequest(
        "PATCH",
        `/api/companies/${user?.companyId}/users/${id}`,
        updateData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/companies/${user?.companyId}/users`],
      });
      setIsUserFormOpen(false);
      setSelectedUser(null);
      form.reset();
      toast({
        title: "Success",
        description: "User has been updated successfully.",
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

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest(
        "DELETE",
        `/api/companies/${user?.companyId}/users/${userId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/companies/${user?.companyId}/users`],
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User has been deleted successfully.",
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

  const onSubmit = (data: UserFormData) => {
    if (selectedUser) {
      updateUser.mutate({ ...data, id: selectedUser.id });
    } else {
      createUser.mutate(data);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      title: user.title,
      mobile: user.mobile,
      companyName: user.companyName || "",
    });
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  if (!user?.companyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          You are not associated with any company.
        </p>
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
            {user?.isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setIsDeleteCompanyDialogOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Delete Company
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Company Users</h1>
          <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  form.reset();
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedUser ? "Edit User" : "Add New User"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormField
                    control={form.control}
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
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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

        <div className="border rounded-lg">
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
                  <TableCell className="space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the user
                from your company.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedUser && deleteUser.mutate(selectedUser.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteCompanyDialogOpen}
          onOpenChange={setIsDeleteCompanyDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Delete Company
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                This action cannot be undone. This will permanently delete your company
                and remove all associated data including:
                <ul className="list-disc list-inside mt-4 space-y-2">
                  <li>All user accounts</li>
                  <li>All events</li>
                  <li>All company settings</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCompany.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCompany.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting Company...
                  </>
                ) : (
                  "Delete Company"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}