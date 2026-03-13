"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, Moon, Sun, Monitor, Bell, Mail, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updatePreferences } from "@/actions/profile";
import { type PreferencesData } from "@/schemas/profile";

interface PreferencesFormProps {
  preferences: Record<string, unknown> | null;
}

export function PreferencesForm({ preferences }: PreferencesFormProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = React.useState(false);
  const [localPreferences, setLocalPreferences] = React.useState<PreferencesData>({
    theme: (preferences?.theme as "light" | "dark" | "system") || "system",
    emailNotifications: (preferences?.emailNotifications as boolean) ?? true,
    weeklyReports: (preferences?.weeklyReports as boolean) ?? true,
    marketAlerts: (preferences?.marketAlerts as boolean) ?? false,
  });

  const handleThemeChange = async (value: string) => {
    setTheme(value);
    setLocalPreferences((prev) => ({ ...prev, theme: value as PreferencesData["theme"] }));
    await savePreference({ theme: value as PreferencesData["theme"] });
  };

  const handleToggle = async (key: keyof PreferencesData, value: boolean) => {
    setLocalPreferences((prev) => ({ ...prev, [key]: value }));
    await savePreference({ [key]: value });
  };

  const savePreference = async (update: Partial<PreferencesData>) => {
    setIsLoading(true);
    try {
      const result = await updatePreferences({
        ...localPreferences,
        ...update,
      });

      if (result.success) {
        toast.success("Preferences updated");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Customize your experience and notification settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred color theme
              </p>
            </div>
            <Select
              value={localPreferences.theme || theme || "system"}
              onValueChange={handleThemeChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-base font-medium">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={localPreferences.emailNotifications}
                onCheckedChange={(checked) =>
                  handleToggle("emailNotifications", checked)
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-reports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Get a weekly summary of your farm activity
                </p>
              </div>
              <Switch
                id="weekly-reports"
                checked={localPreferences.weeklyReports}
                onCheckedChange={(checked) =>
                  handleToggle("weeklyReports", checked)
                }
                disabled={isLoading || !localPreferences.emailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="market-alerts">Market Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notify me about relevant market price changes
                </p>
              </div>
              <Switch
                id="market-alerts"
                checked={localPreferences.marketAlerts}
                onCheckedChange={(checked) =>
                  handleToggle("marketAlerts", checked)
                }
                disabled={isLoading || !localPreferences.emailNotifications}
              />
            </div>
          </div>

          {!localPreferences.emailNotifications && (
            <p className="text-xs text-muted-foreground">
              Enable email notifications to receive weekly reports and market
              alerts.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
