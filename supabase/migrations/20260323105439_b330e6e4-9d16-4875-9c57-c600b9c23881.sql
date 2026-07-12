
CREATE OR REPLACE FUNCTION public.notify_owner_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _request_owner_id uuid;
  _sender_name text;
BEGIN
  -- Skip system messages
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RETURN NEW;
  END IF;

  -- Get request owner
  SELECT user_id INTO _request_owner_id
  FROM public.pickup_requests
  WHERE id = NEW.request_id;

  -- Skip if sender is the owner (don't notify yourself)
  IF NEW.sender_id = _request_owner_id THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT COALESCE(full_name, email, 'Un usuario')
  INTO _sender_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id;

  -- Insert notification for the owner
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    _request_owner_id,
    'new_message',
    'Nuevo mensaje',
    _sender_name || ' te ha enviado un mensaje en tu anuncio',
    '/marketplace/' || NEW.request_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_request_message
AFTER INSERT ON public.request_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_on_new_message();
