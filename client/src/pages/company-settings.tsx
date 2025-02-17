// This file is deprecated. Please use customer-settings.tsx instead.
// Redirecting to the new customer settings page
import { Redirect } from "wouter";

export default function CompanySettings() {
  return <Redirect to="/customer-settings" />;
}