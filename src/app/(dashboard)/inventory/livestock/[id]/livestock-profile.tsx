"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  Pencil,
  Trash2,
  Plus,
  Calendar,
  Scale,
  Tag,
  MapPin,
  DollarSign,
  Stethoscope,
  Users,
  History,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LivestockForm } from "@/components/forms/livestock-form";
import { MedicalRecordForm } from "@/components/forms/medical-record-form";
import { deleteLivestock, createLivestockFamily } from "@/actions/inventory";
import type { Field, MedicalRecord, Income } from "@/types/database";

interface LivestockData {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  tag_number: string | null;
  birth_date: string | null;
  weight: number | null;
  gender: string | null;
  status: string;
  field_id: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  farm_id: string;
  field?: { id: string; name: string } | null;
  medical_records?: MedicalRecord[];
  income?: Income[];
}

interface FamilyData {
  offspring: Array<{
    id: string;
    child: {
      id: string;
      name: string;
      species: string;
      tag_number: string | null;
      status: string;
    };
  }>;
  parents: Array<{
    id: string;
    parent: {
      id: string;
      name: string;
      species: string;
      tag_number: string | null;
      status: string;
    };
  }>;
}

interface LivestockProfileProps {
  livestock: LivestockData;
  fields: Field[];
  families: FamilyData;
  allLivestock: Array<{
    id: string;
    name: string;
    species: string;
    tag_number: string | null;
  }>;
  isEditing?: boolean;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SOLD: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DECEASED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  TRANSFERRED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  QUARANTINED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const medicalTypeColors: Record<string, string> = {
  VACCINATION: "bg-blue-100 text-blue-800",
  TREATMENT: "bg-orange-100 text-orange-800",
  CHECKUP: "bg-green-100 text-green-800",
  SURGERY: "bg-red-100 text-red-800",
  MEDICATION: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function LivestockProfile({
  livestock,
  fields,
  families,
  allLivestock,
  isEditing = false,
}: LivestockProfileProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showMedicalForm, setShowMedicalForm] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<MedicalRecord | undefined>();
  const [activeTab, setActiveTab] = React.useState(isEditing ? "edit" : "profile");

  const handleDelete = async () => {
    try {
      const result = await deleteLivestock(livestock.id, livestock.farm_id);
      if (result.success) {
        toast.success("Livestock deleted successfully");
        router.push("/inventory/livestock");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete livestock");
    }
  };

  const handleEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
    setShowMedicalForm(true);
  };

  const handleMedicalFormClose = (open: boolean) => {
    if (!open) {
      setEditingRecord(undefined);
    }
    setShowMedicalForm(open);
  };

  const handleMedicalSuccess = () => {
    router.refresh();
  };

  const age = livestock.birth_date
    ? formatDistanceToNow(parseISO(livestock.birth_date))
    : null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {livestock.name}
            <Badge
              variant="secondary"
              className={statusColors[livestock.status] || ""}
            >
              {livestock.status.charAt(0) + livestock.status.slice(1).toLowerCase()}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            {livestock.species} {livestock.breed && `- ${livestock.breed}`}
            {livestock.tag_number && ` | Tag: ${livestock.tag_number}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === "edit" ? "profile" : "edit")}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {activeTab === "edit" ? "View Profile" : "Edit"}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="medical">
            Medical Records ({livestock.medical_records?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tag Number:</span>
                  <span className="font-medium">
                    {livestock.tag_number || "Not assigned"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Birth Date:</span>
                  <span className="font-medium">
                    {livestock.birth_date
                      ? format(parseISO(livestock.birth_date), "PPP")
                      : "Unknown"}
                    {age && ` (${age} old)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="font-medium">
                    {livestock.weight ? `${livestock.weight} lbs` : "Not recorded"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium">
                    {livestock.gender
                      ? livestock.gender.charAt(0) +
                        livestock.gender.slice(1).toLowerCase()
                      : "Unknown"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location & Acquisition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Field:</span>
                  <span className="font-medium">
                    {livestock.field?.name || "Not assigned"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Acquired:</span>
                  <span className="font-medium">
                    {livestock.acquisition_date
                      ? format(parseISO(livestock.acquisition_date), "PPP")
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">
                    {livestock.acquisition_cost
                      ? `$${livestock.acquisition_cost.toFixed(2)}`
                      : "Not recorded"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {livestock.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{livestock.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="medical" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Medical Records</h3>
            <Button onClick={() => setShowMedicalForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </div>

          {livestock.medical_records && livestock.medical_records.length > 0 ? (
            <div className="space-y-3">
              {livestock.medical_records
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((record) => (
                  <Card
                    key={record.id}
                    className="cursor-pointer hover:border-primary/50"
                    onClick={() => handleEditRecord(record)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={medicalTypeColors[record.type] || ""}
                            >
                              {record.type.charAt(0) +
                                record.type.slice(1).toLowerCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(record.date), "PPP")}
                            </span>
                          </div>
                          {record.description && (
                            <p className="text-sm">{record.description}</p>
                          )}
                          {record.medicine && (
                            <p className="text-sm text-muted-foreground">
                              Medicine: {record.medicine}
                              {record.dosage && ` (${record.dosage})`}
                            </p>
                          )}
                          {record.administered_by && (
                            <p className="text-xs text-muted-foreground">
                              By: {record.administered_by}
                            </p>
                          )}
                        </div>
                        <Stethoscope className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {record.follow_up_date && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            Follow-up:{" "}
                            {format(parseISO(record.follow_up_date), "PPP")}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Stethoscope className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No medical records yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowMedicalForm(true)}
                >
                  Add First Record
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parents</CardTitle>
                <CardDescription>Known parents of this animal</CardDescription>
              </CardHeader>
              <CardContent>
                {families.parents.length > 0 ? (
                  <div className="space-y-2">
                    {families.parents.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{link.parent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {link.parent.species}
                            {link.parent.tag_number &&
                              ` | #${link.parent.tag_number}`}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={statusColors[link.parent.status] || ""}
                        >
                          {link.parent.status.charAt(0) +
                            link.parent.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No known parents
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offspring</CardTitle>
                <CardDescription>Children of this animal</CardDescription>
              </CardHeader>
              <CardContent>
                {families.offspring.length > 0 ? (
                  <div className="space-y-2">
                    {families.offspring.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{link.child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {link.child.species}
                            {link.child.tag_number &&
                              ` | #${link.child.tag_number}`}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={statusColors[link.child.status] || ""}
                        >
                          {link.child.status.charAt(0) +
                            link.child.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No known offspring
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Income History
              </CardTitle>
              <CardDescription>
                Sales and income linked to this animal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {livestock.income && livestock.income.length > 0 ? (
                <div className="space-y-2">
                  {livestock.income.map((inc) => (
                    <div
                      key={inc.id}
                      className="flex items-center justify-between p-3 rounded bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{inc.item}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(inc.date), "PPP")}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">
                        ${inc.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No income records linked to this animal
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">
                    Created:{" "}
                    {format(parseISO(livestock.created_at), "PPP 'at' p")}
                  </span>
                </div>
                {livestock.updated_at !== livestock.created_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Last updated:{" "}
                      {format(parseISO(livestock.updated_at), "PPP 'at' p")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <LivestockForm
            livestock={livestock as any}
            fields={fields}
            mode="edit"
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {livestock.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this animal and all its associated
              medical records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Medical Record Form */}
      <MedicalRecordForm
        livestockId={livestock.id}
        record={editingRecord}
        open={showMedicalForm}
        onOpenChange={handleMedicalFormClose}
        onSuccess={handleMedicalSuccess}
      />
    </>
  );
}
