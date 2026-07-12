
-- Create a security definer function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = _user_id AND email = 'inigoloperena@gmail.com'
  )
$$;

-- Drop old SELECT policy
DROP POLICY IF EXISTS "Owner and participant can view conversations" ON public.request_conversations;

-- Recreate SELECT policy without direct auth.users reference
CREATE POLICY "Owner and participant can view conversations"
  ON public.request_conversations FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR request_id IN (SELECT id FROM public.pickup_requests WHERE user_id = auth.uid())
    OR public.is_superadmin(auth.uid())
  );

-- Add unique constraint to prevent duplicate conversations
ALTER TABLE public.request_conversations 
  ADD CONSTRAINT request_conversations_request_participant_unique 
  UNIQUE (request_id, participant_id);
