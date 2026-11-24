
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

/* Bereavement Claim Registration */

// Keep live registration disabled during testing
const CLAIM_REGISTRATION_ENABLED = false;

function initializeClaimForm() {

  const form = document.getElementById("claim-form");

  const button = document.getElementById(
    "register-claim-button"
  );

  const message = document.getElementById(
    "claim-message"
  );

  const memberSelect = document.getElementById(
    "claim-member"
  );

  button.disabled = !CLAIM_REGISTRATION_ENABLED;

  function showClaimMessage(text, isError = false) {

    message.textContent = text;

    message.style.background = isError
      ? "#fde8e8"
      : "#d9f5e5";

    message.style.color = isError
      ? "#a32121"
      : "#137333";

    message.hidden = false;
  }

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!CLAIM_REGISTRATION_ENABLED) {
      showClaimMessage(
        "Live claim registration is not yet enabled.",
        true
      );
      return;
    }

    const memberId = memberSelect.value;

    const dateOfDeath = document.getElementById(
      "date-of-death"
    ).value;

    const notes = document.getElementById(
      "claim-notes"
    ).value.trim();

    if (!memberId || !dateOfDeath) {

      showClaimMessage(
        "Please select a member and enter the date of death.",
        true
      );

      return;
    }

    const memberName =
      memberSelect.options[
        memberSelect.selectedIndex
      ].textContent;

    const confirmed = window.confirm(
      "Confirm bereavement claim registration for:\n\n" +
      memberName +
      "\n\nDate of death: " + dateOfDeath +
      "\nTarget benefit: €15,000.00" +
      "\n\nThis registers a claim for review only." +
      "\nNo contributions will be activated."
    );

    if (!confirmed) {
      return;
    }

    button.disabled = true;
    button.textContent = "Registering...";

    try {

      const { data, error } = await supabase.rpc(
        "register_bereavement_claim",
        {
          p_member_id: memberId,
          p_date_of_death: dateOfDeath,
          p_admin_notes: notes || null
        }
      );

      if (error) {
        throw error;
      }

      form.reset();

      showClaimMessage(
        "Claim registered successfully. Reference: " +
        data
      );

      // Refresh dashboard after successful registration
      try {
        await initializeDashboard();
      } catch (refreshError) {
        console.error(refreshError);
      }

    } catch (error) {

      console.error(
        "Claim registration error:",
        error
      );

      showClaimMessage(
        error.message || "Unable to register claim.",
        true
      );

    } finally {

      button.disabled = !CLAIM_REGISTRATION_ENABLED;
      button.textContent = "Register Claim";

    }

  });
}


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


initializeClaimForm();
initializeDashboard();

