-- Fix foreign keys to CASCADE on delete
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_pickup_request_id_fkey;
ALTER TABLE public.bids ADD CONSTRAINT bids_pickup_request_id_fkey 
  FOREIGN KEY (pickup_request_id) REFERENCES public.pickup_requests(id) ON DELETE CASCADE;

ALTER TABLE public.bid_messages DROP CONSTRAINT IF EXISTS bid_messages_bid_id_fkey;
ALTER TABLE public.bid_messages ADD CONSTRAINT bid_messages_bid_id_fkey 
  FOREIGN KEY (bid_id) REFERENCES public.bids(id) ON DELETE CASCADE;

ALTER TABLE public.request_messages DROP CONSTRAINT IF EXISTS request_messages_request_id_fkey;
ALTER TABLE public.request_messages ADD CONSTRAINT request_messages_request_id_fkey 
  FOREIGN KEY (request_id) REFERENCES public.pickup_requests(id) ON DELETE CASCADE;