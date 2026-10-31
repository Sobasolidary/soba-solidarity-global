document.addEventListener("DOMContentLoaded", async () => {

  const tableBody = document.getElementById("membersTableBody");
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

    /*
      We have not yet created membership/payment
      status fields in Supabase.

      Therefore all registered members are temporarily
      counted as pending.
    */

    activeMembers.textContent = "0";
    pendingMembers.textContent = members.length;
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
          <span class="status status-pending">
            Pending
          </span>
        </td>

        <td>${escapeHtml(registrationDate)}</td>
      `;

      tableBody.appendChild(row);
    });
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

});
