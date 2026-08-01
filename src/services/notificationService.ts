/**
 * NotificationService — in-app alert + alert.mp3 sound.
 *
 * Usage:
 *   notificationService.start(usuario)  — call after login
 *   notificationService.stop()          — call on logout
 *
 * Every 60 s polls /api/reportes/cercanos with the user's GPS location.
 * When new nearby reports appear it shows an Alert and plays alert.mp3.
 */

import { Alert }    from 'react-native';
import * as Location from 'expo-location';
import { Audio }    from 'expo-av';
import { apiFetch } from './api';
import { Usuario }  from '../types';

// ── Private state ─────────────────────────────────────────────────────
let _pollingInterval: ReturnType<typeof setInterval> | null = null;
let _initialTimeout:  ReturnType<typeof setTimeout>  | null = null;
let _sound:           any                                   = null;
let _lastCheckISO:    string = new Date().toISOString();

// ── Helpers ───────────────────────────────────────────────────────────

async function _playAlertSound(): Promise<void> {
  try {
    if (_sound) {
      await _sound.unloadAsync();
      _sound = null;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../assets/alert.mp3'),
      { shouldPlay: true, volume: 1.0 },
    );
    _sound = sound;
    _sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status?.didJustFinish) {
        _sound?.unloadAsync();
        _sound = null;
      }
    });
  } catch (err) {
    console.warn('[Notifications] sound error:', err);
  }
}

async function _checkNearbyReports(usuario: Usuario): Promise<void> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude: lat, longitude: lng } = pos.coords;

    const since   = _lastCheckISO;
    _lastCheckISO = new Date().toISOString();

    const data = await apiFetch<{ reportes: any[] }>(
      `/api/reportes/cercanos?lat=${lat}&lng=${lng}&radio=10&desde=${encodeURIComponent(since)}`,
      { auth: true },
    );

    const list: any[] = data.reportes ?? [];
    if (list.length === 0) return;

    const esVol = usuario.rol === 'voluntario' || usuario.rol === 'coordinador';
    const first = list[0];
    const count = list.length;

    const title = esVol
      ? '🚨 Nueva emergencia cercana'
      : '⚠️ Alerta en tu zona';

    const body = esVol
      ? `${first.tipo_desastre}: "${first.titulo}" — a ${first.distancia_km} km.`
        + (count > 1 ? ` (+${count - 1} más)` : '')
        + ' ¡Tu apoyo es necesario!'
      : `Incidente a ${first.distancia_km} km: ${first.titulo}. Toma precauciones.`
        + (count > 1 ? ` (+${count - 1} reportes cercanos)` : '');

    await _playAlertSound();
    Alert.alert(title, body);
  } catch (err) {
    console.warn('[Notifications] poll error:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────

export const notificationService = {

  /** Start polling for nearby reports. Call after login. */
  start(usuario: Usuario): void {
    notificationService.stop();
    _lastCheckISO   = new Date().toISOString();
    _initialTimeout = setTimeout(() => _checkNearbyReports(usuario), 10_000);
    _pollingInterval = setInterval(() => _checkNearbyReports(usuario), 60_000);
  },

  /** Stop polling and release audio. Call on logout. */
  stop(): void {
    if (_initialTimeout)  { clearTimeout(_initialTimeout);  _initialTimeout  = null; }
    if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null; }
    if (_sound)           { _sound.unloadAsync().catch(() => {}); _sound = null; }
  },
};
