CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _has_invitation boolean;
  _account_type text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.company_invitations WHERE email = NEW.email AND accepted = false
  ) INTO _has_invitation;

  IF _has_invitation THEN
    _account_type := 'company';
  ELSE
    _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, account_type)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _account_type
  );
  
  INSERT INTO public.company_members (company_id, user_id, role)
  SELECT ci.company_id, NEW.id, 'member'
  FROM public.company_invitations ci
  WHERE ci.email = NEW.email AND ci.accepted = false;
  
  UPDATE public.company_invitations SET accepted = true WHERE email = NEW.email AND accepted = false;
  
  RETURN NEW;
END;
$$;