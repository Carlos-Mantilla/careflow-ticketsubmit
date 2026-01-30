import * as React from "react";
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
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  message,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmación</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onCancel?.()}
            >
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={onConfirm}>
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
