/*
  # Create Function to Generate Instances from Templates
  
  1. New Function
    - `generate_instances_from_template(p_template_id uuid)`
    - Generates recurring_actions instances from an action template
    - Creates instances for next 12 months based on frequency
    - Removes old instances linked to this template before creating new ones
  
  2. Logic
    - For monthly: creates 12 instances (one per month)
    - For weekly: creates instances for weeks in each month
    - For quarterly: creates 4 instances (one per quarter)
    - For yearly: creates 1 instance
    - Each instance gets assigned to appropriate month/week
*/

CREATE OR REPLACE FUNCTION generate_instances_from_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template record;
  v_month_num integer;
  v_week_num integer;
  v_instance_count integer;
  v_current_year integer;
BEGIN
  SELECT * INTO v_template
  FROM action_templates
  WHERE id = p_template_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  DELETE FROM recurring_actions
  WHERE template_id = p_template_id AND user_id = auth.uid();
  
  IF v_template.frequency = 'monthly' THEN
    FOR v_month_num IN 1..12 LOOP
      FOR v_instance_count IN 1..v_template.times_per_period LOOP
        INSERT INTO recurring_actions (
          user_id,
          template_id,
          title,
          subtitle,
          description,
          month,
          week,
          is_custom,
          status
        ) VALUES (
          auth.uid(),
          p_template_id,
          v_template.title,
          v_template.subtitle,
          v_template.description,
          v_month_num,
          NULL,
          false,
          v_template.status
        );
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'weekly' THEN
    FOR v_month_num IN 1..12 LOOP
      FOR v_week_num IN 1..4 LOOP
        FOR v_instance_count IN 1..v_template.times_per_period LOOP
          INSERT INTO recurring_actions (
            user_id,
            template_id,
            title,
            subtitle,
            description,
            month,
            week,
            is_custom,
            status
          ) VALUES (
            auth.uid(),
            p_template_id,
            v_template.title,
            v_template.subtitle,
            v_template.description,
            v_month_num,
            v_week_num,
            false,
            v_template.status
          );
        END LOOP;
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'quarterly' THEN
    FOR v_month_num IN 1..4 LOOP
      FOR v_instance_count IN 1..v_template.times_per_period LOOP
        INSERT INTO recurring_actions (
          user_id,
          template_id,
          title,
          subtitle,
          description,
          month,
          week,
          is_custom,
          status
        ) VALUES (
          auth.uid(),
          p_template_id,
          v_template.title,
          v_template.subtitle,
          v_template.description,
          (v_month_num - 1) * 3 + 1,
          NULL,
          false,
          v_template.status
        );
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'yearly' THEN
    FOR v_instance_count IN 1..v_template.times_per_period LOOP
      INSERT INTO recurring_actions (
        user_id,
        template_id,
        title,
        subtitle,
        description,
        month,
        week,
        is_custom,
        status
      ) VALUES (
        auth.uid(),
        p_template_id,
        v_template.title,
        v_template.subtitle,
        v_template.description,
        1,
        NULL,
        false,
        v_template.status
      );
    END LOOP;
  END IF;
END;
$$;
