
-- Table for pre-bid chat on pickup requests
CREATE TABLE public.request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view messages on requests they own or sent
CREATE POLICY "Users can view request messages they participate in"
ON public.request_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR request_id IN (
    SELECT id FROM public.pickup_requests WHERE user_id = auth.uid()
  )
);

-- Authenticated users can send messages (not to their own requests)
CREATE POLICY "Authenticated users can send request messages"
ON public.request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND request_id NOT IN (
    SELECT id FROM public.pickup_requests WHERE user_id = auth.uid()
  )
);

-- Request owners can also send messages (replies)
CREATE POLICY "Request owners can reply to messages"
ON public.request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND request_id IN (
    SELECT id FROM public.pickup_requests WHERE user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;
