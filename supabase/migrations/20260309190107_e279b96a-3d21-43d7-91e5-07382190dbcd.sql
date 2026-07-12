
CREATE OR REPLACE FUNCTION public.release_escrow_admin(_transaction_id uuid, _amount numeric, _recipient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (_recipient_id, _amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + _amount;
END;
$$;
