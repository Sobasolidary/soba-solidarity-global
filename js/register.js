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
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!verifiedAlumni) {
        verificationResult.textContent =
          "Please verify your Sasse matriculation details first.";
        return;
      }

      alert(
        "Sasse verification successful. Registration submission will be enabled in the next step."
      );
    });
  }
});
