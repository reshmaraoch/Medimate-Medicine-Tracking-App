// ---------- OCR PARSERS----------
export function parseUniversalPrescription(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const medications = [];

  const dosageRegex =
    /\b(\d+\s?mg|\d+\s?g|\d+\s?mcg|\d+\s?iu|\d+\s?ml|[1-3]\s?(tablet|tablets|capsule|capsules|cap|caps))\b/i;

  const scheduleRegex =
    /\b(every\s?\d+\s?(hours|hrs|hr)|once (a )?day|twice (a )?day|thrice (a )?day|daily|at bedtime|morning|night)\b/i;

  for (let line of lines) {
    const lowered = line.toLowerCase();

    if (lowered.includes("patient")) continue;
    if (lowered.includes("doctor")) continue;
    if (lowered.includes("physician")) continue;
    if (lowered.includes("address")) continue;
    if (lowered.includes("phone")) continue;
    if (lowered.includes("email")) continue;
    if (lowered.includes("date")) continue;
    if (lowered.includes("signature")) continue;
    if (lowered.startsWith("rx")) continue;

    const dosageMatch = line.match(dosageRegex);
    const scheduleMatch = line.match(scheduleRegex);

    if (dosageMatch && scheduleMatch) {
      const dosage = dosageMatch[1];
      const schedule = scheduleMatch[1];

      const namePart = line.split(dosageMatch[0])[0].trim();
      const name = namePart.replace(/[\d:,|-]/g, "").trim();

      medications.push({
        name,
        dosage,
        schedule,
      });
    }
  }

  return { medications };
}

export function fallbackParseLinesToMeds(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const meds = [];

  for (let line of lines) {
    const lowered = line.toLowerCase();

    if (lowered.includes("patient")) continue;
    if (lowered.includes("doctor")) continue;
    if (lowered.includes("physician")) continue;
    if (lowered.includes("address")) continue;
    if (lowered.includes("phone")) continue;
    if (lowered.includes("email")) continue;
    if (lowered.includes("date")) continue;
    if (lowered.includes("signature")) continue;
    if (lowered.startsWith("rx")) continue;

    meds.push({
      name: line,
      dosage: "",
      schedule: "",
    });
  }

  return { medications: meds };
}

export function mapOCRScheduleToOption(ocrText) {
  if (!ocrText || typeof ocrText !== "string") {
    return "Custom";
  }

  const text = ocrText.toLowerCase().trim();

  // Everyday patterns
  if (
    text.includes("everyday") ||
    text.includes("daily") ||
    text.includes("once a day") ||
    text.includes("once daily")
  ) {
    return "Everyday";
  }

  // As Needed patterns
  if (
    text.includes("as needed") ||
    text.includes("when required") ||
    text.includes("prn")
  ) {
    return "As Needed";
  }

  // Every Few Days / Interval patterns
  if (text.includes("every") && text.includes("days")) {
    return "Every Few Days";
  }

  // Specific days patterns
  if (
    text.includes("monday") ||
    text.includes("tuesday") ||
    text.includes("wednesday") ||
    text.includes("thursday") ||
    text.includes("friday") ||
    text.includes("saturday") ||
    text.includes("sunday")
  ) {
    return "Specific Days";
  }

  // Fallback
  return "Custom";
}

export function mapForm(raw) {
  const text = JSON.stringify(raw).toLowerCase();

  if (text.includes("tablet") || text.includes("tab")) return "Tablet";
  if (text.includes("capsule") || text.includes("cap")) return "Capsule";
  if (text.includes("syrup") || text.includes("ml")) return "Liquid";
  if (text.includes("injection") || text.includes("inj")) return "Injection";

  return ""; // fallback → user selects manually
}
