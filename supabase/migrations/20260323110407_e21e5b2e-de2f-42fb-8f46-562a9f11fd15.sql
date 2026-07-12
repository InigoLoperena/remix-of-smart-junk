-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload chat images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Anyone can view chat images
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-images');

-- Users can delete their own chat images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);