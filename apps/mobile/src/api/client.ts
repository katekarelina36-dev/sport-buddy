import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, UploadType } from "expo-file-system";

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
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// F5/F1: uploads a picked photo to POST /profile/me/photo (multipart field
// "photo") using expo-file-system's File.upload — the officially supported
// way to upload a local file under Expo SDK 57. Two earlier approaches both
// failed under this SDK: fetch(uri).blob() as a raw body corrupted the image
// bytes, and manually building a FormData with a {uri,name,type} part threw
// "Unsupported FormData part implementation" (that RN shorthand isn't
// supported by Expo's newer fetch/FormData polyfill).
export async function uploadPhoto(localUri: string, path: string = "/profile/me/photo"): Promise<{ photoUrl: string }> {
  const token = await getToken();
  const file = new File(localUri);
  const result = await file.upload(`${API_URL}${path}`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "photo",
    mimeType: "image/jpeg",
    headers: {
      ...NGROK_SKIP_HEADER,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`${result.status} photo upload: ${result.body}`);
  }
  return JSON.parse(result.body);
}

export const API_BASE_URL = API_URL;
