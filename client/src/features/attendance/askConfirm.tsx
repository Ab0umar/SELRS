import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Pending = { message: string; resolve: (accepted: boolean) => void };

let showDialog: ((pending: Pending | null) => void) | null = null;

/**
 * Themed, RTL-aware replacement for window.confirm in the attendance module.
 * Resolves true when the user confirms. If the host is not mounted it falls
 * back to the browser dialog so a destructive action is never skipped silently.
 */
export function askConfirm(message: string): Promise<boolean> {
  if (!showDialog) return Promise.resolve(window.confirm(message));
  return new Promise<boolean>((resolve) => {
    showDialog?.({ message, resolve });
  });
}

/** Mount once (AttendanceLayout) so every attendance page can use askConfirm. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    showDialog = (next) => {
      // A newer question replaces an unanswered one, which counts as declined.
      setPending((previous) => {
        previous?.resolve(false);
        return next;
      });
    };
    return () => {
      showDialog = null;
    };
  }, []);

  const settle = (accepted: boolean) => {
    pending?.resolve(accepted);
    setPending(null);
  };

  const destructive = /حذف|إيقاف|ايقاف|مسح|إلغاء/.test(pending?.message ?? "");

  return (
    <>
      <ConfirmDialog
        open={pending !== null}
        title="تأكيد الإجراء"
        description={pending?.message ?? ""}
        isDestructive={destructive}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
      <NoteHost />
    </>
  );
}

type PendingNote = { message: string; resolve: (note: string | null) => void };

let showNote: ((pending: PendingNote | null) => void) | null = null;

/**
 * Themed replacement for window.prompt: resolves the typed note (possibly
 * empty) or null when the user cancels.
 */
export function askNote(message: string): Promise<string | null> {
  if (!showNote) return Promise.resolve(window.prompt(message));
  return new Promise<string | null>((resolve) => {
    showNote?.({ message, resolve });
  });
}

function NoteHost() {
  const [pending, setPending] = useState<PendingNote | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    showNote = (next) => {
      setPending((previous) => {
        previous?.resolve(null);
        return next;
      });
      setText("");
    };
    return () => {
      showNote = null;
    };
  }, []);

  const settle = (note: string | null) => {
    pending?.resolve(note);
    setPending(null);
  };

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => !open && settle(null)}
    >
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{pending?.message ?? ""}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={pending?.message ?? "ملاحظة"}
          rows={3}
        />
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={() => settle(text.trim())}>
            تأكيد الرفض
          </Button>
          <Button variant="outline" onClick={() => settle(null)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
