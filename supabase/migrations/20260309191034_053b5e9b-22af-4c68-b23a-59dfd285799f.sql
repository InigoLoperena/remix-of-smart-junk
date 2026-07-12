
DROP POLICY "Admin can view all transactions" ON public.transactions;
DROP POLICY "Admin can update all transactions" ON public.transactions;
DROP POLICY "Admin can view all admin messages" ON public.admin_messages;

CREATE POLICY "Admin can view all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'inigoloperena@gmail.com');

CREATE POLICY "Admin can update all transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'inigoloperena@gmail.com');

CREATE POLICY "Admin can view all admin messages" ON public.admin_messages
  FOR SELECT TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'inigoloperena@gmail.com');
