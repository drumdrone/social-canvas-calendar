-- Create product_lines table
CREATE TABLE public.product_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;

-- Create policy for product lines (allow all operations for now)
CREATE POLICY "Allow all operations on product_lines" 
ON public.product_lines 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_lines_updated_at
BEFORE UPDATE ON public.product_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();