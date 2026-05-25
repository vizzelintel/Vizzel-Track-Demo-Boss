'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TEST_IDS } from '@/components/test-ids';

type Props = {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonTestId?: string;
};

export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = 'ลบเลย',
  cancelText = 'ยกเลิก',
  confirmButtonTestId,
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>

      <AlertDialogContent data-testid={TEST_IDS.CONFIRM_DELETE_DIALOG.WRAPPER}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid={TEST_IDS.CONFIRM_DELETE_DIALOG.BUTTON_CANCEL}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            data-testid={confirmButtonTestId ?? TEST_IDS.CONFIRM_DELETE_DIALOG.BUTTON_CONFIRM}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
