
DROP POLICY "Anyone can view open requests" ON public.pickup_requests;
CREATE POLICY "Anyone can view open requests"
  ON public.pickup_requests
  FOR SELECT
  USING (true);
