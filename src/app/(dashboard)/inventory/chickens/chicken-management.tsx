"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, subDays } from "date-fns";
import {
  Plus,
  Egg,
  Bird,
  MapPin,
  BarChart3,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { ChickenFlockForm } from "@/components/forms/chicken-flock-form";
import { EggLogForm } from "@/components/forms/egg-log-form";
import { deleteChickenFlock, deleteEggLog } from "@/actions/inventory";
import type { ChickenFlock, EggLog } from "@/types/database";

interface ChickenFlockWithLogs extends ChickenFlock {
  egg_logs?: EggLog[];
}

interface EggLogWithFlock extends EggLog {
  flock?: {
    id: string;
    breed: string;
    farm_id: string;
  };
}

interface ChickenManagementProps {
  farmId: string;
  flocks: ChickenFlockWithLogs[];
  eggLogs: EggLogWithFlock[];
}

export function ChickenManagement({
  farmId,
  flocks,
  eggLogs,
}: ChickenManagementProps) {
  const router = useRouter();
  const [showFlockForm, setShowFlockForm] = React.useState(false);
  const [showEggLogForm, setShowEggLogForm] = React.useState(false);
  const [editingFlock, setEditingFlock] = React.useState<ChickenFlock | undefined>();
  const [deleteFlockId, setDeleteFlockId] = React.useState<string | null>(null);

  // Calculate stats
  const totalChickens = flocks.reduce((sum, f) => sum + f.count, 0);
  const totalFlocks = flocks.length;

  // Get eggs from last 7 days
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentEggs = eggLogs
    .filter((log) => new Date(log.date) >= sevenDaysAgo)
    .reduce((sum, log) => sum + log.eggs_collected, 0);

  // Total eggs all time
  const totalEggsAllTime = eggLogs.reduce(
    (sum, log) => sum + log.eggs_collected,
    0
  );

  // Average eggs per day (last 7 days)
  const avgEggsPerDay = (recentEggs / 7).toFixed(1);

  const handleEditFlock = (flock: ChickenFlock) => {
    setEditingFlock(flock);
    setShowFlockForm(true);
  };

  const handleFlockFormClose = (open: boolean) => {
    if (!open) {
      setEditingFlock(undefined);
    }
    setShowFlockForm(open);
  };

  const handleDeleteFlock = async () => {
    if (!deleteFlockId) return;

    try {
      const result = await deleteChickenFlock(deleteFlockId, farmId);
      if (result.success) {
        toast.success("Flock deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete flock");
    } finally {
      setDeleteFlockId(null);
    }
  };

  const handleDeleteEggLog = async (id: string, flockId: string) => {
    if (!confirm("Delete this egg log?")) return;

    try {
      const result = await deleteEggLog(id, flockId);
      if (result.success) {
        toast.success("Egg log deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete egg log");
    }
  };

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Flocks
            </CardTitle>
            <Bird className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFlocks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Chickens
            </CardTitle>
            <Bird className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalChickens}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eggs This Week
            </CardTitle>
            <Egg className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentEggs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{avgEggsPerDay} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Eggs
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEggsAllTime}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setShowFlockForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Flock
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowEggLogForm(true)}
          disabled={flocks.length === 0}
        >
          <Egg className="h-4 w-4 mr-2" />
          Log Eggs
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Flocks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bird className="h-5 w-5" />
              Chicken Flocks
            </CardTitle>
            <CardDescription>
              Manage your chicken flocks and their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flocks.length === 0 ? (
              <div className="text-center py-8">
                <Bird className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No flocks added yet
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowFlockForm(true)}
                >
                  Add Your First Flock
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {flocks.map((flock) => {
                  const flockEggs =
                    flock.egg_logs?.reduce(
                      (sum, log) => sum + log.eggs_collected,
                      0
                    ) || 0;

                  return (
                    <div
                      key={flock.id}
                      className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{flock.breed}</h4>
                            {flock.has_rooster && (
                              <Badge variant="outline">Has Rooster</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {flock.count} chickens
                          </p>
                          {flock.coop_location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {flock.coop_location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {flockEggs} eggs collected
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFlock(flock)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteFlockId(flock.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {flock.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {flock.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Egg Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Egg className="h-5 w-5" />
              Recent Egg Logs
            </CardTitle>
            <CardDescription>
              Daily egg collection records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eggLogs.length === 0 ? (
              <div className="text-center py-8">
                <Egg className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No egg logs yet</p>
                <Button
                  variant="outline"
                  onClick={() => setShowEggLogForm(true)}
                  disabled={flocks.length === 0}
                >
                  Log Your First Collection
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {eggLogs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">
                        {log.eggs_collected} eggs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.flock?.breed || "Unknown flock"} -{" "}
                        {format(parseISO(log.date), "MMM d, yyyy")}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {log.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDeleteEggLog(log.id, log.flock_id)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forms */}
      <ChickenFlockForm
        farmId={farmId}
        flock={editingFlock}
        open={showFlockForm}
        onOpenChange={handleFlockFormClose}
        onSuccess={handleSuccess}
      />

      <EggLogForm
        flocks={flocks}
        open={showEggLogForm}
        onOpenChange={setShowEggLogForm}
        onSuccess={handleSuccess}
      />

      {/* Delete Flock Confirmation */}
      <AlertDialog
        open={!!deleteFlockId}
        onOpenChange={() => setDeleteFlockId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flock?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this flock and all associated egg
              logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
