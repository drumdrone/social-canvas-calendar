-- Create storage bucket for social media images
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media-images', 'social-media-images', true);

-- Create social media posts table
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
  image_url TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own posts" 
ON public.social_media_posts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" 
ON public.social_media_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.social_media_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.social_media_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for social media images
CREATE POLICY "Social media images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'social-media-images');

CREATE POLICY "Users can upload their own social media images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own social media images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own social media images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'social-media-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();