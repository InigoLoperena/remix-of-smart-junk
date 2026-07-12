
-- Drop the two restrictive INSERT policies
DROP POLICY "Authenticated users can send request messages" ON public.request_messages;
DROP POLICY "Request owners can reply to messages" ON public.request_messages;

-- Recreate as PERMISSIVE policies so either one passing is sufficient
CREATE POLICY "Authenticated users can send request messages"
ON public.request_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND NOT (request_id IN (SELECT id FROM pickup_requests WHERE user_id = auth.uid()))
);

CREATE POLICY "Request owners can reply to messages"
ON public.request_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND request_id IN (SELECT id FROM pickup_requests WHERE user_id = auth.uid())
);
