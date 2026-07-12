
-- Update request_messages SELECT policy to also allow viewing via conversation membership
DROP POLICY IF EXISTS "Users can view request messages they participate in" ON public.request_messages;

CREATE POLICY "Users can view request messages they participate in"
  ON public.request_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR request_id IN (SELECT id FROM public.pickup_requests WHERE user_id = auth.uid())
    OR user_participated_in_request(auth.uid(), request_id)
    OR request_id IN (SELECT pickup_request_id FROM public.bids WHERE bidder_id = auth.uid())
    OR conversation_id IN (SELECT id FROM public.request_conversations WHERE participant_id = auth.uid())
    OR (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'inigoloperena@gmail.com'
  );
