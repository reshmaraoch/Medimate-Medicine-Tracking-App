/* eslint-disable no-unused-vars */
import { ref } from "vue";
import {
  parseUniversalPrescription,
  fallbackParseLinesToMeds,
} from "@/ocr/RxParser";
import { runOCROnImage } from "@/ocr/OCREngine";

export function usePrescriptionOCR() {
  const ocrResults = ref([]);
  const loading = ref(false);
  const error = ref(null);

  //   async function scanImage(image) {
  //     loading.value = true;
  //     error.value = null;
  //     ocrResults.value = [];

  //     try {
  //       const text = await runOCROnImage(image);

  //       let meds = parseUniversalPrescription(text);
  //       if (!meds || meds.length === 0) {
  //         meds = fallbackParseLinesToMeds(text);
  //       }

  //       ocrResults.value = meds.map((m, index) => ({
  //         id: index,
  //         name: m.name || "",
  //         dosage: m.dosage || "",
  //         schedule: m.schedule || "",
  //         raw: m,
  //       }));
  //     } catch (e) {
  //       console.error(e);
  //       error.value = "OCR failed. Please try again.";
  //     } finally {
  //       loading.value = false;
  //     }
  //   }
  // async function scanImage(image) {
  //   loading.value = true;
  //   error.value = null;
  //   ocrResults.value = [];

  //   try {
  //     const text = await runOCROnImage(image);

  //     let parsed = parseUniversalPrescription(text);

  //     // Fallback if needed
  //     if ((!parsed || !Array.isArray(parsed.medications)) && text) {
  //       parsed = fallbackParseLinesToMeds(text);
  //     }

  //     // 🔑 NORMALIZATION STEP
  //     const medsArray = Array.isArray(parsed)
  //       ? parsed
  //       : parsed?.medications || [];

  //     ocrResults.value = medsArray.map((m, index) => ({
  //       id: index,
  //       name: m.name || "",
  //       dosage: m.dosage || "",
  //       schedule: m.schedule || "",
  //       raw: m,
  //     }));
  //   } catch (e) {
  //     console.error(e);
  //     error.value = "OCR failed. Please try again.";
  //   } finally {
  //     loading.value = false;
  //   }
  // }
  const noResults = ref(false);

  async function scanImage(source) {
    loading.value = true;
    error.value = null;
    noResults.value = false;
    ocrResults.value = [];

    try {
      const rawText = await runOCROnImage(source);
      const parsed = parseUniversalPrescription(rawText);

      if (!parsed.medications || parsed.medications.length === 0) {
        noResults.value = true;
        return;
      }

      ocrResults.value = parsed.medications;
    } catch (e) {
      error.value = "Failed to scan prescription.";
    } finally {
      loading.value = false;
    }
  }

  function clearResults() {
    ocrResults.value = [];
  }

  return {
    ocrResults,
    loading,
    error,
    noResults,
    scanImage,
    clearResults,
  };
}
