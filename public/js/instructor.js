let formMode = "search"; // Tracks the current mode of the form

// Fetch all instructor IDs and populate the dropdown
document.addEventListener("DOMContentLoaded", () => {
  setFormForSearch();
  initInstructorDropdown();
  addInstructorDropdownListener();

});

//SEARCH
document.getElementById("searchBtn").addEventListener("click", async () => {
  clearInstructorForm();
  setFormForSearch();
  initInstructorDropdown();
});


//ADD
document.getElementById("addBtn").addEventListener("click", async () => {
  setFormForAdd();
});

//SAVE
document.getElementById("saveBtn").addEventListener("click", async () => {
  if (formMode === "add") {
    //Get max ID for instructorId
    const res = await fetch("/api/instructor/getNextId");
    const {nextId } = await res.json();
    document.getElementById("instructorIdText").value = nextId;

    const form = document.getElementById("instructorForm");

    const instructorData = {
      instructorId: nextId,
      firstname: form.firstname.value.trim(),
      lastname: form.lastname.value.trim(),
      address: form.address.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      preferredContact: form.pref[0].checked ? "phone" : "email",
    };
    try {
      const res = await fetch("/api/instructor/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instructorData),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Failed to add instructor");

      alert(`✅ Instructor ${instructorData.instructorId} added successfully!`);
      form.reset();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  }
});

//DELETE
document.getElementById("deleteBtn").addEventListener("click", async () => {
  var select = document.getElementById("instructorIdSelect");
  var instructorId = select.value.split(":")[0];

  const response = await fetch(
    `/api/instructor/deleteInstructor?instructorId=${instructorId}`, {
      method: "DELETE"
    });

  if (!response.ok) {
    throw new Error("Instructor delete failed");
  } else {
    alert(`Instructor with id ${instructorId} successfully deleted`);
    clearInstructorForm();
    initInstructorDropdown();
    
  }
});

async function initInstructorDropdown() {
  const select = document.getElementById("instructorIdSelect");
  try {
    const response = await fetch("/api/instructor/getInstructorIds");
    const instructorIds = await response.json();

    instructorIds.forEach((instr) => {
      const option = document.createElement("option");
      option.value = instr.instructorId;
      option.textContent = `${instr.instructorId}:${instr.firstname} ${instr.lastname}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.err("Failed to load instructor IDs: ", err);
  }
}

async function addInstructorDropdownListener() {
  const form = document.getElementById("instructorForm");
  const select = document.getElementById("instructorIdSelect");
  select.addEventListener("change", async () => {
    var instructorId = select.value.split(":")[0];
    console.log(instructorId);
    try {
      const res = await fetch(
        `/api/instructor/getInstructor?instructorId=${instructorId}`
      );
      if (!res.ok) throw new Error("Instructor search failed");

      const data = await res.json();
      console.log(data);
      if (!data || Object.keys(data).length === 0) {
        alert("No instructor found");
        return;
      }

      //Fill form with data
      form.firstname.value = data.firstname || "";
      form.lastname.value = data.lastname || "";
      form.address.value = data.address || "";
      form.phone.value = data.phone || "";
      form.email.value = data.email || "";

      if (data.preferredContact === "phone") {
        form.pref[0].checked = true;
      } else form.pref[1].checked = true;
    } catch (err) {
      alert(`Error searching package: ${instructorId} - ${err.message}`);
    }
  });
}

function clearInstructorForm() {
  document.getElementById("instructorForm").reset(); // Clears all inputs including text, textarea, and unchecks radio buttons
  document.getElementById("instructorIdSelect").innerHTML = "";
}

function setFormForSearch() {
  formMode = "search";
  //toggle back to search mode
  document.getElementById("instructorIdLabel").style.display = "block"; // Show dropdown
  document.getElementById("instructorIdTextLabel").style.display = "none"; // Hide text input
  document.getElementById("instructorIdText").value = "";
  document.getElementById("instructorIdText").style.display = "none";
  document.getElementById("instructorForm").reset();
}

function setFormForAdd() {
  formMode = "add";
    //hide the instructor id drop down and label
  document.getElementById("instructorIdLabel").style.display = "none";
  document.getElementById("instructorIdTextLabel").style.display = "block";
  document.getElementById("instructorIdText").value = "";
  document.getElementById("instructorForm").reset();
}
