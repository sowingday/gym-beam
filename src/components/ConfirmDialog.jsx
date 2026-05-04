import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '../lib/i18n';

export default function ConfirmDialog({ open, onConfirm, onCancel, title, description = '' }) {
  const { language } = useI18n();
  const resolvedTitle = title || (language === 'en' ? 'Are you sure?' : 'Sicher?');

  return (
    <AlertDialog open={open} onOpenChange={(value) => { if (!value) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{language === 'en' ? 'Cancel' : 'Abbrechen'}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Ok</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
