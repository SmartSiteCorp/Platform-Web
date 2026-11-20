"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/text-field";
import type { DocumentResponseDto } from "@/generated/api";
import type { DocumentType, UploadDocumentResult } from "@/lib/documents";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx";
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

const documentTypeOptions: { readonly label: string; readonly value: DocumentType }[] = [
  { label: "Devis", value: "devis" },
  { label: "Plan", value: "plan" },
  { label: "Rapport", value: "rapport" },
  { label: "Contrat", value: "contrat" },
  { label: "Autre", value: "autre" },
];

const uploadFormSchema = z.object({
  documentType: z.enum(["devis", "plan", "rapport", "contrat", "autre"]),
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(180, "Le titre est trop long."),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export type UploadDocumentSubmitter = (
  title: string,
  documentType: DocumentType,
  file: File,
) => Promise<UploadDocumentResult>;

interface UploadDocumentFormProps {
  readonly onDocumentUploaded: (document: DocumentResponseDto) => void;
  readonly submitUpload: UploadDocumentSubmitter;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Format non autorisé. Utilisez PDF, image ou document bureautique.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Le fichier dépasse la taille maximale autorisée (50 Mo).";
  }
  return null;
}

function useUploadForm(
  submitUpload: UploadDocumentSubmitter,
  onDocumentUploaded: (doc: DocumentResponseDto) => void,
) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<UploadFormValues>({
    defaultValues: { documentType: "autre", title: "" },
    mode: "onTouched",
    resolver: zodResolver(uploadFormSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setFileError(null);
    setSuccessMessage(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const submitValidForm = async (values: UploadFormValues): Promise<void> => {
    if (!selectedFile) {
      setFileError("Veuillez sélectionner un fichier.");
      return;
    }
    setApiError(null);
    setSuccessMessage(null);
    const result = await submitUpload(values.title, values.documentType, selectedFile);
    if (!result.ok) {
      setApiError(result.message);
      return;
    }
    setSuccessMessage(`"${result.document.title}" a été ajouté avec succès.`);
    setSelectedFile(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    onDocumentUploaded(result.document);
  };

  return {
    apiError,
    errors,
    fileError,
    fileInputRef,
    handleFileChange,
    isSubmitting,
    register,
    selectedFile,
    submitForm: handleSubmit(submitValidForm),
    successMessage,
  };
}

export function UploadDocumentForm({ onDocumentUploaded, submitUpload }: UploadDocumentFormProps) {
  const {
    apiError,
    errors,
    fileError,
    fileInputRef,
    handleFileChange,
    isSubmitting,
    register,
    selectedFile,
    submitForm,
    successMessage,
  } = useUploadForm(submitUpload, onDocumentUploaded);

  return (
    <form
      aria-label="Formulaire upload document"
      className="space-y-4"
      noValidate
      onSubmit={(event) => void submitForm(event)}
    >
      <OrganizationFormStatusMessage message={successMessage} tone="success" />
      <OrganizationFormStatusMessage message={apiError} tone="error" />
      <TextField
        autoComplete="off"
        error={errors.title?.message}
        icon={FileText}
        id="document-title"
        label="Titre du document"
        type="text"
        {...register("title")}
      />
      <DocumentTypeField register={register} />
      <FileField
        error={fileError}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        selectedFile={selectedFile}
      />
      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="h-4 w-4" />
        )}
        Ajouter le document
      </Button>
    </form>
  );
}

interface DocumentTypeFieldProps {
  readonly register: ReturnType<typeof useForm<UploadFormValues>>["register"];
}

function DocumentTypeField({ register }: DocumentTypeFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="document-type">Type de document</Label>
      <select
        className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/25"
        id="document-type"
        {...register("documentType")}
      >
        {documentTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FileFieldProps {
  readonly error: string | null;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly selectedFile: File | null;
}

function FileField({ error, fileInputRef, onFileChange, selectedFile }: FileFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="document-file">Fichier</Label>
      <input
        accept={ACCEPTED_EXTENSIONS}
        aria-describedby={error ? "file-error" : undefined}
        aria-invalid={Boolean(error)}
        className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
        id="document-file"
        onChange={onFileChange}
        ref={fileInputRef}
        type="file"
      />
      {error ? (
        <p className="text-sm text-destructive" id="file-error" role="alert">
          {error}
        </p>
      ) : null}
      {selectedFile ? (
        <p className="text-xs text-muted-foreground">
          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} Ko)
        </p>
      ) : null}
    </div>
  );
}
