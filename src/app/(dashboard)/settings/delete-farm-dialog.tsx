"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { deleteFarm } from "@/actions/farm";

interface DeleteFarmDialogProps {
  farmId: string;
  farmName: string;
}

export function DeleteFarmDialog({ farmId, farmName }: DeleteFarmDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canProceed = confirmText === farmName;

  const handleFirstConfirm = () => {
    if (canProceed) {
      setOpen(false);
      setConfirmOpen(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteFarm(farmId);

      if (result.success) {
        toast.success("Farm deleted successfully");
        router.push("/");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error deleting farm:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setConfirmText("");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setConfirmText("");
  };

  return (
    <>
      {/* First Dialog - Type farm name to confirm */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Farm
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Farm
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              farm and all associated data including:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All expenses and income records</li>
                  <li>All inventory and livestock data</li>
                  <li>All customer and invoice information</li>
                  <li>All team members will lose access</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-name">
                Type <strong>{farmName}</strong> to confirm:
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={farmName}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFirstConfirm}
              disabled={!canProceed}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second Dialog - Final confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{farmName}</strong>.
              This is your final warning. All data will be lost forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              No, keep my farm
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, delete permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
