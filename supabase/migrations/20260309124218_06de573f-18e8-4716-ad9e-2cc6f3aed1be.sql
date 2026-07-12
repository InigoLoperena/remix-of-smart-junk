CREATE POLICY "Users can delete own requests"
ON public.pickup_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);