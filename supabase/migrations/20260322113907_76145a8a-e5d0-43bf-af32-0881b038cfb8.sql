-- Fix RLS policies that directly reference auth.users (causes 403 errors)
-- Replace with is_superadmin() function which uses SECURITY DEFINER

-- Fix admin_messages SELECT policy
DROP POLICY IF EXISTS "Admin can view all admin messages" ON public.admin_messages;
CREATE POLICY "Admin can view all admin messages"
  ON public.admin_messages FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Fix request_messages SELECT policy  
DROP POLICY IF EXISTS "Users can view request messages they participate in" ON public.request_messages;
CREATE POLICY "Users can view request messages they participate in"
  ON public.request_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR request_id IN (SELECT id FROM public.pickup_requests WHERE user_id = auth.uid())
    OR public.user_participated_in_request(auth.uid(), request_id)
    OR request_id IN (SELECT pickup_request_id FROM public.bids WHERE bidder_id = auth.uid())
    OR conversation_id IN (SELECT id FROM public.request_conversations WHERE participant_id = auth.uid())
    OR public.is_superadmin(auth.uid())
  );

-- Fix transactions SELECT policy for admin
DROP POLICY IF EXISTS "Admin can view all transactions" ON public.transactions;
CREATE POLICY "Admin can view all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Fix transactions UPDATE policy for admin
DROP POLICY IF EXISTS "Admin can update all transactions" ON public.transactions;
CREATE POLICY "Admin can update all transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Fix company_invitations SELECT policy
DROP POLICY IF EXISTS "Users can view own invitations" ON public.company_invitations;
CREATE POLICY "Users can view own invitations"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );