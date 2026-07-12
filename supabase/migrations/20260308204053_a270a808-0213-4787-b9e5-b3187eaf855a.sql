
-- Create chat messages table for bid-related conversations
CREATE TABLE public.bid_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bid_messages ENABLE ROW LEVEL SECURITY;

-- Only the two parties (request owner + bidder) can view messages
CREATE POLICY "Participants can view bid messages"
ON public.bid_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR bid_id IN (
    SELECT b.id FROM public.bids b
    JOIN public.pickup_requests pr ON pr.id = b.pickup_request_id
    WHERE b.bidder_id = auth.uid() OR pr.user_id = auth.uid()
  )
);

-- Only participants can insert messages on accepted bids
CREATE POLICY "Participants can send bid messages"
ON public.bid_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND bid_id IN (
    SELECT b.id FROM public.bids b
    JOIN public.pickup_requests pr ON pr.id = b.pickup_request_id
    WHERE b.status = 'accepted'
    AND (b.bidder_id = auth.uid() OR pr.user_id = auth.uid())
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bid_messages;
