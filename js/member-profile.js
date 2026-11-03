let currentMember = null;
let currentNextOfKin = null;

document.addEventListener("DOMContentLoaded", async () => {

    const profileMessage = document.getElementById("profileMessage");
    const profileContent = document.getElementById("profileContent");

    function showError(message) {
        profileMessage.textContent = message;
        profileMessage.style.display = "block";
        profileContent.style.display = "none";
    }

    function displayValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value !== null &&
                value !== undefined &&
                value !== ""
                    ? value
                    : "—";
        }
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-GB");
    }

    try {

        // ----------------------------------------------------
        // 1. Check administrator authentication
        // ----------------------------------------------------

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!session) {
            window.location.href = "admin-login.html";
            return;
        }

        const userId = session.user.id;

        // ----------------------------------------------------
        // 2. Confirm logged-in user is an administrator
        // ----------------------------------------------------

        const {
            data: adminRecord,
            error: adminError
        } = await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (adminError) {
            throw adminError;
        }

        if (!adminRecord) {
            await supabaseClient.auth.signOut();
            window.location.href = "admin-login.html";
            return;
        }

        // ----------------------------------------------------
        // 3. Get member ID from URL
        // Example:
        // member-profile.html?id=5
        // ----------------------------------------------------

        const params = new URLSearchParams(window.location.search);
        const memberId = Number(params.get("id"));

        if (!Number.isInteger(memberId) || memberId <= 0) {
            showError("No valid member was selected.");
            return;
        }

        // ----------------------------------------------------
        // 4. Load member
        // ----------------------------------------------------

        const {
            data: member,
            error: memberError
        } = await supabaseClient
            .from("members")
            .select("*")
            .eq("id", memberId)
            .single();

        if (memberError) {
            console.error("Member error:", memberError);
            showError("Unable to load this member.");
            return;
        }

        // ----------------------------------------------------
        // 5. Load next of kin
        // ----------------------------------------------------

        const {
            data: nextOfKin,
            error: nokError
        } = await supabaseClient
            .from("next_of_kin")
            .select("*")
            .eq("member_id", memberId)
            .maybeSingle();

        if (nokError) {
            console.error("Next of kin error:", nokError);
        }

        // Store loaded data for the Edit Member form
        currentMember = member;
        currentNextOfKin = nextOfKin;

        // ----------------------------------------------------
        // 6. Membership information
        // ----------------------------------------------------

        displayValue(
            "membershipNumber",
            member.membership_number
        );

        displayValue(
            "registrationDate",
            formatDate(member.created_at)
        );

        // ----------------------------------------------------
        // 7. Status badge
        // ----------------------------------------------------

        const statusElement =
            document.getElementById("memberStatus");

        const status =
            (member.status || "pending").toLowerCase();

        statusElement.textContent =
            status.charAt(0).toUpperCase() +
            status.slice(1);

        statusElement.className =
            "status-badge status-" + status;

        // ----------------------------------------------------
        // 8. Personal information
        // ----------------------------------------------------

        displayValue(
            "fullName",
            member.full_name
        );

        displayValue(
            "dateOfBirth",
            formatDate(member.date_of_birth)
        );

        displayValue(
            "email",
            member.email
        );

        displayValue(
            "phone",
            member.phone
        );

        displayValue(
            "address",
            member.address
        );

        // ----------------------------------------------------
        // 9. Sasse information
        // ----------------------------------------------------

        displayValue(
            "classYear",
            member.class_year
        );

        displayValue(
            "matriculationNumber",
            member.matriculation_number
        );

        // ----------------------------------------------------
        // 10. Next of kin information
        // ----------------------------------------------------

        if (nextOfKin) {

            displayValue(
                "nokFullName",
                nextOfKin.full_name
            );

            displayValue(
                "nokRelationship",
                nextOfKin.relationship
            );

            displayValue(
                "nokPhone",
                nextOfKin.phone
            );

            displayValue(
                "nokEmail",
                nextOfKin.email
            );

            displayValue(
                "nokAddress",
                nextOfKin.address
            );

        }

        // ----------------------------------------------------
        // 11. Show completed profile
        // ----------------------------------------------------

        profileMessage.style.display = "none";
        profileContent.style.display = "block";

    } catch (error) {

        console.error("Member profile error:", error);

        showError(
            "An error occurred while loading the member profile."
        );
    }
    
// ------------------------------------------
// 11. Edit member form
// ------------------------------------------

const editMemberButton = document.getElementById("editMemberButton");
const editMemberForm = document.getElementById("editMemberForm");
const cancelEditButton = document.getElementById("cancelEditButton");

editMemberButton.addEventListener("click", () => {

    if (!currentMember) {
        alert("Member information has not finished loading.");
        return;
    }

    // Load current member information into edit form
    document.getElementById("editFullName").value =
        currentMember.full_name || "";

    document.getElementById("editDateOfBirth").value =
        currentMember.date_of_birth || "";

    document.getElementById("editEmail").value =
        currentMember.email || "";

    document.getElementById("editPhone").value =
        currentMember.phone || "";

    document.getElementById("editAddress").value =
        currentMember.address || "";

    // Load next of kin information
    if (currentNextOfKin) {

        document.getElementById("editNokFullName").value =
            currentNextOfKin.full_name || "";

        document.getElementById("editNokRelationship").value =
            currentNextOfKin.relationship || "";

        document.getElementById("editNokPhone").value =
            currentNextOfKin.phone || "";

        document.getElementById("editNokEmail").value =
            currentNextOfKin.email || "";

        document.getElementById("editNokAddress").value =
            currentNextOfKin.address || "";
    }

    // Hide profile and show edit form
    profileContent.style.display = "none";
    editMemberForm.style.display = "block";
});

cancelEditButton.addEventListener("click", () => {

    // Hide edit form and return to profile
    editMemberForm.style.display = "none";
    profileContent.style.display = "block";
});
    
// ---------------------------------------------
// 12. Save edited member information
// ---------------------------------------------

editMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {

        // Get updated member information
        const updatedMember = {
            full_name: document.getElementById("editFullName").value.trim(),
            date_of_birth: document.getElementById("editDateOfBirth").value || null,
            email: document.getElementById("editEmail").value.trim(),
            phone: document.getElementById("editPhone").value.trim(),
            address: document.getElementById("editAddress").value.trim()
        };

        // Update member in Supabase
        const { error: memberUpdateError } = await supabaseClient
            .from("members")
            .update(updatedMember)
            .eq("id", memberId);

        if (memberUpdateError) {
            throw memberUpdateError;
        }


        // ---------------------------------------------
        // Update Next of Kin
        // ---------------------------------------------

        const updatedNextOfKin = {
            full_name: document.getElementById("editNokFullName").value.trim(),
            relationship: document.getElementById("editNokRelationship").value.trim(),
            phone: document.getElementById("editNokPhone").value.trim(),
            email: document.getElementById("editNokEmail").value.trim(),
            address: document.getElementById("editNokAddress").value.trim()
        };

        if (currentNextOfKin) {

            const { error: nokUpdateError } = await supabaseClient
                .from("next_of_kin")
                .update(updatedNextOfKin)
                .eq("member_id", memberId);

            if (nokUpdateError) {
                throw nokUpdateError;
            }

        } else {

            // Create Next of Kin if none exists
            const { error: nokInsertError } = await supabaseClient
                .from("next_of_kin")
                .insert({
                    member_id: memberId,
                    ...updatedNextOfKin
                });

            if (nokInsertError) {
                throw nokInsertError;
            }
        }


        alert("Member updated successfully.");

        // Reload page so updated information is displayed
        window.location.reload();

    } catch (error) {

        console.error("Update member error:", error);

        alert(
            "Unable to update member: " +
            (error.message || "Unknown error")
        );
    }
});    
});
