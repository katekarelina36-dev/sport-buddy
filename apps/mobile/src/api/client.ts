import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "sport-buddy/token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// Free ngrok tunnels show an HTML "you're about to visit..." interstitial to
// anonymous-looking requests (very noticeable for plain <Image> loads, which
// don't look like an API client) instead of proxying through — this header
// disables that. Harmless / ignored by a real production host.
const NGROK_SKIP_HEADER = { "ngrok-skip-browser-warning": "true" };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...NGROK_SKIP_HEADER,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};

// F5/F1: uploads a picked photo to POST /profile/me/photo as multipart form
// data (field "photo") — the standard, reliable way to send a file from a
// React Native URI. An earlier version fetched the local URI into a Blob and
// sent that as a raw request body, which silently corrupted the image bytes
// under Expo SDK 57's fetch implementation (Blob round-tripped between two
// separate fetch() calls is not reliable there).
export async function uploadPhoto(localUri: string): Promise<{ photoUrl: string }> {
  const token = await getToken();
  const formData = new FormData();
  // React Native's fetch/FormData accepts this {uri,name,type} object shape
  // in place of a real Blob/File — the native layer reads the file directly.
  formData.append("photo", {
    uri: localUri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/profile/me/photo`, {
    method: "POST",
    headers: {
      // No Content-Type here: fetch sets the multipart boundary itself for FormData bodies.
      ...NGROK_SKIP_HEADER,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} photo upload: ${text}`);
  }
  return res.json();
}

export const API_BASE_URL = API_URL;
