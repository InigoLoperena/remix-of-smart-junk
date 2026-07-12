-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view request messages they participate in" ON public.request_messages;

-- Create updated SELECT policy that includes superadmin
CREATE POLICY "Users can view request messages they participate in"
ON public.request_messages
FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR request_id IN (SELECT id FROM pickup_requests WHERE user_id = auth.uid())
  OR public.user_participated_in_request(auth.uid(), request_id)
  OR request_id IN (SELECT pickup_request_id FROM bids WHERE bidder_id = auth.uid())
  OR (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'inigoloperena@gmail.com'
);