
ALTER TABLE public.dossier_notes
  ADD CONSTRAINT dossier_notes_author_profile_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.dossier_history
  ADD CONSTRAINT dossier_history_changed_by_profile_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
