
-- Storage bucket for pickup request photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pickup-photos', 'pickup-photos', true);

-- Storage RLS: anyone authenticated can upload
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pickup-photos');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'pickup-photos');
CREATE POLICY "Owners can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pickup-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Pickup requests table
CREATE TABLE public.pickup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  num_items TEXT NOT NULL DEFAULT '1-5',
  address TEXT NOT NULL DEFAULT '',
  preferred_date DATE,
  preferred_time TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open requests
CREATE POLICY "Anyone can view open requests" ON public.pickup_requests FOR SELECT TO authenticated USING (true);
-- Users can create their own requests
CREATE POLICY "Users can create own requests" ON public.pickup_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can update their own requests
CREATE POLICY "Users can update own requests" ON public.pickup_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Bids table
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_request_id UUID NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_type TEXT NOT NULL CHECK (bid_type IN ('pay_for_removal', 'charge_for_removal')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view bids (pujas visibles)
CREATE POLICY "Anyone can view bids" ON public.bids FOR SELECT TO authenticated USING (true);
-- Authenticated users can create bids (not on own requests - enforced in app)
CREATE POLICY "Users can create bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
-- Request owner can update bid status (accept/reject)
CREATE POLICY "Request owner can update bids" ON public.bids FOR UPDATE TO authenticated USING (
  pickup_request_id IN (SELECT id FROM public.pickup_requests WHERE user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_pickup_requests_updated_at BEFORE UPDATE ON public.pickup_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_requests;
