import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Get email from URL params and handle missing email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      console.log("Verification page loaded for email:", emailParam);
      setEmail(emailParam);
    } else {
      console.log("No email parameter found, redirecting to auth page");
      navigate("/auth");
    }
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      console.log("Attempting to verify email:", email);
      const response = await apiRequest("POST", "/api/verify-email", {
        email,
        code: verificationCode,
      });

      if (response.ok) {
        console.log("Email verification successful");
        // Invalidate user query to refresh auth state
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Success",
          description: "Email verified successfully. You can now log in.",
        });
        navigate("/auth?mode=login");
      } else {
        const error = await response.json();
        console.log("Verification failed:", error);
        if (error.codeExpired) {
          // If code has expired, show message about new code being sent
          toast({
            title: "Code Expired",
            description: "A new verification code has been sent to your email.",
            variant: "default",
          });
          setVerificationCode(""); // Clear the input field
        } else {
          throw new Error(error.message || "Verification failed");
        }
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
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

      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Please enter the verification code sent to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isVerifying}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}