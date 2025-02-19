import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { QueryClient } from "@tanstack/react-query"; 

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.confirmPassword !== data.password) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });
  }
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface AuthResponse {
  requiresVerification?: boolean;
  email?: string;
  message?: string;
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [loginError, setLoginError] = useState<string>("");
  const { toast } = useToast();
  const queryClient = new QueryClient();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    if (mode === 'register' || mode === 'login') {
      setActiveTab(mode);
    }
  }, []);

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      title: "",
      mobile: "",
      customerName: "", 
    },
    mode: "onBlur",
  });

  if (user) {
    return <Redirect to={user.isSuperAdmin ? "/admin" : "/dashboard"} />;
  }

  const handleRegister = async (data: RegisterFormData) => {
    try {
      console.log('Starting registration process');
      const { confirmPassword, ...registrationData } = data;

      queryClient.setQueryData(["/api/user"], null);

      const response = await registerMutation.mutateAsync(registrationData) as AuthResponse;
      console.log('Registration response:', { ...response, email: response.email ? '[REDACTED]' : undefined });

      if (response.requiresVerification && response.email) {
        toast({
          title: "Registration successful",
          description: "Please check your email for the verification code.",
        });
        window.location.replace(`/verify-email?email=${encodeURIComponent(response.email)}`);
        return;
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (data: any) => {
    try {
      setLoginError(""); 
      console.log('Starting login process');

      queryClient.setQueryData(["/api/user"], null);

      const response = await loginMutation.mutateAsync(data) as AuthResponse;
      console.log('Login response:', { 
        requiresVerification: response.requiresVerification,
        hasEmail: !!response.email
      });

      if (response.requiresVerification && response.email) {
        toast({
          title: "Verification required",
          description: "Please verify your email address before logging in.",
        });
        window.location.replace(`/verify-email?email=${encodeURIComponent(response.email)}`);
        return;
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed. Please try again.");
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid md:grid-cols-2">
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to ITEvents.io</CardTitle>
              <CardDescription>
                <strong>Manage</strong> and <strong>discover</strong> technology events <strong>worldwide</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form
                    onSubmit={loginForm.handleSubmit(handleLogin)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Email</Label>
                      <Input
                        id="login-username"
                        type="email"
                        {...loginForm.register("username")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        {...loginForm.register("password")}
                      />
                    </div>
                    {loginError && (
                      <div className="text-sm text-destructive font-medium">
                        {loginError}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Logging in...
                        </div>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form
                    onSubmit={registerForm.handleSubmit(handleRegister)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Email</Label>
                      <Input
                        id="register-username"
                        type="email"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        {...registerForm.register("password")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must contain at least 8 characters, one number and one special character
                      </p>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirm Password</Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...registerForm.register("firstName")}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...registerForm.register("lastName")}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        {...registerForm.register("customerName")}
                      />
                      {registerForm.formState.errors.customerName && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.customerName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        {...registerForm.register("title")}
                      />
                      {registerForm.formState.errors.title && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.title.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        {...registerForm.register("mobile")}
                      />
                      {registerForm.formState.errors.mobile && (
                        <p className="text-sm text-destructive">
                          {registerForm.formState.errors.mobile.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating account...
                        </div>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="hidden md:block bg-gradient-to-br from-primary to-purple-600 p-8">
          <div className="h-full flex flex-col justify-center text-white">
            <h1 className="text-4xl font-bold mb-6">
              Your Gateway to Tech Events
            </h1>
            <ul className="space-y-4 text-lg">
              <li>✓ Post and manage your tech events</li>
              <li>✓ Reach a global audience</li>
              <li>✓ Connect with tech enthusiasts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}