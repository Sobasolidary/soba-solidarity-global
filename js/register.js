document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");
  const verifyButton = document.getElementById("verifyButton");
  const classYearInput = document.getElementById("classYear");
  const matriculationInput = document.getElementById("matriculationNumber");
  const verificationResult = document.getElementById("verificationResult");
  const fullNameInput = document.getElementById("fullName");

  let verifiedAlumni = null;

  async function verifyAlumni() {
    const classYear = parseInt(classYearInput.value, 10);
    const matriculationNumber = matriculationInput.value.trim();

    if (!classYear || !matriculationNumber) {
      verificationResult.textContent =
        "Please enter your class year and matriculation number.";
      return;
    }

    verificationResult.textContent = "Checking Sasse records...";

    const { data, error } = await supabaseClient.rpc(
      "verify_sasse_alumni",
      {
        p_class_year: classYear,
        p_matriculation_number: matriculationNumber
      }
    );

    if (error) {
      console.error(error);
      verificationResult.textContent =
        "Verification could not be completed. Please try again.";
      verifiedAlumni = null;
      return;
    }

    if (!data || data.length === 0) {
      verificationResult.textContent =
        "No matching Sasse record was found.";
      verifiedAlumni = null;
      return;
    }

    verifiedAlumni = data[0];

    verificationResult.textContent =
      "Verified: " + verifiedAlumni.full_name;

    if (fullNameInput) {
      fullNameInput.value = verifiedAlumni.full_name;
    }
  }

  if (verifyButton) {
    verifyButton.addEventListener("click", (event) => {
      event.preventDefault();
      verifyAlumni();
    });
  }

 if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!verifiedAlumni) {
      verificationResult.textContent =
        "Please verify your Sasse matriculation details first.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton
      ? submitButton.textContent
      : "Submit Registration";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const { data, error } = await supabaseClient.rpc(
        "register_member",
        {
          p_sasse_alumni_id: verifiedAlumni.alumni_id,
          p_class_year: parseInt(classYearInput.value, 10),
          p_matriculation_number: matriculationInput.value.trim(),

          p_full_name: document.getElementById("fullName").value.trim(),
          p_date_of_birth: document.getElementById("dateOfBirth").value,

          p_email: document.getElementById("email").value.trim(),
          p_phone: document.getElementById("phone").value.trim(),
          p_address: document.getElementById("address").value.trim(),

          p_nok_full_name:
            document.getElementById("nextOfKinName").value.trim(),

          p_nok_relationship:
            document.getElementById("nextOfKinRelationship").value.trim(),

          p_nok_phone:
            document.getElementById("nextOfKinPhone").value.trim(),

          p_nok_email:
            document.getElementById("nextOfKinEmail").value.trim(),

          p_nok_address:
            document.getElementById("nextOfKinAddress").value.trim()
        }
      );

      if (error) {
        console.error(error);
        alert("Registration failed: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("Registration could not be completed.");
        return;
      }

      const membershipNumber = data[0].membership_number;

      alert(
        "Registration successful!\n\n" +
        "Your SOBA Solidarity Global Group membership number is:\n" +
        membershipNumber
      );

      form.reset();
      verifiedAlumni = null;

      verificationResult.textContent =
        "Registration completed successfully: " + membershipNumber;

    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred. Please try again.");

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}
