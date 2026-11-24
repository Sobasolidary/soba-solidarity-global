
import { supabase } from "./member-common.js";

const loading = document.getElementById("loading");
const dashboard = document.getElementById("dashboard");
const errorMessage = document.getElementById("error-message");

const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR"
});

function showError(message) {
  loading.hidden = true;
  dashboard.classList.add("hidden");
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function addRow(tbody, values) {
  const tr = document.createElement("tr");

  for (const value of values) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

function displayClaims(claims) {
  const tbody = document.getElementById("claims-body");
  tbody.replaceChildren();

  setText("claim-count", claims.length);

  if (claims.length === 0) {
    addRow(tbody, ["No claims recorded", "", "", ""]);
    return;
  }

  for (const claim of claims) {
    addRow(tbody, [
      claim.claim_reference || `Claim #${claim.id}`,
      claim.member_id,
      euro.format(Number(claim.benefit_amount)),
      claim.claim_status
    ]);
  }
}

function displayContributions(contributions) {
  const tbody = document.getElementById(
    "contributions-body"
  );

  tbody.replaceChildren();

  setText("contribution-count", contributions.length);

  let totalDue = 0;
  let totalPaid = 0;

  if (contributions.length === 0) {
    addRow(tbody, ["No contributions recorded", "", "", "", ""]);
  }

  for (const contribution of contributions) {
    const due = Number(contribution.amount_due);
    const paid = Number(contribution.amount_paid);

    totalDue += due;
    totalPaid += paid;

    addRow(tbody, [
      contribution.claim_id,
      contribution.member_id,
      euro.format(due),
      euro.format(paid),
      contribution.payment_status
    ]);
  }

  setText("total-due", euro.format(totalDue));
  setText("total-paid", euro.format(totalPaid));
}

-- SOBA Solidarity Global Group
-- Step 7D.1: Eligible Members for Bereavement Claims

BEGIN;

CREATE OR REPLACE FUNCTION
public.get_bereavement_eligible_members()

RETURNS TABLE (
    member_id BIGINT,
    membership_number TEXT,
    full_name TEXT
)

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''

AS $$
BEGIN

    -- Verify administrator authorization
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.admin_users a
        WHERE a.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION
            'Administrator access required';
    END IF;

    -- Retrieve active and verified members
    RETURN QUERY

    SELECT
        m.id::BIGINT,
        m.membership_number::TEXT,
        m.full_name::TEXT

    FROM public.members m

    WHERE m.status = 'active'
      AND m.membership_status = 'active'
      AND m.verification_status = 'verified'
      AND m.payment_status = 'paid'
      AND m.activated_at IS NOT NULL

      AND NOT EXISTS (
          SELECT 1
          FROM public.bereavement_claims b
          WHERE b.member_id = m.id
            AND b.claim_status <> 'rejected'
      )

    ORDER BY m.full_name;

END;
$$;

-- Restrict function execution
REVOKE ALL ON FUNCTION
public.get_bereavement_eligible_members()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
public.get_bereavement_eligible_members()
TO authenticated;

COMMIT;

async function initializeDashboard() {
  try {
    // 1. Verify the current authenticated user
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData?.user) {
      showError(
        "Please sign in with your authorized administrator account."
      );
      return;
    }

    const user = userData.user;

    // 2. Verify administrator authorization
    const { data: admin, error: adminError } =
      await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError) {
      throw adminError;
    }

    if (!admin) {
      showError(
        "Access denied. This page is restricted to SOBA administrators."
      );
      return;
    }

    // 3. Retrieve bereavement claims
    const { data: claims, error: claimsError } =
      await supabase
        .from("bereavement_claims")
        .select(
          "id,claim_reference,member_id,benefit_amount,claim_status"
        )
        .order("created_at", { ascending: false })
        .limit(1000);

    if (claimsError) {
      throw claimsError;
    }

    // 4. Retrieve contribution records
    const {
      data: contributions,
      error: contributionsError
    } = await supabase
      .from("solidarity_contributions")
      .select(
        "id,claim_id,member_id,amount_due,amount_paid,payment_status"
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (contributionsError) {
      throw contributionsError;
    }

    // 5. Display the authorized information
    
    displayClaims(claims || []);
    displayContributions(contributions || []);

    // Load eligible SOBA members
   await loadEligibleMembers();

   loading.hidden = true;
   dashboard.classList.remove("hidden");


  } catch (error) {
    console.error("Solidarity dashboard error:", error);

    showError(
      "Unable to load the solidarity dashboard. " +
      "Please verify administrator access and database permissions."
    );
  }
}

initializeDashboard();
