-- Create platforms table for custom platforms
CREATE TABLE public.platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_statuses table for custom statuses
CREATE TABLE public.post_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for platforms
CREATE POLICY "Allow all operations on platforms" 
ON public.platforms 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create policies for post_statuses
CREATE POLICY "Allow all operations on post_statuses" 
ON public.post_statuses 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on platforms
CREATE TRIGGER update_platforms_updated_at
BEFORE UPDATE ON public.platforms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on post_statuses
CREATE TRIGGER update_post_statuses_updated_at
BEFORE UPDATE ON public.post_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platforms
INSERT INTO public.platforms (name, icon_name, color) VALUES
('facebook', 'Facebook', '#1877F2'),
('instagram', 'Instagram', '#E4405F'),
('twitter', 'Twitter', '#1DA1F2'),
('linkedin', 'Linkedin', '#0077B5');

-- Insert default statuses
INSERT INTO public.post_statuses (name, color) VALUES
('draft', '#6B7280'),
('scheduled', '#F59E0B'),
('published', '#10B981');