document.addEventListener("DOMContentLoaded", async () => {
  // -----------------------------------------
  // ADMIN AUTHENTICATION CHECK
  // -----------------------------------------

  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "admin-login.html";
    return;
  }

  const user = session.user;

  // Confirm that the logged-in user is an authorized administrator
  const { data: adminRecord, error: adminError } =
    await supabaseClient
      .from("admin_users")
      .select("user_id, email")
      .eq("user_id", user.id)
      .maybeSingle();

  if (adminError || !adminRecord) {
    console.error("Administrator authorization failed:", adminError);

    await supabaseClient.auth.signOut();

    window.location.href = "admin-login.html";
    return;
  }

  console.log("Administrator authenticated:", adminRecord.email);
  const tableBody = document.getElementById("membersTableBody");  // -----------------------------------------
  // LOGOUT
  // -----------------------------------------

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {

      logoutButton.disabled = true;
      logoutButton.textContent = "Signing out...";

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error("Logout failed:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "Logout";
        return;
      }

      window.location.href = "admin-login.html";
    });
  }
  const totalMembers = document.getElementById("totalMembers");
  const activeMembers = document.getElementById("activeMembers");
  const pendingMembers = document.getElementById("pendingMembers");
  const searchInput = document.getElementById("memberSearch");

  let members = [];

  async function loadMembers() {

    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="loading-message">
          Loading members...
        </td>
      </tr>
    `;

    const { data, error } = await supabaseClient
      .from("members")
      .select(`
        id,
        membership_number,
        sasse_alumni_id,
        class_year,
        matriculation_number,
        full_name,
        date_of_birth,
        email,
        phone,
        address,
        city,
        country,
        status,
        created_at,
        next_of_kin (
          full_name,
          relationship,
          phone,
          email,
          address,
          country,
          is_primary
        )
      `)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error loading members:", error);

      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="loading-message">
            Unable to load members.
          </td>
        </tr>
      `;

      return;
    }

    members = data || [];

    updateDashboard();
    displayMembers(members);
  }

function updateDashboard() {
  totalMembers.textContent = members.length;

  const activeCount = members.filter(
    member => member.status === "active"
  ).length;

  const pendingCount = members.filter(
    member => member.status === "pending"
  ).length;

  activeMembers.textContent = activeCount;
  pendingMembers.textContent = pendingCount;
}

  function displayMembers(memberList) {

    tableBody.innerHTML = "";

    if (!memberList.length) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="loading-message">
            No members found.
          </td>
        </tr>
      `;

      return;
    }

    memberList.forEach(member => {

      const nok =
        member.next_of_kin &&
        member.next_of_kin.length > 0
          ? member.next_of_kin[0]
          : null;

      const registrationDate = member.created_at
        ? new Date(member.created_at).toLocaleDateString()
        : "";

      const row = document.createElement("tr");

      row.innerHTML = `
        <td><strong>${escapeHtml(member.membership_number || "")}</strong></td>

        <td>${escapeHtml(member.full_name || "")}</td>

        <td>${escapeHtml(member.class_year || "")}</td>

        <td>${escapeHtml(member.matriculation_number || "")}</td>

        <td>${escapeHtml(member.email || "")}</td>

        <td>${escapeHtml(member.phone || "")}</td>

        <td>${escapeHtml(nok ? nok.full_name : "")}</td>

        <td>${escapeHtml(nok ? nok.relationship : "")}</td>

      <td>
    <span class="status status-${escapeHtml(member.status || "pending")}">
        ${escapeHtml(
            member.status === "active"
                ? "Active"
                : member.status === "rejected"
                ? "Rejected"
                : "Pending"
        )}
    </span>
</td>

<td>
    ${
        !member.status || member.status === "pending"
            ? `
                <button
                    class="approve-btn"
                    data-member-id="${member.id}">
                    Approve
                </button>

                <button
                    class="reject-btn"
                    data-member-id="${member.id}">
                    Reject
                </button>
              `
            : member.status === "active"
            ? `<span>Approved</span>`
            : `<span>Rejected</span>`
    }
</td>

<td>${escapeHtml(registrationDate)}</td>
`;
async function updateMemberStatus(memberId, newStatus) {

    const action =
        newStatus === "active"
            ? "approve"
            : "reject";

const confirmed = confirm(
  "Are you sure you want to " + action + " this member?"
);

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("members")
        .update({
            status: newStatus
        })
        .eq("id", memberId);

    if (error) {
        console.error("Error updating member:", error);
        alert("Unable to update member status.");
        return;
    }

    await loadMembers();

    alert(
        newStatus === "active"
            ? "Member approved successfully."
            : "Member rejected."
    );
}


  function searchMembers() {

    const searchTerm =
      searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
      displayMembers(members);
      return;
    }

    const filtered = members.filter(member => {

      return (
        String(member.membership_number || "")
          .toLowerCase()
          .includes(searchTerm) ||

        String(member.full_name || "")
          .toLowerCase()
          .includes(searchTerm) ||

        String(member.class_year || "")
          .toLowerCase()
          .includes(searchTerm) ||

        String(member.matriculation_number || "")
          .toLowerCase()
          .includes(searchTerm) ||

        String(member.email || "")
          .toLowerCase()
          .includes(searchTerm) ||

        String(member.phone || "")
          .toLowerCase()
          .includes(searchTerm)
      );

    });

    displayMembers(filtered);
  }


  function escapeHtml(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  if (searchInput) {
    searchInput.addEventListener("input", searchMembers);
  }


  await loadMembers();

tableBody.addEventListener("click", async (event) => {

    const approveButton = event.target.closest(".approve-btn");
    const rejectButton = event.target.closest(".reject-btn");

    if (approveButton) {
        await updateMemberStatus(
            approveButton.dataset.memberId,
            "active"
        );
    }

    if (rejectButton) {
        await updateMemberStatus(
            rejectButton.dataset.memberId,
            "rejected"
        );
    }
});
});
