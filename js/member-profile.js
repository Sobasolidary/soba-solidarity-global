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
        const memberId = params.get("id");

        if (!memberId || !/^\d+$/.test(memberId)) {
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

        // ----------------------------------------------------
        // 6. Membership information
        // ----------------------------------------------------

        displayValue(
            "membershipNumber",
            member.membership_number
        );

        displayValue(
            "memberId",
            member.id
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

});
