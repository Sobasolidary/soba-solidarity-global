
import { supabase } from "./member-common.js";

const loading = document.getElementById("loading");
const dashboard = document.getElementById("dashboard");
const errorMessage = document.getElementById("error-message");

const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR"
});

// Display dashboard errors
function showError(message) {
  loading.hidden = true;
  dashboard.classList.add("hidden");
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

// Update dashboard text
function setText(id, value) {
  document.getElementById(id).textContent = value;
}

// Safely create table rows
function addRow(tbody, values) {
  const tr = document.createElement("tr");

  for (const value of values) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

// Display bereavement claims
function displayClaims(claims) {
  const tbody = document.getElementById("claims-body");

  tbody.replaceChildren();

  setText("claim-count", claims.length);

  if (claims.length === 0) {
    addRow(tbody, [
      "No claims recorded",
      "",
      "",
      ""
    ]);
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

// Display solidarity contributions
function displayContributions(contributions) {
  const tbody = document.getElementById(
    "contributions-body"
  );

  tbody.replaceChildren();

  setText("contribution-count", contributions.length);

  let totalDue = 0;
  let totalPaid = 0;

  if (contributions.length === 0) {
    addRow(tbody, [
      "No contributions recorded",
      "",
      "",
      "",
      ""
    ]);
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

// Load eligible SOBA members
async function loadEligibleMembers() {

  const memberSelect =
    document.getElementById("claim-member");

  const { data: members, error } =
    await supabase.rpc(
      "get_bereavement_eligible_members"
    );

  if (error) {
    throw error;
  }

  memberSelect.replaceChildren();

  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "Select registered SOBA member";

  memberSelect.appendChild(placeholder);

  for (const member of members || []) {

    const option = document.createElement("option");

    option.value = String(member.member_id);

    option.textContent =
      `${member.membership_number} — ${member.full_name}`;

    memberSelect.appendChild(option);
  }
}

// Initialize the Solidarity Dashboard
async function initializeDashboard() {

  try {

    // 1. Verify authenticated user
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

    // 4. Retrieve solidarity contributions
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

    // 5. Display dashboard information
    displayClaims(claims || []);
    displayContributions(contributions || []);

    // 6. Populate the eligible member dropdown
    await loadEligibleMembers();

    // 7. Display the dashboard
    loading.hidden = true;
    dashboard.classList.remove("hidden");

  } catch (error) {

    console.error(
      "Solidarity dashboard error:",
      error
    );

    showError(
      "Unable to load the solidarity dashboard. " +
      "Please verify administrator access and database permissions."
    );
  }
}

initializeDashboard();
