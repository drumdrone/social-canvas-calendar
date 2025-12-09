/*
  # Update Function to Generate Instances with Proper Month Format
  
  1. Changes
    - Update generate_instances_from_template to use text month format (e.g., "Leden 2024")
    - Support current year as default
    - Keep compatibility with existing recurring_actions structure
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
  v_month_names text[] := ARRAY['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                                  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
  v_month_string text;
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
      v_month_string := v_month_names[v_month_num] || ' ' || v_current_year::text;
      
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
          status,
          action_type,
          data
        ) VALUES (
          auth.uid(),
          p_template_id,
          v_template.title,
          v_template.subtitle,
          v_template.description,
          v_month_string,
          NULL,
          false,
          v_template.status,
          'monthly',
          '{}'::jsonb
        );
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'weekly' THEN
    FOR v_month_num IN 1..12 LOOP
      v_month_string := v_month_names[v_month_num] || ' ' || v_current_year::text;
      
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
            status,
            action_type,
            data
          ) VALUES (
            auth.uid(),
            p_template_id,
            v_template.title,
            v_template.subtitle,
            v_template.description,
            v_month_string,
            v_week_num,
            false,
            v_template.status,
            'weekly',
            '{}'::jsonb
          );
        END LOOP;
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'quarterly' THEN
    FOR v_month_num IN 1..4 LOOP
      v_month_string := v_month_names[(v_month_num - 1) * 3 + 1] || ' ' || v_current_year::text;
      
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
          status,
          action_type,
          data
        ) VALUES (
          auth.uid(),
          p_template_id,
          v_template.title,
          v_template.subtitle,
          v_template.description,
          v_month_string,
          NULL,
          false,
          v_template.status,
          'quarterly',
          '{}'::jsonb
        );
      END LOOP;
    END LOOP;
    
  ELSIF v_template.frequency = 'yearly' THEN
    v_month_string := v_month_names[1] || ' ' || v_current_year::text;
    
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
        status,
        action_type,
        data
      ) VALUES (
        auth.uid(),
        p_template_id,
        v_template.title,
        v_template.subtitle,
        v_template.description,
        v_month_string,
        NULL,
        false,
        v_template.status,
        'monthly',
        '{}'::jsonb
      );
    END LOOP;
  END IF;
END;
$$;
