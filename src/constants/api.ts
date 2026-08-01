import Constants from 'expo-constants';

// Si se define EXPO_PUBLIC_API_URL (ej. la URL de Render en producción),
// esa tiene prioridad. Si no, en desarrollo con Expo Go se auto-detecta
// la IP local desde hostUri ("192.168.x.x:8081") y se apunta al puerto
// 5000 del backend Flask corriendo en tu máquina.
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }
  return 'http://localhost:5000';
}

export const BASE_URL = resolveBaseUrl();
