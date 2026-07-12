
-- Fix overly permissive INSERT policy - notifications should only be inserted by the user themselves or by triggers (SECURITY DEFINER)
DROP POLICY "Service can insert notifications" ON public.notifications;

-- Only allow users to insert notifications for themselves (triggers use SECURITY DEFINER and bypass RLS)
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
