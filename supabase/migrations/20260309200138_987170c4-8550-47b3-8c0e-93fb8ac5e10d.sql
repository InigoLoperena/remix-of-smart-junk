
-- Drop ALL existing policies on request_messages
DROP POLICY IF EXISTS "Authenticated users can send request messages" ON public.request_messages;
DROP POLICY IF EXISTS "Request owners can reply to messages" ON public.request_messages;
DROP POLICY IF EXISTS "Users can view request messages they participate in" ON public.request_messages;

-- Create a security definer function to check if user has sent messages to a request
-- This avoids the recursive SELECT on request_messages
CREATE OR REPLACE FUNCTION public.user_participated_in_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.request_messages
    WHERE sender_id = _user_id AND request_id = _request_id
  )
$$;

-- SELECT: participants can view (uses security definer to avoid recursion)
CREATE POLICY "Users can view request messages they participate in"
ON public.request_messages FOR SELECT TO authenticated
USING (
  sender_id = auth.uid()
  OR request_id IN (SELECT id FROM pickup_requests WHERE user_id = auth.uid())
  OR public.user_participated_in_request(auth.uid(), request_id)
);

-- INSERT: any authenticated user can send (PERMISSIVE, single policy)
CREATE POLICY "Authenticated users can send request messages"
ON public.request_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);
