import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { calculateRiskScore } from "@/lib/riskScore";

export async function GET(request: NextRequest) {
  try {
    // Fetch reports with status 'new' or 'confirmed'
    const { data: reports, error } = await supabase
      .from("user_reports")
      .select(
        "id, site_id, report_type, description, country, order_value_band, status, created_at"
      )
      .in("status", ["new", "confirmed"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    // Fetch site domains for each report
    const siteIds = [...new Set(reports?.map((r) => r.site_id) || [])];
    const { data: sites } = await supabase
      .from("sites")
      .select("id, domain")
      .in("id", siteIds);

    const siteMap = new Map(sites?.map((s) => [s.id, s]) || []);

    const reportsWithSites = reports?.map((report) => ({
      ...report,
      site: siteMap.get(report.site_id),
    }));

    return NextResponse.json(reportsWithSites || []);
  } catch (error) {
    console.error("Error in GET /api/admin/reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { report_id, status } = await request.json();

    if (!report_id || !status) {
      return NextResponse.json(
        { error: "Missing report_id or status" },
        { status: 400 }
      );
    }

    // Update report status
    const { data: report, error: updateError } = await supabase
      .from("user_reports")
      .update({ status })
      .eq("id", report_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating report:", updateError);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 500 }
      );
    }

    // If status is 'confirmed', add an admin risk signal
    if (status === "confirmed" && report) {
      const { error: signalError } = await supabase
        .from("risk_signals")
        .insert({
          site_id: report.site_id,
          type: "admin_confirmed_report",
          dimension: "reputation",
          severity: 5,
          source: "admin",
          description: "Admin confirmed user report",
        });

      if (signalError) {
        console.error("Error inserting signal:", signalError);
        // Continue anyway
      }

      // Recalculate risk score
      const { data: signals, error: signalsError } = await supabase
        .from("risk_signals")
        .select("*")
        .eq("site_id", report.site_id);

      if (!signalsError && signals) {
        const { score, level } = calculateRiskScore(signals);

        const { data: site } = await supabase
          .from("sites")
          .select("total_signals")
          .eq("id", report.site_id)
          .single();

        await supabase
          .from("sites")
          .update({
            risk_score: score,
            risk_level: level,
            total_signals: signals.length,
            updated_at: new Date().toISOString(),
          })
          .eq("id", report.site_id);
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error in PATCH /api/admin/reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

