
-- Create conversations table for private chat threads per request
CREATE TABLE public.request_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, participant_id)
);

-- Enable RLS
ALTER TABLE public.request_conversations ENABLE ROW LEVEL SECURITY;

-- Request owner and participant can view conversations
CREATE POLICY "Owner and participant can view conversations"
  ON public.request_conversations FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR request_id IN (SELECT id FROM public.pickup_requests WHERE user_id = auth.uid())
    OR (SELECT email FROM auth.users WHERE id = auth.uid())::text = 'inigoloperena@gmail.com'
  );

-- Authenticated users can create conversations
CREATE POLICY "Authenticated users can create conversations"
  ON public.request_conversations FOR INSERT TO authenticated
  WITH CHECK (participant_id = auth.uid());

-- Add conversation_id to request_messages (nullable for backward compat)
ALTER TABLE public.request_messages ADD COLUMN conversation_id uuid REFERENCES public.request_conversations(id) ON DELETE CASCADE;

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_conversations;
