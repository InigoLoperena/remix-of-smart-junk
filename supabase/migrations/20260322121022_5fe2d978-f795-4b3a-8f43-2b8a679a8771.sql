
-- Helper function: find or create conversation and insert system message
CREATE OR REPLACE FUNCTION public.insert_system_chat_message(
  _request_id uuid,
  _participant_id uuid,
  _content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Find existing conversation for this participant
  SELECT id INTO _conv_id
  FROM public.request_conversations
  WHERE request_id = _request_id AND participant_id = _participant_id
  LIMIT 1;

  -- Create conversation if it doesn't exist
  IF _conv_id IS NULL THEN
    INSERT INTO public.request_conversations (request_id, participant_id)
    VALUES (_request_id, _participant_id)
    RETURNING id INTO _conv_id;
  END IF;

  -- Insert system message
  INSERT INTO public.request_messages (request_id, sender_id, content, conversation_id)
  VALUES (_request_id, '00000000-0000-0000-0000-000000000000'::uuid, _content, _conv_id);
END;
$$;

-- Update notify_on_bid_insert to also add system chat message
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
  _bid_type_label_en text;
BEGIN
  SELECT user_id INTO _request_owner_id FROM public.pickup_requests WHERE id = NEW.pickup_request_id;
  SELECT COALESCE(full_name, email, 'Un usuario') INTO _bidder_name FROM public.profiles WHERE user_id = NEW.bidder_id;

  _bid_type_label := CASE WHEN NEW.bid_type = 'pay_for_removal' THEN 'pagar por los objetos' ELSE 'cobrar por la recogida' END;

  -- Notification (existing)
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    _request_owner_id, 'bid_received', 'Nueva puja recibida',
    _bidder_name || ' quiere ' || _bid_type_label || ' por €' || NEW.amount,
    '/marketplace/' || NEW.pickup_request_id,
    jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id)
  );

  -- System chat message in the bidder's conversation
  _bid_type_label_en := CASE WHEN NEW.bid_type = 'pay_for_removal' THEN 'pay for the items' ELSE 'charge for removal' END;
  PERFORM public.insert_system_chat_message(
    NEW.pickup_request_id,
    NEW.bidder_id,
    '📩 New bid placed: €' || NEW.amount || ' (' || _bid_type_label_en || '). Waiting for the owner to accept or reject.'
  );

  RETURN NEW;
END;
$$;

-- Update notify_on_bid_update to also add system chat messages on accept/reject
CREATE OR REPLACE FUNCTION public.notify_on_bid_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request_owner_name text;
  _request_owner_id uuid;
  _bid_type_label text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT user_id INTO _request_owner_id FROM public.pickup_requests WHERE id = NEW.pickup_request_id;
  SELECT COALESCE(full_name, email, 'The owner') INTO _request_owner_name FROM public.profiles WHERE user_id = _request_owner_id;

  IF NEW.status = 'accepted' THEN
    -- Notification
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.bidder_id, 'bid_accepted', '¡Tu puja ha sido aceptada!',
      _request_owner_name || ' ha aceptado tu puja de €' || NEW.amount,
      '/marketplace/' || NEW.pickup_request_id,
      jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id, 'bid_type', NEW.bid_type, 'amount', NEW.amount)
    );

    _bid_type_label := CASE WHEN NEW.bid_type = 'pay_for_removal' THEN 'The owner must now pay' ELSE 'The bidder must now pay' END;

    -- System chat message
    PERFORM public.insert_system_chat_message(
      NEW.pickup_request_id,
      NEW.bidder_id,
      '✅ Bid of €' || NEW.amount || ' has been accepted! ' || _bid_type_label || ' to proceed. Once payment is completed, funds will be held in escrow.'
    );

  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.bidder_id, 'bid_rejected', 'Puja rechazada',
      'Tu puja de €' || NEW.amount || ' ha sido rechazada',
      '/marketplace/' || NEW.pickup_request_id,
      jsonb_build_object('bid_id', NEW.id, 'pickup_request_id', NEW.pickup_request_id)
    );

    PERFORM public.insert_system_chat_message(
      NEW.pickup_request_id,
      NEW.bidder_id,
      '❌ Bid of €' || NEW.amount || ' has been rejected by the owner.'
    );

  ELSIF NEW.status = 'expired' THEN
    PERFORM public.insert_system_chat_message(
      NEW.pickup_request_id,
      NEW.bidder_id,
      '⏰ Bid of €' || NEW.amount || ' has expired after 7 days without response.'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure triggers are attached
DROP TRIGGER IF EXISTS on_bid_insert ON public.bids;
CREATE TRIGGER on_bid_insert
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_bid_insert();

DROP TRIGGER IF EXISTS on_bid_update ON public.bids;
CREATE TRIGGER on_bid_update
  AFTER UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_bid_update();
