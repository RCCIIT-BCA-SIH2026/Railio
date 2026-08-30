/// <reference path="../deno.d.ts" />
// RailSathi Edge Function: admin-user-management
// Handles administrative operations, role modifications & audit logging

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminActionRequest {
  action: "UPDATE_ROLE" | "SUSPEND_USER" | "ACTIVATE_USER" | "MANUAL_PHONE_VERIFY";
  targetUserId: string;
  newRole?: "user" | "admin" | "super_admin";
  reason?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate caller
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify caller has admin/super_admin role in profiles
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (callerProfileError || !callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: Administrative privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AdminActionRequest = await req.json();
    const { action, targetUserId, newRole, reason } = body;

    if (!targetUserId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Target user ID and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, any> = {};

    if (action === "UPDATE_ROLE") {
      if (!newRole || !["user", "admin", "super_admin"].includes(newRole)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid role specified" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (newRole === "super_admin" && callerProfile.role !== "super_admin") {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden: Only super_admin can create super_admins" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      updateData.role = newRole;
    } else if (action === "SUSPEND_USER") {
      updateData.is_active = false;
    } else if (action === "ACTIVATE_USER") {
      updateData.is_active = true;
    } else if (action === "MANUAL_PHONE_VERIFY") {
      updateData.phone_verified = true;
    }

    // 3. Execute update
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", targetUserId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Log into admin_audit_logs
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_user_id: callerProfile.id,
      action: action,
      target_user_id: targetUserId,
      metadata: {
        newRole,
        reason: reason || "Administrative action executed",
        executed_by: user.email,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        user: updatedUser,
        message: `Admin action ${action} completed successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
