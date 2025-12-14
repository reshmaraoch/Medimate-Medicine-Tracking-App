import { ref } from "vue";

const toastApi = ref(null);

export function registerToast(api) {
  toastApi.value = api; // api is what useToast() returns
}

export function showToast(options) {
  toastApi.value?.add(options);
}
