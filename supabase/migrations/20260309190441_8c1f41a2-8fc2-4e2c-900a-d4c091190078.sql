
-- Allow admin to view all transactions
CREATE POLICY "Admin can view all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@smartjunk.com'
  );

-- Allow admin to update all transactions
CREATE POLICY "Admin can update all transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@smartjunk.com'
  );

-- Allow admin to view all admin_messages
CREATE POLICY "Admin can view all admin messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@smartjunk.com'
  );

-- Wallets: allow system inserts via service role (the release_escrow function uses SECURITY DEFINER)
-- No additional policy needed since release_escrow_admin is SECURITY DEFINER
