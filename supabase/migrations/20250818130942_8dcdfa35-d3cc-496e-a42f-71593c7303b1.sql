-- Create new mood board items table
CREATE TABLE public.mood_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  napad TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  popis TEXT NOT NULL DEFAULT '',
  image_prompt TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mood_board_items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own mood board items" 
ON public.mood_board_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood board items" 
ON public.mood_board_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood board items" 
ON public.mood_board_items 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood board items" 
ON public.mood_board_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mood_board_items_updated_at
BEFORE UPDATE ON public.mood_board_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();