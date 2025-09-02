import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MentionEmailRequest {
  mentionedAuthorEmail: string;
  mentionedAuthorName: string;
  postTitle: string;
  commentText: string;
  commenterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mentionedAuthorEmail, 
      mentionedAuthorName, 
      postTitle, 
      commentText, 
      commenterName 
    }: MentionEmailRequest = await req.json();

    console.log("Sending mention email to:", mentionedAuthorEmail);

    const emailResponse = await resend.emails.send({
      from: "Social Media Manager <onboarding@resend.dev>",
      to: [mentionedAuthorEmail],
      subject: `You were mentioned in "${postTitle}"`,
      html: `
        <h1>Hi ${mentionedAuthorName}!</h1>
        <p>You were mentioned by <strong>${commenterName}</strong> in a comment on the post "<strong>${postTitle}</strong>":</p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 16px; margin: 16px 0; font-style: italic;">
          ${commentText}
        </blockquote>
        <p>Please check the post to see the full context and respond if needed.</p>
        <p>Best regards,<br>Your Social Media Team</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-mention-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);