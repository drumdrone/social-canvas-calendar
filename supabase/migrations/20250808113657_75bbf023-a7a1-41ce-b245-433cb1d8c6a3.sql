-- Create table for plan sections
CREATE TABLE public.plan_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  section_data JSONB NOT NULL DEFAULT '{}',
  section_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.plan_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for plan sections
CREATE POLICY "Users can view their own plan sections" 
ON public.plan_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own plan sections" 
ON public.plan_sections 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own plan sections" 
ON public.plan_sections 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own plan sections" 
ON public.plan_sections 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_plan_sections_updated_at
BEFORE UPDATE ON public.plan_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_plan_sections_user_order ON public.plan_sections(user_id, section_order);