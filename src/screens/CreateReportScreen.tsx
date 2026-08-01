import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { crearReporte } from '../services/reporteService';
import { TipoDesastre } from '../types';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const TIPOS: { valor: TipoDesastre; emoji: string }[] = [
  { valor: 'Terremoto',         emoji: '🌋' },
  { valor: 'Inundación',        emoji: '🌧️' },
  { valor: 'Incendio Forestal', emoji: '🔥' },
  { valor: 'Huracán',           emoji: '🌀' },
  { valor: 'Deslizamiento',     emoji: '⛰️' },
  { valor: 'Tsunami',           emoji: '🌊' },
];

interface MediaItem { uri: string; tipo: 'foto' | 'video' }

export default function CreateReportScreen() {
  const navigation = useNavigation();
  const { usuario } = useAuth();

  const [titulo, setTitulo]       = useState('');
  const [descripcion, setDesc]    = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tipo, setTipo]           = useState<TipoDesastre | null>(null);
  const [enviando, setEnviando]   = useState(false);

  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [obtenGPS, setObtenGPS] = useState(false);

  const [media, setMedia] = useState<MediaItem[]>([]);

  // ── GPS ───────────────────────────────────────────────────────────
  const handleGetGPS = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para el reporte.');
      return;
    }
    setObtenGPS(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });

      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addr && !ubicacion.trim()) {
        const partes = [addr.street, addr.district, addr.city, addr.region].filter(Boolean);
        setUbicacion(partes.join(', '));
      }
    } catch {
      Alert.alert('Error GPS', 'No se pudo obtener la ubicación. Intenta de nuevo.');
    } finally {
      setObtenGPS(false);
    }
  };

  // ── Multimedia ────────────────────────────────────────────────────
  const handlePick = async (tipo: 'foto' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: tipo === 'foto'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: tipo === 'foto',
      quality: 0.8,
    });
    if (!result.canceled) {
      setMedia(prev => [...prev, { uri: result.assets[0].uri, tipo }]);
    }
  };

  const quitarMedia = (idx: number) => setMedia(prev => prev.filter((_, i) => i !== idx));

  // ── Enviar ────────────────────────────────────────────────────────
  const handleEnviar = async () => {
    if (!titulo.trim())      return Alert.alert('Campo requerido', 'Ingresa el título del reporte.');
    if (!ubicacion.trim())   return Alert.alert('Campo requerido', 'Ingresa la ubicación.');
    if (!descripcion.trim()) return Alert.alert('Campo requerido', 'Ingresa la descripción.');
    if (!tipo)               return Alert.alert('Campo requerido', 'Selecciona el tipo de incidente.');

    setEnviando(true);
    try {
      await crearReporte(
        titulo.trim(), descripcion.trim(), tipo, ubicacion.trim(),
        usuario!.id, usuario!.nombre,
        coords?.lat, coords?.lng,
      );
      Alert.alert(
        '¡Reporte enviado! ✅',
        `Alerta de "${tipo}" registrada en ${ubicacion}.`,
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error al enviar', e.message || 'No se pudo guardar el reporte.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Nuevo Reporte de Incidente</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Tipo de incidente ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>Tipo de Incidente</Text>
          </View>
          <View style={s.tiposGrid}>
            {TIPOS.map((t) => {
              const activo = tipo === t.valor;
              return (
                <TouchableOpacity
                  key={t.valor}
                  style={[s.tipoBtn, activo && s.tipoBtnActivo]}
                  onPress={() => setTipo(t.valor)}
                  activeOpacity={0.8}
                >
                  <Text style={s.tipoEmoji}>{t.emoji}</Text>
                  <Text style={[s.tipoLabel, activo && s.tipoLabelActivo]}>{t.valor}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Información ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>Información del Reporte</Text>
          </View>

          <Text style={s.inputLabel}>Título</Text>
          <TextInput
            style={s.input}
            placeholder="Describe brevemente el incidente"
            placeholderTextColor="#B0B8BC"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={100}
          />

          <Text style={s.inputLabel}>Dirección / Punto de referencia</Text>
          <TextInput
            style={s.input}
            placeholder="Ciudad, colonia, referencia cercana"
            placeholderTextColor="#B0B8BC"
            value={ubicacion}
            onChangeText={setUbicacion}
            maxLength={80}
          />

          <Text style={s.inputLabel}>Descripción detallada</Text>
          <TextInput
            style={s.textArea}
            placeholder="Describe lo que está ocurriendo: magnitud, afectados, daños observados..."
            placeholderTextColor="#B0B8BC"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={descripcion}
            onChangeText={setDesc}
            maxLength={500}
          />
        </View>

        {/* ── GPS ── */}
        <View style={s.card}>
          <View style={s.gpsHeaderRow}>
            <View style={s.sectionRow}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionText}>GPS</Text>
            </View>
            {coords && (
              <View style={s.gpsBadge}>
                <View style={s.gpsDot} />
                <Text style={s.gpsActive}>GPS ACTIVO</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={s.gpsBtn} onPress={handleGetGPS} disabled={obtenGPS} activeOpacity={0.85}>
            {obtenGPS
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.gpsBtnText}>📍  Obtener ubicación actual</Text>
            }
          </TouchableOpacity>

          {coords && (
            <View style={s.gpsResult}>
              <View style={s.miniMapWrapper}>
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude:      coords.lat,
                    longitude:     coords.lng,
                    latitudeDelta:  0.012,
                    longitudeDelta: 0.012,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} />
                </MapView>
              </View>
              <View style={s.gpsInfo}>
                <Text style={s.gpsInfoLabel}>Coordenadas obtenidas</Text>
                <Text style={s.gpsInfoVal}>{coords.lat.toFixed(6)}</Text>
                <Text style={s.gpsInfoVal}>{coords.lng.toFixed(6)}</Text>
                <Text style={s.gpsInfoSub}>Toca de nuevo para{'\n'}actualizar</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Evidencia Multimedia ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>Evidencia Multimedia</Text>
          </View>

          <View style={s.mediaRow}>
            {[
              { tipo: 'foto' as const,  icon: '📷', label: 'Foto' },
              { tipo: 'video' as const, icon: '🎥', label: 'Video' },
            ].map(({ tipo: t, icon, label }) => (
              <TouchableOpacity key={label} style={s.mediaBtn} onPress={() => handlePick(t)} activeOpacity={0.75}>
                <View style={s.mediaIconBox}>
                  <Text style={s.mediaEmoji}>{icon}</Text>
                </View>
                <Text style={s.mediaLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {media.length > 0 && (
            <View style={s.previewRow}>
              {media.map((m, i) => (
                <View key={i} style={s.previewItem}>
                  {m.tipo === 'foto'
                    ? <Image source={{ uri: m.uri }} style={s.previewImg} resizeMode="cover" />
                    : (
                      <View style={s.previewVideo}>
                        <Text style={s.previewVideoIcon}>🎥</Text>
                      </View>
                    )
                  }
                  <TouchableOpacity style={s.previewRemove} onPress={() => quitarMedia(i)}>
                    <Text style={s.previewRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Botón enviar ── */}
        <TouchableOpacity style={s.enviarBtn} onPress={handleEnviar} activeOpacity={0.85} disabled={enviando}>
          {enviando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.enviarText}>Enviar Reporte</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F8' },

  header: {
    backgroundColor: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 50,
    paddingBottom: 14,
  },
  backBtn:     { padding: 6, marginRight: 2 },
  backIcon:    { fontSize: 22, color: TITULO, fontWeight: '700' },
  logo:        { width: 32, height: 32 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  scroll: { padding: 14, paddingBottom: 52 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionText:   { fontSize: 14, fontWeight: '700', color: TITULO },

  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoBtn: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    backgroundColor: '#F8FAFB',
    gap: 4,
  },
  tipoBtnActivo:   { borderColor: BUTTON, backgroundColor: BUTTON + '18' },
  tipoEmoji:       { fontSize: 22 },
  tipoLabel:       { fontSize: 11, fontWeight: '600', color: TEXT, textAlign: 'center' },
  tipoLabelActivo: { color: BUTTON },

  inputLabel: { fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TITULO,
    backgroundColor: '#FAFBFC',
    marginBottom: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    color: TITULO,
    backgroundColor: '#FAFBFC',
    height: 120,
  },

  gpsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gpsBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  gpsDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60' },
  gpsActive:    { fontSize: 11, fontWeight: '700', color: '#27AE60' },
  gpsBtn: {
    backgroundColor: BUTTON,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  gpsResult:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  miniMapWrapper: { width: 100, height: 88, borderRadius: 10, overflow: 'hidden' },
  gpsInfo:        { flex: 1 },
  gpsInfoLabel:   { fontSize: 11, fontWeight: '600', color: TEXT, marginBottom: 4 },
  gpsInfoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: TITULO,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsInfoSub: { fontSize: 11, color: TEXT, fontStyle: 'italic', marginTop: 6, lineHeight: 16 },

  mediaRow:     { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  mediaBtn:     { alignItems: 'center', gap: 8 },
  mediaIconBox: {
    width: 80, height: 80,
    backgroundColor: '#F5F7F8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaEmoji: { fontSize: 32 },
  mediaLabel: { fontSize: 12, fontWeight: '600', color: TEXT },

  previewRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  previewItem:      { width: 72, height: 72, borderRadius: 10, overflow: 'hidden' },
  previewImg:       { width: '100%', height: '100%' },
  previewVideo:     { width: '100%', height: '100%', backgroundColor: '#0E3A44', alignItems: 'center', justifyContent: 'center' },
  previewVideoIcon: { fontSize: 28 },
  previewRemove: {
    position: 'absolute', top: 3, right: 3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  enviarBtn: {
    backgroundColor: BUTTON,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: BUTTON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  enviarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
