import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { calculateRiskScore } from "@/lib/riskScore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { site_id, report_type, country, order_value_band, description, contact_email, has_evidence } = body;

    if (!site_id || !report_type || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert user report
    const { data: report, error: reportError } = await supabase
      .from("user_reports")
      .insert({
        site_id,
        report_type,
        country,
        order_value_band,
        description,
        contact_email: contact_email || null,
        has_evidence,
        status: "new",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error inserting report:", reportError);
      return NextResponse.json(
        { error: "Failed to submit report" },
        { status: 500 }
      );
    }

    // Determine severity based on report type
    let severity = 3;
    if (report_type === "non_delivery" || report_type === "fraud") {
      severity = 10;
    } else if (report_type === "refund_refused") {
      severity = 7;
    } else if (report_type === "poor_quality") {
      severity = 4;
    }

    // Insert risk signal
    const { error: signalError } = await supabase
      .from("risk_signals")
      .insert({
        site_id,
        type: `user_report_${report_type}`,
        dimension: "reputation",
        severity,
        source: "user",
        description: `User report: ${report_type}`,
      });

    if (signalError) {
      console.error("Error inserting signal:", signalError);
      // Continue anyway - the report was saved
    }

    // Fetch all signals for the site
    const { data: signals, error: signalsError } = await supabase
      .from("risk_signals")
      .select("*")
      .eq("site_id", site_id);

    if (signalsError) {
      console.error("Error fetching signals:", signalsError);
      return NextResponse.json(
        { error: "Report submitted but failed to update risk score" },
        { status: 500 }
      );
    }

    // Calculate new risk score
    const { score, level } = calculateRiskScore(signals || []);

    // Get current site data
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("total_reports, total_signals")
      .eq("id", site_id)
      .single();

    if (siteError) {
      console.error("Error fetching site:", siteError);
      return NextResponse.json(
        { error: "Report submitted but failed to update risk score" },
        { status: 500 }
      );
    }

    // Update site with new risk score and counts
    const { error: updateError } = await supabase
      .from("sites")
      .update({
        risk_score: score,
        risk_level: level,
        total_signals: (signals?.length || 0),
        total_reports: (site?.total_reports || 0) + 1,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", site_id);

    if (updateError) {
      console.error("Error updating site:", updateError);
      return NextResponse.json(
        { error: "Report submitted but failed to update risk score" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error in POST /api/reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

