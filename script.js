/* =========================================================
   CARETRACK
   Intelligent Patient Case Tracking System
   Frontend-only prototype
   ========================================================= */


/* =========================================================
   DATABASE
   ========================================================= */

const STORAGE_KEY = "caretrack_intelligent_patients";

let patients =
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

let editingPatientId = null;

let riskChart = null;


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}


function saveDatabase() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(patients)
    );

    renderEverything();
}


function generatePatientID() {

    return (
        "PT-" +
        new Date().getFullYear() +
        "-" +
        String(Date.now()).slice(-6)
    );
}


function today() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, function (char) {

            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return map[char];

        });

}


function formatDate(date) {

    if (!date) {
        return "—";
    }

    return new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function showToast(message) {

    const toast = $("#toast");

    toast.textContent = message;

    toast.style.display = "block";

    setTimeout(() => {

        toast.style.display = "none";

    }, 2500);
}


/* =========================================================
   NAVIGATION
   ========================================================= */

const pageInformation = {

    dashboard: [
        "Dashboard",
        "Intelligent patient case monitoring"
    ],

    patients: [
        "Patients",
        "Search and manage patient records"
    ],

    newcase: [
        "New Patient Case",
        "Capture complete clinical information"
    ],

    intelligence: [
        "Patient Intelligence",
        "Risk detection and case analysis"
    ],

    followups: [
        "Smart Follow-ups",
        "Automatically prioritized follow-up cases"
    ],

    integration: [
        "System Integration",
        "Connect with existing hospital software"
    ],

    reports: [
        "Clinical Reports",
        "Printable patient case reports"
    ]

};


function showPage(page) {

    $$(".page").forEach(
        element =>
            element.classList.remove("active")
    );

    $("#" + page).classList.add("active");


    $$(".nav-btn").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });


    $("#pageTitle").textContent =
        pageInformation[page][0];

    $("#pageSubtitle").textContent =
        pageInformation[page][1];


    if (page === "newcase") {

        if (!editingPatientId) {

            $("#patientId").value =
                generatePatientID();

        }

    }


    if (page === "intelligence") {

        renderIntelligencePatients();

    }


    if (page === "followups") {

        renderFollowups();

    }


    if (page === "reports") {

        renderReportPatients();

    }

}


$$(".nav-btn").forEach(button => {

    button.addEventListener(
        "click",
        () => showPage(button.dataset.page)
    );

});


$$("[data-page]").forEach(button => {

    if (!button.classList.contains("nav-btn")) {

        button.addEventListener(
            "click",
            () => showPage(button.dataset.page)
        );

    }

});


/* =========================================================
   NEW CASE
   ========================================================= */

$("#quickNew").onclick = newCase;

$("#addPatient").onclick = newCase;


function newCase() {

    editingPatientId = null;

    $("#caseForm").reset();

    $("#patientId").value =
        generatePatientID();

    showPage("newcase");
}


$("#clearForm").onclick = newCase;


/* =========================================================
   CASE SAVE
   ========================================================= */

$("#caseForm").addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        const formData =
            new FormData(this);

        const patient =
            Object.fromEntries(formData.entries());


        patient.createdAt =
            Date.now();


        patient.createdDate =
            today();


        /*
        Calculate risk when case is saved.
        */

        const risk =
            calculateRisk(patient);


        patient.riskScore =
            risk.score;


        patient.riskLevel =
            risk.level;


        patient.redFlags =
            risk.flags;


        /*
        Store visit history.
        */

        patient.visits = [
            {
                date: today(),

                complaint:
                    patient.complaint,

                diagnosis:
                    patient.diagnosis,

                treatment:
                    patient.treatment,

                temperature:
                    patient.temperature,

                pulse:
                    patient.pulse,

                spo2:
                    patient.spo2,

                bp:
                    patient.bp,

                pain:
                    patient.pain
            }
        ];


        if (editingPatientId) {

            const old =
                patients.find(
                    p =>
                        p.patientId ===
                        editingPatientId
                );


            if (old) {

                patient.createdAt =
                    old.createdAt;

                patient.createdDate =
                    old.createdDate;

                /*
                Preserve previous visits.
                */

                patient.visits =
                    old.visits || [];

                patient.visits.push({
                    date: today(),

                    complaint:
                        patient.complaint,

                    diagnosis:
                        patient.diagnosis,

                    treatment:
                        patient.treatment,

                    temperature:
                        patient.temperature,

                    pulse:
                        patient.pulse,

                    spo2:
                        patient.spo2,

                    bp:
                        patient.bp,

                    pain:
                        patient.pain
                });

            }


            patients =
                patients.map(
                    p =>
                        p.patientId ===
                        editingPatientId
                            ? patient
                            : p
                );


            showToast(
                "Patient case updated successfully."
            );

        } else {

            patients.push(patient);

            showToast(
                "Patient case saved successfully."
            );

        }


        editingPatientId = null;

        saveDatabase();


        setTimeout(
            () => showPage("patients"),
            500
        );

    }
);


/* =========================================================
   RISK ENGINE
   =========================================================

   IMPORTANT:
   This is a prototype rule engine.
   It is NOT a medical diagnostic system.
   ========================================================= */

function calculateRisk(patient) {

    let score = 0;

    let flags = [];


    const temperature =
        parseFloat(patient.temperature);

    const pulse =
        parseFloat(patient.pulse);

    const spo2 =
        parseFloat(patient.spo2);

    const resp =
        parseFloat(patient.respRate);

    const pain =
        parseFloat(patient.pain);


    /*
    Oxygen saturation
    */

    if (!isNaN(spo2)) {

        if (spo2 < 90) {

            score += 40;

            flags.push(
                "Very low SpO₂ recorded."
            );

        }

        else if (spo2 < 94) {

            score += 20;

            flags.push(
                "Reduced SpO₂ recorded."
            );

        }

    }


    /*
    Temperature
    */

    if (!isNaN(temperature)) {

        if (temperature >= 39) {

            score += 20;

            flags.push(
                "High temperature recorded."
            );

        }

        else if (temperature >= 38) {

            score += 10;

            flags.push(
                "Elevated temperature recorded."
            );

        }

    }


    /*
    Pulse
    */

    if (!isNaN(pulse)) {

        if (pulse > 120) {

            score += 20;

            flags.push(
                "High pulse rate recorded."
            );

        }

        else if (pulse > 100) {

            score += 10;

            flags.push(
                "Elevated pulse rate recorded."
            );

        }

    }


    /*
    Respiratory rate
    */

    if (!isNaN(resp)) {

        if (resp > 24) {

            score += 15;

            flags.push(
                "Elevated respiratory rate."
            );

        }

    }


    /*
    Pain
    */

    if (!isNaN(pain)) {

        if (pain >= 8) {

            score += 15;

            flags.push(
                "Severe pain score recorded."
            );

        }

    }


    /*
    Keywords in complaint
    */

    const text = (
        (patient.complaint || "") +
        " " +
        (patient.history || "")
    ).toLowerCase();


    const warningWords = [
        "chest pain",
        "breathing difficulty",
        "shortness of breath",
        "unconscious",
        "fainting",
        "severe bleeding",
        "stroke",
        "seizure"
    ];


    warningWords.forEach(word => {

        if (text.includes(word)) {

            score += 15;

            flags.push(
                "Red-flag symptom mentioned: " +
                word
            );

        }

    });


    /*
    Cap score.
    */

    score =
        Math.min(score, 100);


    let level =
        "Low";


    if (score >= 60) {

        level = "High";

    }

    else if (score >= 30) {

        level = "Medium";

    }


    return {
        score,
        level,
        flags
    };

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    $("#totalPatients").textContent =
        patients.length;


    $("#activeCases").textContent =
        patients.filter(
            p =>
                p.status !== "Closed" &&
                p.status !== "Recovered"
        ).length;


    $("#highRiskPatients").textContent =
        patients.filter(
            p =>
                p.riskLevel === "High"
        ).length;


    $("#followupCount").textContent =
        patients.filter(
            p =>
                p.followup &&
                p.followup <= today() &&
                p.status !== "Closed"
        ).length;


    renderPriorityCases();

    renderRecentPatients();

    renderRiskChart();

}


function renderPriorityCases() {

    const sorted =
        patients
            .filter(
                p =>
                    p.riskLevel === "High" ||
                    p.followup <= today()
            )
            .sort(
                (a, b) =>
                    (b.riskScore || 0) -
                    (a.riskScore || 0)
            )
            .slice(0, 6);


    if (!sorted.length) {

        $("#priorityCases").innerHTML =
            `<div class="empty">
                No high-priority cases.
            </div>`;

        return;

    }


    $("#priorityCases").innerHTML =
        sorted.map(p => {

            return `
                <div class="priority-card">

                    <strong>
                        ${escapeHTML(p.name)}
                    </strong>

                    <small>
                        ${escapeHTML(p.diagnosis)}
                    </small>

                    <span class="risk ${p.riskLevel.toLowerCase()}">
                        ${p.riskLevel} Risk
                        ${p.riskScore || 0}/100
                    </span>

                </div>
            `;

        }).join("");

}


function renderRecentPatients() {

    const recent =
        patients
            .slice()
            .sort(
                (a, b) =>
                    b.createdAt -
                    a.createdAt
            )
            .slice(0, 7);


    if (!recent.length) {

        $("#recentPatients").innerHTML =
            `<div class="empty">
                No patient records yet.
            </div>`;

        return;

    }


    $("#recentPatients").innerHTML = `

        <div style="overflow:auto">

        <table>

            <thead>

                <tr>

                    <th>Patient</th>

                    <th>ID</th>

                    <th>Diagnosis</th>

                    <th>Risk</th>

                    <th>Status</th>

                </tr>

            </thead>

            <tbody>

                ${recent.map(p => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(p.name)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(p.patientId)}
                        </td>

                        <td>
                            ${escapeHTML(p.diagnosis)}
                        </td>

                        <td>

                            <span class="risk ${p.riskLevel.toLowerCase()}">
                                ${p.riskLevel}
                            </span>

                        </td>

                        <td>
                            ${escapeHTML(p.status)}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

        </div>
    `;

}


/* =========================================================
   RISK CHART
   ========================================================= */

function renderRiskChart() {

    const low =
        patients.filter(
            p => p.riskLevel === "Low"
        ).length;

    const medium =
        patients.filter(
            p => p.riskLevel === "Medium"
        ).length;

    const high =
        patients.filter(
            p => p.riskLevel === "High"
        ).length;


    const canvas =
        $("#riskChart");


    if (riskChart) {

        riskChart.destroy();

    }


    riskChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Low",
                        "Medium",
                        "High"
                    ],

                    datasets: [
                        {
                            data: [
                                low,
                                medium,
                                high
                            ]
                        }
                    ]

                },

                options: {

                    responsive: true,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            }
        );

}


/* =========================================================
   PATIENT TABLE
   ========================================================= */

function renderPatients() {

    const search =
        ($("#patientSearch").value || "")
            .toLowerCase();


    const filtered =
        patients
            .filter(p => {

                const text =
                    [
                        p.name,
                        p.patientId,
                        p.phone,
                        p.diagnosis,
                        p.complaint
                    ]
                        .join(" ")
                        .toLowerCase();

                return text.includes(search);

            })
            .sort(
                (a, b) =>
                    b.createdAt -
                    a.createdAt
            );


    if (!filtered.length) {

        $("#patientsTable").innerHTML =
            `<div class="empty">
                No patients found.
            </div>`;

        return;

    }


    $("#patientsTable").innerHTML = `

        <div style="overflow:auto">

        <table>

            <thead>

                <tr>

                    <th>Patient</th>

                    <th>Patient ID</th>

                    <th>Age/Gender</th>

                    <th>Complaint</th>

                    <th>Diagnosis</th>

                    <th>Risk</th>

                    <th>Status</th>

                    <th>Actions</th>

                </tr>

            </thead>

            <tbody>

                ${filtered.map(p => `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHTML(p.name)}
                            </strong>

                            <br>

                            <small>
                                ${escapeHTML(p.phone)}
                            </small>

                        </td>


                        <td>
                            ${escapeHTML(p.patientId)}
                        </td>


                        <td>
                            ${escapeHTML(p.age)}
                            /
                            ${escapeHTML(p.gender)}
                        </td>


                        <td>
                            ${escapeHTML(p.complaint)}
                        </td>


                        <td>
                            ${escapeHTML(p.diagnosis)}
                        </td>


                        <td>

                            <span class="risk ${p.riskLevel.toLowerCase()}">

                                ${p.riskLevel}

                            </span>

                        </td>


                        <td>
                            ${escapeHTML(p.status)}
                        </td>


                        <td class="actions">

                            <button
                                onclick="openIntelligence('${p.patientId}')"
                            >
                                Intelligence
                            </button>

                            <button
                                onclick="editPatient('${p.patientId}')"
                            >
                                Edit
                            </button>

                            <button
                                onclick="deletePatient('${p.patientId}')"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

        </div>

    `;

}


$("#patientSearch").addEventListener(
    "input",
    renderPatients
);


/* =========================================================
   EDIT
   ========================================================= */

function editPatient(patientId) {

    const patient =
        patients.find(
            p =>
                p.patientId ===
                patientId
        );


    if (!patient) return;


    editingPatientId =
        patientId;


    showPage("newcase");


    const form =
        $("#caseForm");


    Object.keys(patient).forEach(key => {

        if (
            form.elements[key]
        ) {

            form.elements[key].value =
                patient[key] || "";

        }

    });

}


window.editPatient =
    editPatient;


/* =========================================================
   DELETE
   ========================================================= */

function deletePatient(patientId) {

    if (
        !confirm(
            "Delete this patient record?"
        )
    ) {
        return;
    }


    patients =
        patients.filter(
            p =>
                p.patientId !==
                patientId
        );


    saveDatabase();

    showToast(
        "Patient record deleted."
    );

}


window.deletePatient =
    deletePatient;


/* =========================================================
   PATIENT INTELLIGENCE
   ========================================================= */

function renderIntelligencePatients() {

    const select =
        $("#intelligencePatient");


    const old =
        select.value;


    select.innerHTML =
        `
        <option value="">
            Select Patient
        </option>

        ${
            patients
                .sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                )
                .map(
                    p =>
                        `
                        <option
                            value="${p.patientId}"
                        >
                            ${escapeHTML(p.name)}
                            —
                            ${escapeHTML(p.patientId)}
                        </option>
                        `
                )
                .join("")
        }
        `;


    if (old) {

        select.value =
            old;

    }

}


$("#intelligencePatient")
    .addEventListener(
        "change",
        function () {

            renderIntelligence(
                this.value
            );

        }
    );


function openIntelligence(patientId) {

    showPage("intelligence");

    renderIntelligencePatients();

    $("#intelligencePatient").value =
        patientId;

    renderIntelligence(patientId);

}


window.openIntelligence =
    openIntelligence;


/* =========================================================
   INTELLIGENCE ENGINE
   ========================================================= */

function renderIntelligence(patientId) {

    const container =
        $("#intelligenceContent");


    if (!patientId) {

        container.innerHTML =
            `<div class="empty">
                Select a patient to open
                Patient Intelligence.
            </div>`;

        return;

    }


    const patient =
        patients.find(
            p =>
                p.patientId ===
                patientId
        );


    if (!patient) return;


    const risk =
        calculateRisk(patient);


    /*
    Update stored risk.
    */

    patient.riskScore =
        risk.score;

    patient.riskLevel =
        risk.level;

    patient.redFlags =
        risk.flags;


    /*
    Generate summary.
    */

    const summary =
        generateCaseSummary(
            patient,
            risk
        );


    /*
    Similar cases.
    */

    const similar =
        findSimilarCases(
            patient
        );


    container.innerHTML = `

        <!-- RISK HEADER -->

        <div class="intelligence-header">

            <div class="intelligence-box">

                <h4>Risk Level</h4>

                <div
                    class="risk-score"
                >

                    ${risk.score}/100

                </div>

                <span class="risk ${risk.level.toLowerCase()}">

                    ${risk.level} Risk

                </span>

            </div>


            <div class="intelligence-box">

                <h4>Diagnosis</h4>

                <strong>
                    ${escapeHTML(
                        patient.diagnosis
                    )}
                </strong>

                <p>
                    ${escapeHTML(
                        patient.complaint
                    )}
                </p>

            </div>


            <div class="intelligence-box">

                <h4>Follow-up</h4>

                <strong>

                    ${formatDate(
                        patient.followup
                    )}

                </strong>

                <p>
                    ${followupPriority(
                        patient
                    )}
                </p>

            </div>

        </div>


        <!-- RED FLAGS -->

        <div class="panel">

            <h3>
                 Red-Flag Detection
            </h3>

            ${
                risk.flags.length
                    ?

                    risk.flags
                        .map(
                            flag =>
                                `
                                <div class="red-flag">
                                    ⚠ ${escapeHTML(flag)}
                                </div>
                                `
                        )
                        .join("")

                    :

                    `
                    <div class="safe-flag">
                        ✓ No configured
                        red flags detected
                        from the entered data.
                    </div>
                    `
            }

        </div>


        <!-- AI SUMMARY -->

        <div class="panel">

            <h3>
                 Intelligent Case Summary
            </h3>

            <div class="ai-summary">

                ${escapeHTML(summary)}

            </div>

            <p>
                <small>
                    This prototype uses a
                    deterministic rule-based
                    summary. A production version
                    can replace this module with
                    a validated clinical AI service.
                </small>
            </p>

        </div>


        <!-- TIMELINE -->

        <div class="panel">

            <h3>
                 Patient Timeline
            </h3>

            ${buildTimeline(patient)}

        </div>


        <!-- TREATMENT RESPONSE -->

        <div class="panel">

            <h3>
                 Treatment Response
            </h3>

            ${buildTreatmentResponse(patient)}

        </div>


        <!-- SIMILAR CASES -->

        <div class="panel">

            <h3>
                 Similar Cases
            </h3>

            ${
                similar.length
                    ?

                    similar.map(
                        p =>
                            `
                            <div
                                class="priority-card"
                            >

                                <strong>
                                    ${escapeHTML(
                                        p.name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        p.diagnosis
                                    )}
                                </small>

                                <button
                                    class="link-btn"
                                    onclick="openIntelligence('${p.patientId}')"
                                >
                                    Open
                                </button>

                            </div>
                            `
                    ).join("")

                    :

                    `
                    <div class="empty">
                        No similar cases
                        found in local database.
                    </div>
                    `
            }

        </div>

    `;

}


function generateCaseSummary(
    patient,
    risk
) {

    let summary =
        `${patient.name}, aged ${patient.age}, ` +
        "presented with " +
        `${patient.complaint || "the recorded complaint"}. `;


    if (patient.duration) {

        summary +=
            `Symptoms have been reported for ` +
            `${patient.duration}. `;

    }


    if (patient.diagnosis) {

        summary +=
            `The recorded diagnosis is ` +
            `${patient.diagnosis}. `;

    }


    const vitalParts = [];


    if (patient.temperature) {

        vitalParts.push(
            `temperature ${patient.temperature}°C`
        );

    }


    if (patient.pulse) {

        vitalParts.push(
            `pulse ${patient.pulse} bpm`
        );

    }


    if (patient.spo2) {

        vitalParts.push(
            `SpO₂ ${patient.spo2}%`
        );

    }


    if (patient.bp) {

        vitalParts.push(
            `blood pressure ${patient.bp}`
        );

    }


    if (vitalParts.length) {

        summary +=
            "Recorded observations include " +
            vitalParts.join(", ") +
            ". ";

    }


    summary +=
        `The configured prototype risk engine ` +
        `currently assigns a ${risk.level.toLowerCase()} ` +
        `risk level with a score of ` +
        `${risk.score}/100. `;


    if (patient.treatment) {

        summary +=
            `Current treatment notes indicate: ` +
            `${patient.treatment}. `;

    }


    if (patient.followup) {

        summary +=
            `The next recorded follow-up is ` +
            `${formatDate(patient.followup)}.`;

    }


    return summary;

}


/* =========================================================
   TIMELINE
   ========================================================= */

function buildTimeline(patient) {

    const visits =
        patient.visits || [];


    if (!visits.length) {

        return `
            <div class="empty">
                No visit timeline available.
            </div>
        `;

    }


    return `

        <div class="timeline">

            ${visits.map(
                visit =>
                    `
                    <div
                        class="timeline-item"
                    >

                        <div
                            class="timeline-date"
                        >
                            ${formatDate(
                                visit.date
                            )}
                        </div>

                        <div
                            class="timeline-title"
                        >
                            Clinical Visit
                        </div>

                        <div
                            class="timeline-description"
                        >
                            Complaint:
                            ${escapeHTML(
                                visit.complaint
                            )}
                            <br>

                            Diagnosis:
                            ${escapeHTML(
                                visit.diagnosis
                            )}

                            ${
                                visit.treatment
                                    ?

                                    `<br>
                                    Treatment:
                                    ${escapeHTML(
                                        visit.treatment
                                    )}`
                                    :

                                    ""
                            }

                        </div>

                    </div>
                    `
            ).join("")}

        </div>
    `;

}


/* =========================================================
   TREATMENT RESPONSE
   ========================================================= */

function buildTreatmentResponse(patient) {

    const visits =
        patient.visits || [];


    if (visits.length < 2) {

        return `
            <div class="empty">

                More than one recorded
                visit is required to
                calculate a treatment trend.

            </div>
        `;

    }


    const first =
        visits[0];

    const latest =
        visits[visits.length - 1];


    let message =
        "Compare available observations " +
        "between visits.";


    if (
        first.pulse &&
        latest.pulse
    ) {

        const difference =
            Number(latest.pulse) -
            Number(first.pulse);


        message +=
            ` Pulse changed by ` +
            `${difference} bpm.`;

    }


    if (
        first.temperature &&
        latest.temperature
    ) {

        const difference =
            (
                Number(latest.temperature) -
                Number(first.temperature)
            ).toFixed(1);


        message +=
            ` Temperature changed by ` +
            `${difference}°C.`;

    }


    if (
        first.spo2 &&
        latest.spo2
    ) {

        const difference =
            Number(latest.spo2) -
            Number(first.spo2);


        message +=
            ` SpO₂ changed by ` +
            `${difference} percentage points.`;

    }


    return `
        <div class="ai-summary">
            ${escapeHTML(message)}
        </div>
    `;

}


/* =========================================================
   SIMILAR CASE FINDER
   ========================================================= */

function findSimilarCases(
    patient
) {

    const keywords =
        (
            patient.diagnosis +
            " " +
            patient.complaint
        )
            .toLowerCase()
            .split(/\s+/)
            .filter(
                word =>
                    word.length > 3
            );


    return patients
        .filter(
            p =>
                p.patientId !==
                patient.patientId
        )
        .map(p => {

            const text =
                (
                    p.diagnosis +
                    " " +
                    p.complaint
                ).toLowerCase();


            let score = 0;


            keywords.forEach(
                keyword => {

                    if (
                        text.includes(
                            keyword
                        )
                    ) {

                        score++;

                    }

                }
            );


            return {
                patient: p,
                score
            };

        })
        .filter(
            item =>
                item.score > 0
        )
        .sort(
            (a, b) =>
                b.score -
                a.score
        )
        .slice(0, 5)
        .map(
            item =>
                item.patient
        );

}


/* =========================================================
   FOLLOW-UP INTELLIGENCE
   ========================================================= */

function followupPriority(
    patient
) {

    if (!patient.followup) {

        return "No follow-up scheduled";

    }


    const now =
        new Date();


    const date =
        new Date(
            patient.followup +
            "T00:00:00"
        );


    const difference =
        Math.ceil(
            (
                date -
                new Date(
                    now
                        .toISOString()
                        .slice(0, 10) +
                    "T00:00:00"
                )
            )
            /
            86400000
        );


    if (difference < 0) {

        return "OVERDUE";

    }


    if (difference === 0) {

        return "DUE TODAY";

    }


    if (difference <= 3) {

        return "DUE SOON";

    }


    return "Scheduled";

}


function priorityClass(
    patient
) {

    if (!patient.followup) {

        return "priority-normal";

    }


    const now =
        new Date(
            today() +
            "T00:00:00"
        );


    const date =
        new Date(
            patient.followup +
            "T00:00:00"
        );


    const days =
        Math.ceil(
            (
                date -
                now
            ) / 86400000
        );


    if (days < 0) {

        return "priority-overdue";

    }

    if (days <= 0) {

        return "priority-urgent";

    }

    if (days <= 3) {

        return "priority-soon";

    }


    return "priority-normal";

}


function renderFollowups() {

    const list =
        patients
            .filter(
                p =>
                    p.followup
            )
            .sort(
                (a, b) =>
                    a.followup.localeCompare(
                        b.followup
                    )
            );


    if (!list.length) {

        $("#followupTable").innerHTML =
            `
            <div class="empty">
                No follow-ups scheduled.
            </div>
            `;

        return;

    }


    $("#followupTable").innerHTML = `

        ${list.map(p => `

            <div class="priority-row">

                <div>

                    <strong>
                        ${escapeHTML(p.name)}
                    </strong>

                    <br>

                    <small>
                        ${escapeHTML(
                            p.diagnosis
                        )}
                    </small>

                </div>


                <div>

                    ${formatDate(
                        p.followup
                    )}

                </div>


                <span
                    class="priority-label
                    ${priorityClass(p)}"
                >

                    ${followupPriority(p)}

                </span>


                <button
                    class="link-btn"
                    onclick="openIntelligence('${p.patientId}')"
                >
                    View
                </button>

            </div>

        `).join("")}

    `;

}


/* =========================================================
   INTEGRATION
   ========================================================= */

function renderApiDemo() {

    const demo = {

        method: "GET",

        endpoint:
            "https://example-hospital.com/api/patients/PT-2026-123456",

        headers: {

            Authorization:
                "Bearer YOUR_TOKEN",

            Accept:
                "application/json"

        }

    };


    $("#apiDemo").textContent =
        JSON.stringify(
            demo,
            null,
            4
        );

}


$("#testApi").onclick =
    function () {

        const status =
            $("#apiStatus");


        status.textContent =
            "Testing connection...";


        setTimeout(
            () => {

                status.textContent =
                    "Demo connection successful. Ready for API integration.";

                status.classList.add(
                    "connected"
                );

                showToast(
                    "API connection simulated successfully."
                );

            },
            1000
        );

    };


/* =========================================================
   REPORTS
   ========================================================= */

function renderReportPatients() {

    const select =
        $("#reportPatient");


    const old =
        select.value;


    select.innerHTML =
        `
        <option value="">
            Select Patient
        </option>

        ${
            patients
                .map(
                    p =>
                        `
                        <option
                            value="${p.patientId}"
                        >
                            ${escapeHTML(
                                p.name
                            )}
                            —
                            ${escapeHTML(
                                p.patientId
                            )}
                        </option>
                        `
                )
                .join("")
        }
        `;


    if (old) {

        select.value =
            old;

    }

}


$("#reportPatient")
    .addEventListener(
        "change",
        function () {

            renderReport(
                this.value
            );

        }
    );


function renderReport(
    patientId
) {

    if (!patientId) {

        $("#reportPreview").innerHTML =
            `
            <div class="empty">
                Select a patient.
            </div>
            `;

        return;

    }


    const p =
        patients.find(
            x =>
                x.patientId ===
                patientId
        );


    if (!p) return;


    $("#reportPreview").innerHTML = `

        <div class="case-sheet">

            <h2>
                Patient Clinical Case Sheet
            </h2>

            <p style="text-align:center">
                CareTrack Intelligent
                Patient Case Tracking System
            </p>


            <div class="case-section">

                <h4>
                    Patient Information
                </h4>

                <div class="case-row">

                    <div>
                        <strong>ID:</strong>
                        ${escapeHTML(p.patientId)}
                    </div>

                    <div>
                        <strong>Name:</strong>
                        ${escapeHTML(p.name)}
                    </div>

                    <div>
                        <strong>Age:</strong>
                        ${escapeHTML(p.age)}
                    </div>

                    <div>
                        <strong>Gender:</strong>
                        ${escapeHTML(p.gender)}
                    </div>

                    <div>
                        <strong>Phone:</strong>
                        ${escapeHTML(p.phone)}
                    </div>

                    <div>
                        <strong>Blood Group:</strong>
                        ${escapeHTML(p.blood)}
                    </div>

                </div>

            </div>


            <div class="case-section">

                <h4>
                    Presenting Complaint
                </h4>

                <p>
                    ${escapeHTML(p.complaint)}
                </p>

                <p>
                    ${escapeHTML(p.history)}
                </p>

            </div>


            <div class="case-section">

                <h4>
                    Medical History
                </h4>

                <p>
                    <strong>Past History:</strong>
                    ${escapeHTML(p.pastHistory)}
                </p>

                <p>
                    <strong>Allergies:</strong>
                    ${escapeHTML(p.allergies)}
                </p>

                <p>
                    <strong>Current Medication:</strong>
                    ${escapeHTML(p.currentMeds)}
                </p>

            </div>


            <div class="case-section">

                <h4>
                    Vitals
                </h4>

                <div class="case-row">

                    <div>
                        Temperature:
                        ${escapeHTML(p.temperature)}
                    </div>

                    <div>
                        Pulse:
                        ${escapeHTML(p.pulse)}
                    </div>

                    <div>
                        SpO₂:
                        ${escapeHTML(p.spo2)}
                    </div>

                    <div>
                        BP:
                        ${escapeHTML(p.bp)}
                    </div>

                    <div>
                        Respiratory Rate:
                        ${escapeHTML(p.respRate)}
                    </div>

                    <div>
                        Pain:
                        ${escapeHTML(p.pain)}
                    </div>

                </div>

            </div>


            <div class="case-section">

                <h4>
                    Assessment & Treatment
                </h4>

                <p>
                    <strong>Diagnosis:</strong>
                    ${escapeHTML(p.diagnosis)}
                </p>

                <p>
                    <strong>Investigations:</strong>
                    ${escapeHTML(p.investigations)}
                </p>

                <p>
                    <strong>Treatment:</strong>
                    ${escapeHTML(p.treatment)}
                </p>

                <p>
                    <strong>Prescriptions:</strong>
                    ${escapeHTML(p.prescriptions)}
                </p>

            </div>


            <div class="case-section">

                <h4>
                    Intelligent Assessment
                </h4>

                <p>
                    Risk:
                    <strong>
                        ${escapeHTML(
                            p.riskLevel
                        )}
                    </strong>
                </p>

                <p>
                    Risk Score:
                    ${p.riskScore || 0}/100
                </p>

            </div>


            <div class="case-section">

                <h4>
                    Follow-up
                </h4>

                <p>
                    Date:
                    ${formatDate(p.followup)}
                </p>

                <p>
                    ${escapeHTML(
                        p.followupNotes
                    )}
                </p>

            </div>


            <p
                style="
                    margin-top:40px;
                    font-size:11px;
                    color:#777;
                "
            >
                Prototype generated by CareTrack.
                Clinical decisions must be made by
                qualified healthcare professionals.
            </p>

        </div>

    `;

}


$("#printReport").onclick =
    function () {

        if (!$("#reportPatient").value) {

            showToast(
                "Please select a patient."
            );

            return;

        }


        window.print();

    };


/* =========================================================
   GLOBAL RENDER
   ========================================================= */

function renderEverything() {

    renderDashboard();

    renderPatients();

    renderFollowups();

    renderIntelligencePatients();

    renderReportPatients();

    renderApiDemo();

}


/* =========================================================
   INITIALIZE
   ========================================================= */

renderEverything();

showPage("dashboard");


/* =========================================================
   DEMO DATA
   =========================================================

   Uncomment the function below if you want to
   automatically generate sample patients.

   ========================================================= */


function generateDemoData() {

    if (patients.length > 0) {

        return;

    }


    patients = [

        {

            patientId: "PT-DEMO-001",

            name: "Rahul Sharma",

            age: "46",

            gender: "Male",

            phone: "9876543210",

            blood: "B+",

            complaint:
                "Fever and breathing difficulty",

            duration:
                "3 days",

            history:
                "Progressive fever with shortness of breath.",

            diagnosis:
                "Respiratory infection",

            temperature:
                "39.1",

            pulse:
                "112",

            spo2:
                "89",

            respRate:
                "26",

            bp:
                "138/88",

            pain:
                "6",

            treatment:
                "Clinical observation and prescribed medication.",

            prescriptions:
                "As prescribed by clinician.",

            investigations:
                "CBC and chest imaging.",

            status:
                "Active",

            followup:
                today(),

            followupNotes:
                "Clinical review required.",

            createdAt:
                Date.now(),

            createdDate:
                today(),

            visits: [

                {

                    date: today(),

                    complaint:
                        "Fever and breathing difficulty",

                    diagnosis:
                        "Respiratory infection",

                    treatment:
                        "Observation"

                }

            ]

        },


        {

            patientId: "PT-DEMO-002",

            name: "Ananya Das",

            age: "29",

            gender: "Female",

            phone: "9000000000",

            blood: "O+",

            complaint:
                "Mild headache",

            duration:
                "2 days",

            diagnosis:
                "Primary headache",

            temperature:
                "37.1",

            pulse:
                "78",

            spo2:
                "98",

            bp:
                "116/76",

            pain:
                "3",

            treatment:
                "Supportive care.",

            status:
                "Under Observation",

            followup:
                "",

            createdAt:
                Date.now() - 86400000,

            createdDate:
                today(),

            visits: [

                {

                    date:
                        today(),

                    complaint:
                        "Mild headache",

                    diagnosis:
                        "Primary headache",

                    treatment:
                        "Supportive care"

                }

            ]

        }

    ];


    patients =
        patients.map(p => {

            const risk =
                calculateRisk(p);

            p.riskScore =
                risk.score;

            p.riskLevel =
                risk.level;

            p.redFlags =
                risk.flags;

            return p;

        });


    saveDatabase();

}


/*
To enable demo patients automatically,
remove the // from the following line:

generateDemoData();

*/


// generateDemoData();