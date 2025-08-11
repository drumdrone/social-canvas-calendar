-- Create formats table
CREATE TABLE public.formats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.formats ENABLE ROW LEVEL SECURITY;

-- Create policy for formats
CREATE POLICY "Allow all operations on formats" 
ON public.formats 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_formats_updated_at
BEFORE UPDATE ON public.formats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();