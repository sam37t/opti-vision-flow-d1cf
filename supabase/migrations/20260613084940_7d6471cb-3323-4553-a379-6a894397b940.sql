DROP POLICY IF EXISTS "Sender can delete own messages" ON public.messages;
CREATE POLICY "Sender or recipient can delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);