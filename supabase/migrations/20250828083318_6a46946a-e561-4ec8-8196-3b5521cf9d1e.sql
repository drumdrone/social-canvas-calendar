-- Create authors table
CREATE TABLE public.authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL CHECK (length(initials) = 3),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on authors table
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- Create policies for authors table
CREATE POLICY "Public read authors" 
ON public.authors 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert authors" 
ON public.authors 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update authors" 
ON public.authors 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete authors" 
ON public.authors 
FOR DELETE 
USING (true);

-- Add author field to social_media_posts table
ALTER TABLE public.social_media_posts 
ADD COLUMN author TEXT;

-- Create trigger for updated_at on authors
CREATE TRIGGER update_authors_updated_at
BEFORE UPDATE ON public.authors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default authors
INSERT INTO public.authors (name, initials, color) VALUES 
('Honza', 'HON', '#3B82F6'),
('Marketing Team', 'MKT', '#10B981'),
('Creative Director', 'CRE', '#F59E0B');