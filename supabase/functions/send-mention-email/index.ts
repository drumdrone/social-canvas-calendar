import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MentionEmailRequest {
  mentionedAuthorEmail: string;
  mentionedAuthorName: string;
  postTitle: string;
  commentText: string;
  commenterName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please set up RESEND_API_KEY.",
          success: false
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        }
      );
    }

    const resend = new Resend(resendApiKey);

    const {
      mentionedAuthorEmail,
      mentionedAuthorName,
      postTitle,
      commentText,
      commenterName
    }: MentionEmailRequest = await req.json();

    console.log("=== MENTION EMAIL DEBUG ===");
    console.log("Request data:", {
      mentionedAuthorEmail,
      mentionedAuthorName,
      postTitle,
      commentText,
      commenterName
    });

    if (!mentionedAuthorEmail || !mentionedAuthorName || !postTitle || !commentText || !commenterName) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          success: false
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        }
      );
    }

    const emailData = {
      from: "Social Media Manager <onboarding@resend.dev>",
      to: [mentionedAuthorEmail],
      subject: `You were mentioned in "${postTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hi ${mentionedAuthorName}!</h1>
          <p style="font-size: 16px; line-height: 1.5;">
            You were mentioned by <strong>${commenterName}</strong> in a comment on the post "<strong>${postTitle}</strong>":
          </p>
          <blockquote style="border-left: 3px solid #3B82F6; padding-left: 16px; margin: 24px 0; font-style: italic; color: #555;">
            ${commentText}
          </blockquote>
          <p style="font-size: 14px; color: #666;">
            Please check the post to see the full context and respond if needed.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 14px; color: #999;">
            Best regards,<br>
            Your Social Media Team
          </p>
        </div>
      `,
    };

    console.log("Sending email to:", mentionedAuthorEmail);

    const emailResponse = await resend.emails.send(emailData);

    console.log("Resend API response:", emailResponse);
    console.log("=== END MENTION EMAIL DEBUG ===");

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);

      let errorMessage = emailResponse.error.message || "Failed to send email";

      // Check if it's a domain verification issue
      if (errorMessage.includes("verify a domain") || errorMessage.includes("testing emails")) {
        errorMessage = "Email service is in test mode. To send emails to team members, please verify a domain at resend.com/domains and update the 'from' address in the edge function.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          success: false,
          resendError: emailResponse.error
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
        message: `Email sent successfully to ${mentionedAuthorEmail}`
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-mention-email function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        success: false
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        },
      }
    );
  }
});
