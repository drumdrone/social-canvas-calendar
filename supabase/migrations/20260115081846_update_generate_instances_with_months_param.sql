/*
  # Update Generate Instances Function with Months Parameter
  
  1. Changes
    - Update generate_instances_from_template to accept months_count parameter
    - Support generating instances for 3, 6, or 12 months
    - Keep compatibility with existing structure
*/

CREATE OR REPLACE FUNCTION generate_instances_from_template(
  p_template_id uuid,
  p_months_count integer DEFAULT 12
)
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
  v_current_month integer;
  v_target_month integer;
  v_target_year integer;
  v_month_names text[] := ARRAY['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                                  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
  v_month_string text;
  v_months_generated integer;
BEGIN
  SELECT * INTO v_template
  FROM action_templates
  WHERE id = p_template_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or access denied';
  END IF;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  DELETE FROM recurring_actions
  WHERE template_id = p_template_id AND user_id = auth.uid();
  
  v_months_generated := 0;
  
  IF v_template.frequency = 'monthly' THEN
    WHILE v_months_generated < p_months_count LOOP
      v_target_month := ((v_current_month - 1 + v_months_generated) % 12) + 1;
      v_target_year := v_current_year + ((v_current_month - 1 + v_months_generated) / 12);
      v_month_string := v_month_names[v_target_month] || ' ' || v_target_year::text;
      
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
      
      v_months_generated := v_months_generated + 1;
    END LOOP;
    
  ELSIF v_template.frequency = 'weekly' THEN
    WHILE v_months_generated < p_months_count LOOP
      v_target_month := ((v_current_month - 1 + v_months_generated) % 12) + 1;
      v_target_year := v_current_year + ((v_current_month - 1 + v_months_generated) / 12);
      v_month_string := v_month_names[v_target_month] || ' ' || v_target_year::text;
      
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
      
      v_months_generated := v_months_generated + 1;
    END LOOP;
    
  ELSIF v_template.frequency = 'quarterly' THEN
    FOR v_month_num IN 1..LEAST(4, CEIL(p_months_count / 3.0)::integer) LOOP
      v_target_month := ((v_current_month - 1 + (v_month_num - 1) * 3) % 12) + 1;
      v_target_year := v_current_year + ((v_current_month - 1 + (v_month_num - 1) * 3) / 12);
      v_month_string := v_month_names[v_target_month] || ' ' || v_target_year::text;
      
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
    v_month_string := v_month_names[v_current_month] || ' ' || v_current_year::text;
    
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