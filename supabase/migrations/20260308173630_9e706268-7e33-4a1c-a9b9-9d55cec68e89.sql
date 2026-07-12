
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow inserts from service role (edge functions) and triggers
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification when a bid is placed
CREATE OR REPLACE FUNCTION public.notify_on_bid_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request_owner_id uuid;
  _bidder_name text;
  _bid_type_label text;
BEGIN
  -- Get request owner
  SELECT user_id INTO _request_owner_id FROM public.pickup_requests WHERE id = NEW.pickup_request_id;
  
  -- Get bidder name
  SELECT COALESCE(full_name, email, 'Un usuario') INTO _bidder_name FROM public.profiles WHERE user_id = NEW.bidder_id;
  
  _bid_type_label := CASE WHEN NEW.bid_type = 'pay_for_removal' THEN 'pagar por los objetos' ELSE 'cobrar por la recogida' END;
  
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    _request_owner_id,
    'bid_received',
    'Nueva puja recibida',
    _bidder_name || ' quiere ' || _bid_type_label || ' por €' || NEW.amount,
    '/marketplace/' || NEW.pickup_request_id,
    jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bid_insert
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_bid_insert();

-- Function to notify on bid status change (accepted/rejected)
CREATE OR REPLACE FUNCTION public.notify_on_bid_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request_owner_name text;
  _request_owner_id uuid;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  SELECT user_id INTO _request_owner_id FROM public.pickup_requests WHERE id = NEW.pickup_request_id;
  SELECT COALESCE(full_name, email, 'El propietario') INTO _request_owner_name FROM public.profiles WHERE user_id = _request_owner_id;
  
  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.bidder_id,
      'bid_accepted',
      '¡Tu puja ha sido aceptada!',
      _request_owner_name || ' ha aceptado tu puja de €' || NEW.amount,
      '/marketplace/' || NEW.pickup_request_id,
      jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id, 'bid_type', NEW.bid_type, 'amount', NEW.amount)
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.bidder_id,
      'bid_rejected',
      'Puja rechazada',
      'Tu puja de €' || NEW.amount || ' ha sido rechazada',
      '/marketplace/' || NEW.pickup_request_id,
      jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bid_update
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_bid_update();
