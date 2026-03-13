"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Ruler,
  Pencil,
  Dog,
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
import { FieldForm } from "@/components/forms/field-form";
import type { Field, Livestock } from "@/types/database";

interface FieldWithLivestock extends Field {
  livestock?: Pick<Livestock, "id" | "name" | "species">[];
}

interface FieldManagementProps {
  farmId: string;
  fields: FieldWithLivestock[];
}

const fieldTypeIcons: Record<string, string> = {
  PASTURE: "bg-green-100 text-green-800",
  CROP: "bg-yellow-100 text-yellow-800",
  ORCHARD: "bg-orange-100 text-orange-800",
  GREENHOUSE: "bg-emerald-100 text-emerald-800",
  BARN: "bg-red-100 text-red-800",
  STORAGE: "bg-blue-100 text-blue-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function FieldManagement({
  farmId,
  fields,
}: FieldManagementProps) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [editingField, setEditingField] = React.useState<Field | undefined>();

  const handleEditField = (field: Field) => {
    setEditingField(field);
    setShowForm(true);
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setEditingField(undefined);
    }
    setShowForm(open);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  // Calculate totals
  const totalAcres = fields.reduce((sum, f) => sum + (f.acres || 0), 0);
  const totalLivestock = fields.reduce(
    (sum, f) => sum + (f.livestock?.length || 0),
    0
  );

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fields
            </CardTitle>
            <MapPin className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fields.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Acres
            </CardTitle>
            <Ruler className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAcres.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Animals Assigned
            </CardTitle>
            <Dog className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLivestock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Fields Grid */}
      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Fields Yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Add fields to organize where your livestock and crops are located
            </p>
            <Button onClick={() => setShowForm(true)}>
              Add Your First Field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <Card
              key={field.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{field.name}</CardTitle>
                    {field.field_type && (
                      <Badge
                        variant="secondary"
                        className={`mt-1 ${
                          fieldTypeIcons[field.field_type] || ""
                        }`}
                      >
                        {field.field_type.charAt(0) +
                          field.field_type.slice(1).toLowerCase()}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditField(field)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {field.acres && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span>{field.acres} acres</span>
                  </div>
                )}

                {field.description && (
                  <p className="text-sm text-muted-foreground">
                    {field.description}
                  </p>
                )}

                {field.livestock && field.livestock.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Livestock Assigned
                      </span>
                      <Badge variant="secondary">
                        {field.livestock.length} animal
                        {field.livestock.length !== 1 && "s"}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {field.livestock.slice(0, 5).map((animal) => (
                        <li key={animal.id} className="text-sm">
                          <Link
                            href={`/inventory/livestock/${animal.id}`}
                            className="hover:underline text-muted-foreground hover:text-foreground"
                          >
                            {animal.name} ({animal.species})
                          </Link>
                        </li>
                      ))}
                      {field.livestock.length > 5 && (
                        <li className="text-sm text-muted-foreground">
                          and {field.livestock.length - 5} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {(!field.livestock || field.livestock.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    No livestock assigned
                  </p>
                )}

                {field.notes && (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t">
                    {field.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <FieldForm
        farmId={farmId}
        field={editingField}
        open={showForm}
        onOpenChange={handleFormClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}
