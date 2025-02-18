import { Redirect } from "wouter";

export default function CompanyUsers() {
  // Redirect to customer settings page with users tab selected
  return <Redirect to="/customer-settings?tab=users" />;
}