
-- Wallets table for user balances
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Transactions table for escrow tracking
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  pickup_request_id uuid NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'escrow',
  payer_confirmed boolean NOT NULL DEFAULT false,
  recipient_confirmed boolean NOT NULL DEFAULT false,
  stripe_session_id text,
  disputed boolean NOT NULL DEFAULT false,
  dispute_reason text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their transactions" ON public.transactions
  FOR SELECT TO authenticated 
  USING (auth.uid() = payer_id OR auth.uid() = recipient_id);

CREATE POLICY "Participants can update their transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = recipient_id);

-- Admin messages table for superadmin mediation in chats
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction participants and admin can view" ON public.admin_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR transaction_id IN (
      SELECT id FROM public.transactions WHERE payer_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

CREATE POLICY "Anyone authenticated can insert admin messages" ON public.admin_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for transactions and admin_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;

-- Trigger for updated_at on wallets
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on transactions
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to release escrow to wallet
CREATE OR REPLACE FUNCTION public.release_escrow(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tx RECORD;
BEGIN
  SELECT * INTO _tx FROM public.transactions WHERE id = transaction_id AND status = 'escrow';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found or not in escrow'; END IF;
  IF NOT _tx.payer_confirmed OR NOT _tx.recipient_confirmed THEN
    RAISE EXCEPTION 'Both parties must confirm before release';
  END IF;
  
  -- Update transaction status
  UPDATE public.transactions SET status = 'released' WHERE id = transaction_id;
  
  -- Add to recipient wallet (create if not exists)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (_tx.recipient_id, _tx.amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance;
END;
$$;
