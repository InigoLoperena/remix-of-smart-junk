
-- Add basic RLS policies for company tables (used internally by trigger)
CREATE POLICY "Users can view own invitations"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can view own memberships"
  ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
