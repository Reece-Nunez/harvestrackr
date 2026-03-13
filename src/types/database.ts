export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type FarmType =
  | "CROP"
  | "LIVESTOCK"
  | "DAIRY"
  | "POULTRY"
  | "MIXED"
  | "ORGANIC"
  | "VINEYARD"
  | "ORCHARD"
  | "AQUACULTURE"
  | "OTHER";

export type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "VIEWER"
  | "CONTRACTOR";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type LivestockGender = "MALE" | "FEMALE" | "UNKNOWN";

export type LivestockStatus =
  | "ACTIVE"
  | "SOLD"
  | "DECEASED"
  | "TRANSFERRED"
  | "QUARANTINED";

export type LivestockRelationshipType = "PARENT" | "OFFSPRING" | "SIBLING";

export type MedicalRecordType =
  | "VACCINATION"
  | "TREATMENT"
  | "CHECKUP"
  | "SURGERY"
  | "MEDICATION"
  | "OTHER";

export type FieldType =
  | "PASTURE"
  | "CROP"
  | "ORCHARD"
  | "GREENHOUSE"
  | "BARN"
  | "STORAGE"
  | "OTHER";

export type InventoryItemType =
  | "FEED"
  | "SEED"
  | "FERTILIZER"
  | "PESTICIDE"
  | "EQUIPMENT"
  | "TOOL"
  | "SUPPLY"
  | "OTHER";

export type PaymentMethod =
  | "CASH"
  | "CHECK"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "ONLINE"
  | "OTHER";

export interface Database {
  public: {
    Tables: {
      import_history: {
        Row: {
          id: string;
          farm_id: string;
          user_id: string;
          import_type: string;
          filename: string;
          total_rows: number;
          successful_rows: number;
          failed_rows: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          user_id: string;
          import_type: string;
          filename: string;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          user_id?: string;
          import_type?: string;
          filename?: string;
          total_rows?: number;
          successful_rows?: number;
          failed_rows?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_history_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      farms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          farm_type: FarmType;
          description: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          country: string | null;
          acres: number | null;
          established_year: number | null;
          website: string | null;
          business_registration: string | null;
          tax_id: string | null;
          phone_number: string | null;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          farm_type: FarmType;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          country?: string | null;
          acres?: number | null;
          established_year?: number | null;
          website?: string | null;
          business_registration?: string | null;
          tax_id?: string | null;
          phone_number?: string | null;
          email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          farm_type?: FarmType;
          description?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          country?: string | null;
          acres?: number | null;
          established_year?: number | null;
          website?: string | null;
          business_registration?: string | null;
          tax_id?: string | null;
          phone_number?: string | null;
          email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "farms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          farm_id: string;
          user_id: string;
          role: TeamRole;
          permissions: Json | null;
          is_active: boolean;
          joined_at: string;
          last_login_at: string | null;
          invited_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          user_id: string;
          role: TeamRole;
          permissions?: Json | null;
          is_active?: boolean;
          joined_at?: string;
          last_login_at?: string | null;
          invited_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          user_id?: string;
          role?: TeamRole;
          permissions?: Json | null;
          is_active?: boolean;
          joined_at?: string;
          last_login_at?: string | null;
          invited_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      team_invitations: {
        Row: {
          id: string;
          farm_id: string;
          email: string;
          role: TeamRole;
          status: InvitationStatus;
          invited_by_user_id: string;
          invited_by_name: string | null;
          message: string | null;
          expires_at: string;
          accepted_at: string | null;
          rejected_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          email: string;
          role: TeamRole;
          status?: InvitationStatus;
          invited_by_user_id: string;
          invited_by_name?: string | null;
          message?: string | null;
          expires_at: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          email?: string;
          role?: TeamRole;
          status?: InvitationStatus;
          invited_by_user_id?: string;
          invited_by_name?: string | null;
          message?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_invited_by_user_id_fkey";
            columns: ["invited_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          farm_id: string;
          user_id: string;
          date: string;
          vendor: string | null;
          description: string | null;
          grand_total: number;
          receipt_image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          user_id: string;
          date: string;
          vendor?: string | null;
          description?: string | null;
          grand_total: number;
          receipt_image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          user_id?: string;
          date?: string;
          vendor?: string | null;
          description?: string | null;
          grand_total?: number;
          receipt_image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      expense_line_items: {
        Row: {
          id: string;
          expense_id: string;
          item: string;
          category: string;
          quantity: number;
          unit_cost: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          item: string;
          category: string;
          quantity: number;
          unit_cost: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          expense_id?: string;
          item?: string;
          category?: string;
          quantity?: number;
          unit_cost?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_line_items_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          }
        ];
      };
      income: {
        Row: {
          id: string;
          farm_id: string;
          user_id: string;
          date: string;
          item: string;
          quantity: number;
          price: number;
          amount: number;
          payment_method: PaymentMethod | null;
          notes: string | null;
          livestock_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          user_id: string;
          date: string;
          item: string;
          quantity: number;
          price: number;
          amount: number;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          livestock_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          user_id?: string;
          date?: string;
          item?: string;
          quantity?: number;
          price?: number;
          amount?: number;
          payment_method?: PaymentMethod | null;
          notes?: string | null;
          livestock_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "income_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "income_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "income_livestock_id_fkey";
            columns: ["livestock_id"];
            isOneToOne: false;
            referencedRelation: "livestock";
            referencedColumns: ["id"];
          }
        ];
      };
      livestock: {
        Row: {
          id: string;
          farm_id: string;
          field_id: string | null;
          name: string;
          species: string;
          breed: string | null;
          tag_number: string | null;
          birth_date: string | null;
          weight: number | null;
          gender: LivestockGender | null;
          status: LivestockStatus;
          acquisition_date: string | null;
          acquisition_cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          field_id?: string | null;
          name: string;
          species: string;
          breed?: string | null;
          tag_number?: string | null;
          birth_date?: string | null;
          weight?: number | null;
          gender?: LivestockGender | null;
          status?: LivestockStatus;
          acquisition_date?: string | null;
          acquisition_cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          field_id?: string | null;
          name?: string;
          species?: string;
          breed?: string | null;
          tag_number?: string | null;
          birth_date?: string | null;
          weight?: number | null;
          gender?: LivestockGender | null;
          status?: LivestockStatus;
          acquisition_date?: string | null;
          acquisition_cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "livestock_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "livestock_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "fields";
            referencedColumns: ["id"];
          }
        ];
      };
      livestock_families: {
        Row: {
          id: string;
          parent_id: string;
          child_id: string;
          relationship_type: LivestockRelationshipType;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          child_id: string;
          relationship_type: LivestockRelationshipType;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          child_id?: string;
          relationship_type?: LivestockRelationshipType;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "livestock_families_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "livestock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "livestock_families_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "livestock";
            referencedColumns: ["id"];
          }
        ];
      };
      medical_records: {
        Row: {
          id: string;
          livestock_id: string;
          type: MedicalRecordType;
          date: string;
          description: string | null;
          medicine: string | null;
          dosage: string | null;
          administered_by: string | null;
          follow_up_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          livestock_id: string;
          type: MedicalRecordType;
          date: string;
          description?: string | null;
          medicine?: string | null;
          dosage?: string | null;
          administered_by?: string | null;
          follow_up_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          livestock_id?: string;
          type?: MedicalRecordType;
          date?: string;
          description?: string | null;
          medicine?: string | null;
          dosage?: string | null;
          administered_by?: string | null;
          follow_up_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_records_livestock_id_fkey";
            columns: ["livestock_id"];
            isOneToOne: false;
            referencedRelation: "livestock";
            referencedColumns: ["id"];
          }
        ];
      };
      fields: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          acres: number | null;
          description: string | null;
          field_type: FieldType | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          acres?: number | null;
          description?: string | null;
          field_type?: FieldType | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          name?: string;
          acres?: number | null;
          description?: string | null;
          field_type?: FieldType | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fields_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      chicken_flocks: {
        Row: {
          id: string;
          farm_id: string;
          breed: string;
          count: number;
          has_rooster: boolean;
          coop_location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          breed: string;
          count: number;
          has_rooster?: boolean;
          coop_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          breed?: string;
          count?: number;
          has_rooster?: boolean;
          coop_location?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chicken_flocks_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      egg_logs: {
        Row: {
          id: string;
          flock_id: string;
          date: string;
          eggs_collected: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          flock_id: string;
          date: string;
          eggs_collected: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          flock_id?: string;
          date?: string;
          eggs_collected?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "egg_logs_flock_id_fkey";
            columns: ["flock_id"];
            isOneToOne: false;
            referencedRelation: "chicken_flocks";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_items: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          type: InventoryItemType;
          quantity: number;
          unit: string | null;
          location: string | null;
          acquired_date: string | null;
          expiry_date: string | null;
          cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          type: InventoryItemType;
          quantity: number;
          unit?: string | null;
          location?: string | null;
          acquired_date?: string | null;
          expiry_date?: string | null;
          cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          name?: string;
          type?: InventoryItemType;
          quantity?: number;
          unit?: string | null;
          location?: string | null;
          acquired_date?: string | null;
          expiry_date?: string | null;
          cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          country: string | null;
          tax_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          country?: string | null;
          tax_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          country?: string | null;
          tax_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          farm_id: string;
          customer_id: string;
          invoice_number: string;
          date: string;
          due_date: string;
          status: InvoiceStatus;
          subtotal: number;
          tax_rate: number | null;
          tax_amount: number | null;
          discount_amount: number | null;
          total: number;
          notes: string | null;
          terms: string | null;
          paid_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          customer_id: string;
          invoice_number: string;
          date: string;
          due_date: string;
          status?: InvoiceStatus;
          subtotal: number;
          tax_rate?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          total: number;
          notes?: string | null;
          terms?: string | null;
          paid_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          customer_id?: string;
          invoice_number?: string;
          date?: string;
          due_date?: string;
          status?: InvoiceStatus;
          subtotal?: number;
          tax_rate?: number | null;
          tax_amount?: number | null;
          discount_amount?: number | null;
          total?: number;
          notes?: string | null;
          terms?: string | null;
          paid_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          category: string | null;
          unit: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          category?: string | null;
          unit?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          category?: string | null;
          unit?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          description: string | null;
          category: string | null;
          unit_price: number;
          unit: string | null;
          sku: string | null;
          barcode: string | null;
          stock_quantity: number;
          min_stock_level: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          unit_price: number;
          unit?: string | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          min_stock_level?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          unit_price?: number;
          unit?: string | null;
          sku?: string | null;
          barcode?: string | null;
          stock_quantity?: number;
          min_stock_level?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      farm_type: FarmType;
      team_role: TeamRole;
      invitation_status: InvitationStatus;
      invoice_status: InvoiceStatus;
      livestock_gender: LivestockGender;
      livestock_status: LivestockStatus;
      livestock_relationship_type: LivestockRelationshipType;
      medical_record_type: MedicalRecordType;
      field_type: FieldType;
      inventory_item_type: InventoryItemType;
      payment_method: PaymentMethod;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Convenience type aliases for common table types
export type User = Tables<"users">;
export type Farm = Tables<"farms">;
export type TeamMember = Tables<"team_members">;
export type TeamInvitation = Tables<"team_invitations">;
export type Expense = Tables<"expenses">;
export type LineItem = Tables<"expense_line_items">;
export type Income = Tables<"income">;
export type Livestock = Tables<"livestock">;
export type LivestockFamily = Tables<"livestock_families">;
export type MedicalRecord = Tables<"medical_records">;
export type Field = Tables<"fields">;
export type ChickenFlock = Tables<"chicken_flocks">;
export type EggLog = Tables<"egg_logs">;
export type InventoryItem = Tables<"inventory_items">;
export type Customer = Tables<"customers">;
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
export type Product = Tables<"products">;

// Insert type aliases
export type UserInsert = TablesInsert<"users">;
export type FarmInsert = TablesInsert<"farms">;
export type TeamMemberInsert = TablesInsert<"team_members">;
export type TeamInvitationInsert = TablesInsert<"team_invitations">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type LineItemInsert = TablesInsert<"expense_line_items">;
export type IncomeInsert = TablesInsert<"income">;
export type LivestockInsert = TablesInsert<"livestock">;
export type LivestockFamilyInsert = TablesInsert<"livestock_families">;
export type MedicalRecordInsert = TablesInsert<"medical_records">;
export type FieldInsert = TablesInsert<"fields">;
export type ChickenFlockInsert = TablesInsert<"chicken_flocks">;
export type EggLogInsert = TablesInsert<"egg_logs">;
export type InventoryItemInsert = TablesInsert<"inventory_items">;
export type CustomerInsert = TablesInsert<"customers">;
export type InvoiceInsert = TablesInsert<"invoices">;
export type InvoiceItemInsert = TablesInsert<"invoice_items">;
export type ProductInsert = TablesInsert<"products">;

// Update type aliases
export type UserUpdate = TablesUpdate<"users">;
export type FarmUpdate = TablesUpdate<"farms">;
export type TeamMemberUpdate = TablesUpdate<"team_members">;
export type TeamInvitationUpdate = TablesUpdate<"team_invitations">;
export type ExpenseUpdate = TablesUpdate<"expenses">;
export type LineItemUpdate = TablesUpdate<"expense_line_items">;
export type IncomeUpdate = TablesUpdate<"income">;
export type LivestockUpdate = TablesUpdate<"livestock">;
export type LivestockFamilyUpdate = TablesUpdate<"livestock_families">;
export type MedicalRecordUpdate = TablesUpdate<"medical_records">;
export type FieldUpdate = TablesUpdate<"fields">;
export type ChickenFlockUpdate = TablesUpdate<"chicken_flocks">;
export type EggLogUpdate = TablesUpdate<"egg_logs">;
export type InventoryItemUpdate = TablesUpdate<"inventory_items">;
export type CustomerUpdate = TablesUpdate<"customers">;
export type InvoiceUpdate = TablesUpdate<"invoices">;
export type InvoiceItemUpdate = TablesUpdate<"invoice_items">;
export type ProductUpdate = TablesUpdate<"products">;
