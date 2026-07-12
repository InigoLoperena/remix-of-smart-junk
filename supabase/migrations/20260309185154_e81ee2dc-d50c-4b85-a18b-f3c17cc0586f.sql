
DROP POLICY "Users can view request messages they participate in" ON public.request_messages;

CREATE POLICY "Users can view request messages they participate in"
ON public.request_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR request_id IN (
    SELECT id FROM public.pickup_requests WHERE user_id = auth.uid()
  )
  OR request_id IN (
    SELECT DISTINCT rm.request_id FROM public.request_messages rm WHERE rm.sender_id = auth.uid()
  )
);
