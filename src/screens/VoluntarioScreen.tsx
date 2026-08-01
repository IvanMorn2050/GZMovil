import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import {
  actualizarUbicacionVolApi,
  actualizarEstadoAsignApi,
  agregarEvidenciaApi,
  getEvidenciasApi,
  getMisAsignacionesApi,
  getSolicitudesVolApi,
  responderSolicitudApi,
  uploadMediaApi,
} from '../services/authService';
import { AsignacionVoluntario, EvidenciaAsignacion, SolicitudVoluntario } from '../types';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const PRIO_COLOR: Record<string, string> = {
  Alta:  '#E74C3C',
  Media: '#E67E22',
  Baja:  '#27AE60',
};

const ESTADO_COLOR: Record<string, string> = {
  Pendiente:  '#3498DB',
  En_camino:  '#E67E22',
  Atendiendo: '#E74C3C',
  Finalizada: '#27AE60',
};

const ESTADO_LABEL: Record<string, string> = {
  Pendiente:  'Asignado',
  En_camino:  'En camino',
  Atendiendo: 'Atendiendo',
  Finalizada: 'Finalizado',
};

const ESTADO_BTN: Record<string, { label: string; next: string }> = {
  Pendiente:  { label: '🚗 Salir al incidente', next: 'En_camino' },
  En_camino:  { label: '🔧 Comenzar atención',  next: 'Atendiendo' },
  Atendiendo: { label: '✅ Finalizar',           next: 'Finalizada' },
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function VoluntarioScreen() {
  const navigation   = useNavigation<any>();
  const { usuario }  = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'tareas'>('solicitudes');

  // Data
  const [solicitudes, setSolicitudes]   = useState<SolicitudVoluntario[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionVoluntario[]>([]);

  // Loading / refreshing
  const [cargandoSol,   setCargandoSol]   = useState(true);
  const [cargandoAsig,  setCargandoAsig]  = useState(true);
  const [refreshingSol, setRefreshingSol] = useState(false);
  const [refreshingAsig, setRefreshingAsig] = useState(false);

  // Location sharing
  const [compartirUbic, setCompartirUbic] = useState(false);
  const [ubicActiva,    setUbicActiva]    = useState(false);

  // Per-card loading states
  const [respondiendo, setRespondiendo]     = useState<Record<number, 'aceptar' | 'rechazar' | null>>({});
  const [actualizandoEstado, setActEstado]  = useState<number | null>(null);

  // Evidence
  const [expandedEvid,   setExpandedEvid]   = useState<number | null>(null);
  const [evidTexto,      setEvidTexto]       = useState('');
  const [evidFoto,       setEvidFoto]        = useState<{ uri: string; url: string; filename: string } | null>(null);
  const [subiendoEvFoto, setSubiendoEvFoto] = useState(false);
  const [enviandoEvid,   setEnviandoEvid]   = useState(false);
  const [evidencias,     setEvidencias]      = useState<Record<number, EvidenciaAsignacion[]>>({});
  const [loadingEvid,    setLoadingEvid]     = useState<number | null>(null);

  // Notification tracking
  const prevSolCount = useRef(0);

  // ── Data loaders ─────────────────────────────────────────────────

  const cargarSolicitudes = useCallback(async (silent = false) => {
    if (!silent) setCargandoSol(true);
    try {
      const data = await getSolicitudesVolApi();
      const list = data.solicitudes ?? [];
      setSolicitudes(list);

      // "Notification": alert when new solicitudes appear
      if (silent && list.length > prevSolCount.current && prevSolCount.current >= 0) {
        const nuevas = list.length - prevSolCount.current;
        Alert.alert(
          '🚨 Nueva solicitud de emergencia',
          `Hay ${nuevas} nueva${nuevas > 1 ? 's' : ''} solicitud${nuevas > 1 ? 'es' : ''} de ayuda cerca de ti.`,
          [{ text: 'Ver ahora', onPress: () => setActiveTab('solicitudes') }, { text: 'OK' }],
        );
      }
      prevSolCount.current = list.length;
    } catch {
      // silent fail
    } finally {
      setCargandoSol(false);
      setRefreshingSol(false);
    }
  }, []);

  const cargarAsignaciones = useCallback(async (silent = false) => {
    if (!silent) setCargandoAsig(true);
    try {
      const data = await getMisAsignacionesApi();
      setAsignaciones(data.asignaciones ?? []);
    } catch {
      // silent fail
    } finally {
      setCargandoAsig(false);
      setRefreshingAsig(false);
    }
  }, []);

  // Poll on focus + every 60 seconds
  useFocusEffect(
    useCallback(() => {
      cargarSolicitudes();
      cargarAsignaciones();
      const interval = setInterval(() => cargarSolicitudes(true), 60000);
      return () => clearInterval(interval);
    }, [cargarSolicitudes, cargarAsignaciones]),
  );

  // Poll when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') cargarSolicitudes(true);
    });
    return () => sub.remove();
  }, [cargarSolicitudes]);

  // Badge count on tab icon
  useEffect(() => {
    navigation.setOptions({
      tabBarBadge: solicitudes.length > 0 ? solicitudes.length : undefined,
    });
  }, [solicitudes, navigation]);

  // ── Location sharing ────────────────────────────────────────────

  const handleCompartirUbicacion = async (value: boolean) => {
    setCompartirUbic(value);
    if (!value) { setUbicActiva(false); return; }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
      setCompartirUbic(false);
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await actualizarUbicacionVolApi(pos.coords.latitude, pos.coords.longitude);
      setUbicActiva(true);
      cargarSolicitudes(true); // refresh with distance
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo obtener la ubicación.');
      setCompartirUbic(false);
    }
  };

  // ── Solicitud handlers ──────────────────────────────────────────

  const handleResponder = async (reporteId: number, respuesta: 'aceptar' | 'rechazar') => {
    setRespondiendo((p) => ({ ...p, [reporteId]: respuesta }));
    try {
      const res = await responderSolicitudApi(reporteId, respuesta);
      Alert.alert(respuesta === 'aceptar' ? '¡Asignado!' : 'Rechazado', res.message);
      await Promise.all([cargarSolicitudes(true), cargarAsignaciones(true)]);
      if (respuesta === 'aceptar') setActiveTab('tareas');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo procesar la solicitud.');
    } finally {
      setRespondiendo((p) => ({ ...p, [reporteId]: null }));
    }
  };

  // ── Assignment / estado handlers ────────────────────────────────

  const handleAvanzarEstado = async (asig: AsignacionVoluntario) => {
    const btn = ESTADO_BTN[asig.estado];
    if (!btn) return;
    Alert.alert(
      'Confirmar cambio de estado',
      `¿Cambiar a "${ESTADO_LABEL[btn.next]}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActEstado(asig.id);
            try {
              await actualizarEstadoAsignApi(asig.id, btn.next);
              await cargarAsignaciones(true);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo actualizar el estado.');
            } finally {
              setActEstado(null);
            }
          },
        },
      ],
    );
  };

  // ── Evidence handlers ───────────────────────────────────────────

  const handleToggleEvid = async (asigId: number) => {
    if (expandedEvid === asigId) {
      setExpandedEvid(null);
      setEvidTexto('');
      setEvidFoto(null);
      return;
    }
    setExpandedEvid(asigId);
    setEvidTexto('');
    setEvidFoto(null);
    // Load evidence for this assignment
    setLoadingEvid(asigId);
    try {
      const data = await getEvidenciasApi(asigId);
      setEvidencias((prev) => ({ ...prev, [asigId]: data.evidencias ?? [] }));
    } catch {
      // silent
    } finally {
      setLoadingEvid(null);
    }
  };

  const handlePickEvidFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setSubiendoEvFoto(true);
    try {
      const { url, filename } = await uploadMediaApi(result.assets[0].uri);
      setEvidFoto({ uri: result.assets[0].uri, url, filename });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendoEvFoto(false);
    }
  };

  const handleEnviarEvidencia = async (asigId: number) => {
    if (!evidTexto.trim() && !evidFoto) return;
    setEnviandoEvid(true);
    try {
      await agregarEvidenciaApi(asigId, evidTexto.trim() || undefined, evidFoto?.url);
      Alert.alert('✅ Evidencia registrada', 'La evidencia quedó guardada en el historial del incidente.');
      setEvidTexto('');
      setEvidFoto(null);
      // Reload evidencias
      const data = await getEvidenciasApi(asigId);
      setEvidencias((prev) => ({ ...prev, [asigId]: data.evidencias ?? [] }));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la evidencia.');
    } finally {
      setEnviandoEvid(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderSolicitud = (sol: SolicitudVoluntario) => {
    const prioColor = PRIO_COLOR[sol.prioridad] ?? TEXT;
    const acAcept   = respondiendo[sol.id] === 'aceptar';
    const acRech    = respondiendo[sol.id] === 'rechazar';

    return (
      <View key={sol.id} style={s.card}>
        {/* Header row */}
        <View style={s.cardHeaderRow}>
          <Text style={s.cardEmoji}>{sol.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitulo} numberOfLines={1}>{sol.titulo}</Text>
            <Text style={s.cardMeta}>{sol.tipo_desastre}</Text>
          </View>
          <View style={[s.prioBadge, { backgroundColor: prioColor + '22' }]}>
            <Text style={[s.prioText, { color: prioColor }]}>{sol.prioridad}</Text>
          </View>
        </View>

        {/* Info rows */}
        {sol.direccion_texto ? (
          <Text style={s.cardDir} numberOfLines={1}>📍 {sol.direccion_texto}</Text>
        ) : null}

        <View style={s.cardMetaRow}>
          {sol.distancia_km !== null && (
            <Text style={s.cardDistancia}>📡 {sol.distancia_km} km</Text>
          )}
          <Text style={s.cardFecha}>{tiempoRelativo(sol.creado_en)}</Text>
          {sol.voluntarios_asignados > 0 && (
            <Text style={s.cardVolAsig}>🤝 {sol.voluntarios_asignados} vol.</Text>
          )}
        </View>

        <Text style={s.cardDesc} numberOfLines={2}>{sol.descripcion}</Text>
        <Text style={s.cardReportadoPor}>Reportado por: {sol.reportado_por}</Text>

        {/* Action buttons */}
        <View style={s.solBtns}>
          <TouchableOpacity
            style={[s.rechazarBtn, acRech && s.btnLoading]}
            onPress={() => handleResponder(sol.id, 'rechazar')}
            disabled={!!respondiendo[sol.id]}
            activeOpacity={0.8}
          >
            {acRech
              ? <ActivityIndicator color="#E74C3C" size="small" />
              : <Text style={s.rechazarText}>✗  Rechazar</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.aceptarBtn, acAcept && s.btnLoading]}
            onPress={() => handleResponder(sol.id, 'aceptar')}
            disabled={!!respondiendo[sol.id]}
            activeOpacity={0.85}
          >
            {acAcept
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.aceptarText}>✓  Aceptar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAsignacion = (asig: AsignacionVoluntario) => {
    const estadoColor = ESTADO_COLOR[asig.estado] ?? TEXT;
    const btn         = ESTADO_BTN[asig.estado];
    const expandido   = expandedEvid === asig.id;
    const evids       = evidencias[asig.id] ?? [];
    const isUpdating  = actualizandoEstado === asig.id;

    return (
      <View key={asig.id} style={s.card}>
        {/* Header */}
        <View style={s.cardHeaderRow}>
          <Text style={s.cardEmoji}>{asig.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitulo} numberOfLines={1}>{asig.titulo}</Text>
            <Text style={s.cardMeta}>{asig.tipo_desastre}</Text>
          </View>
          <View style={[s.estadoBadge, { backgroundColor: estadoColor + '22' }]}>
            <Text style={[s.estadoText, { color: estadoColor }]}>{ESTADO_LABEL[asig.estado]}</Text>
          </View>
        </View>

        {asig.direccion_texto ? (
          <Text style={s.cardDir} numberOfLines={1}>📍 {asig.direccion_texto}</Text>
        ) : null}
        <Text style={s.cardFecha}>Actualizado {tiempoRelativo(asig.actualizado_en)}</Text>

        {/* Avanzar estado */}
        {btn && (
          <TouchableOpacity
            style={[s.estadoBtn, { borderColor: estadoColor }, isUpdating && s.btnLoading]}
            onPress={() => handleAvanzarEstado(asig)}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {isUpdating
              ? <ActivityIndicator color={estadoColor} size="small" />
              : <Text style={[s.estadoBtnText, { color: estadoColor }]}>{btn.label}</Text>
            }
          </TouchableOpacity>
        )}

        {/* Evidence toggle */}
        <TouchableOpacity
          style={s.evidToggleBtn}
          onPress={() => handleToggleEvid(asig.id)}
          activeOpacity={0.8}
        >
          <Text style={s.evidToggleText}>
            {expandido ? '▲ Cerrar historial' : `📋 Historial y evidencias (${evids.length})`}
          </Text>
        </TouchableOpacity>

        {/* Evidence expanded section */}
        {expandido && (
          <View style={s.evidSection}>
            {/* Previous evidencias */}
            {loadingEvid === asig.id ? (
              <ActivityIndicator color={BUTTON} style={{ marginVertical: 8 }} />
            ) : evids.length === 0 ? (
              <Text style={s.evidEmpty}>Sin evidencias registradas aún.</Text>
            ) : (
              evids.map((ev) => (
                <View key={ev.id} style={s.evidItem}>
                  <Text style={s.evidFecha}>{tiempoRelativo(ev.creado_en)}</Text>
                  {ev.contenido ? <Text style={s.evidContenido}>{ev.contenido}</Text> : null}
                  {ev.foto_url ? (
                    <View style={s.evidFotoContainer}>
                      <Image source={{ uri: ev.foto_url }} style={s.evidFotoImg} resizeMode="cover" />
                    </View>
                  ) : null}
                </View>
              ))
            )}

            <View style={s.evidDivider} />
            <Text style={s.evidNuevaLabel}>Agregar nueva evidencia</Text>

            {/* New evidence form */}
            <TextInput
              style={s.evidInput}
              value={evidTexto}
              onChangeText={setEvidTexto}
              placeholder="Describe lo que encontraste o las acciones realizadas..."
              placeholderTextColor="#B0B8BC"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />

            {/* Photo adjunto */}
            {evidFoto ? (
              <View style={s.evidFotoPreview}>
                <Image source={{ uri: evidFoto.uri }} style={s.evidFotoPreviewImg} />
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={s.evidFotoNombre} numberOfLines={2}>{evidFoto.filename}</Text>
                  <TouchableOpacity onPress={() => setEvidFoto(null)}>
                    <Text style={s.evidFotoQuitar}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={s.evidPickFotoBtn}
                onPress={handlePickEvidFoto}
                disabled={subiendoEvFoto}
                activeOpacity={0.8}
              >
                {subiendoEvFoto
                  ? <ActivityIndicator color={BUTTON} size="small" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Image source={require('../../assets/camara.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                      <Text style={s.evidPickFotoText}>Adjuntar foto</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.evidEnviarBtn, (!evidTexto.trim() && !evidFoto) && s.evidEnviarBtnDisabled]}
              onPress={() => handleEnviarEvidencia(asig.id)}
              disabled={enviandoEvid || (!evidTexto.trim() && !evidFoto)}
              activeOpacity={0.85}
            >
              {enviandoEvid
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.evidEnviarText}>Guardar evidencia</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────

  const isVol = usuario?.rol === 'voluntario' || usuario?.rol === 'coordinador';

  if (!isVol) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, color: TEXT, textAlign: 'center', lineHeight: 22 }}>
          Esta sección es exclusiva para voluntarios y coordinadores.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Panel de Voluntario</Text>
        </View>
      </View>

      {/* Location share row */}
      <View style={s.locationRow}>
        <View style={s.locationLeft}>
          <Text style={s.locationLabel}>Compartir ubicación</Text>
          {ubicActiva && <Text style={s.locationActive}>📍 Activa — te asignaremos incidentes cercanos</Text>}
        </View>
        <Switch
          value={compartirUbic}
          onValueChange={handleCompartirUbicacion}
          trackColor={{ false: DIVIDER, true: BUTTON + '88' }}
          thumbColor={compartirUbic ? BUTTON : '#fff'}
        />
      </View>

      {/* Tab pills */}
      <View style={s.tabPills}>
        <TouchableOpacity
          style={[s.tabPill, activeTab === 'solicitudes' && s.tabPillActive]}
          onPress={() => setActiveTab('solicitudes')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabPillText, activeTab === 'solicitudes' && s.tabPillTextActive]}>
            Solicitudes {solicitudes.length > 0 ? `(${solicitudes.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabPill, activeTab === 'tareas' && s.tabPillActive]}
          onPress={() => setActiveTab('tareas')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabPillText, activeTab === 'tareas' && s.tabPillTextActive]}>
            Mis Tareas {asignaciones.filter(a => a.estado !== 'Finalizada').length > 0
              ? `(${asignaciones.filter(a => a.estado !== 'Finalizada').length})`
              : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB: Solicitudes ── */}
      {activeTab === 'solicitudes' && (
        cargandoSol ? (
          <View style={s.centered}><ActivityIndicator size="large" color={BUTTON} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingSol}
                onRefresh={() => { setRefreshingSol(true); cargarSolicitudes(true); }}
                tintColor={BUTTON}
              />
            }
          >
            {solicitudes.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>🙌</Text>
                <Text style={s.emptyTitle}>Sin solicitudes pendientes</Text>
                <Text style={s.emptyDesc}>
                  No hay incidentes activos cerca de ti por el momento. Activa tu ubicación para
                  recibir solicitudes cercanas.
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.listHint}>
                  {ubicActiva ? 'Ordenados por distancia · ' : ''}{solicitudes.length} incidente{solicitudes.length !== 1 ? 's' : ''} activo{solicitudes.length !== 1 ? 's' : ''}
                </Text>
                {solicitudes.map(renderSolicitud)}
              </>
            )}
          </ScrollView>
        )
      )}

      {/* ── TAB: Mis Tareas ── */}
      {activeTab === 'tareas' && (
        cargandoAsig ? (
          <View style={s.centered}><ActivityIndicator size="large" color={BUTTON} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshingAsig}
                onRefresh={() => { setRefreshingAsig(true); cargarAsignaciones(true); }}
                tintColor={BUTTON}
              />
            }
          >
            {asignaciones.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>✅</Text>
                <Text style={s.emptyTitle}>Sin tareas asignadas</Text>
                <Text style={s.emptyDesc}>
                  Acepta una solicitud de emergencia para verla aquí y gestionar tu intervención.
                </Text>
              </View>
            ) : (
              asignaciones.map(renderAsignacion)
            )}
          </ScrollView>
        )
      )}

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F8' },

  header: {
    backgroundColor: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
  },
  logo:        { width: 36, height: 36 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  locationLeft:   { flex: 1, marginRight: 12 },
  locationLabel:  { fontSize: 13, fontWeight: '600', color: TITULO },
  locationActive: { fontSize: 11, color: BUTTON, marginTop: 2 },

  tabPills: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#F5F7F8',
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabPillActive:     { backgroundColor: BUTTON, borderColor: BUTTON },
  tabPillText:       { fontSize: 13, fontWeight: '600', color: TEXT },
  tabPillTextActive: { color: '#fff' },

  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 14, paddingBottom: 40 },

  listHint: { fontSize: 12, color: TEXT, marginBottom: 10, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TITULO, marginBottom: 8 },
  emptyDesc:  { fontSize: 13, color: TEXT, textAlign: 'center', lineHeight: 20 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardEmoji:     { fontSize: 24, lineHeight: 28 },
  cardTitulo:    { fontSize: 14, fontWeight: '700', color: TITULO },
  cardMeta:      { fontSize: 11, color: TEXT, marginTop: 2 },
  cardDir:       { fontSize: 12, color: TEXT, marginBottom: 4 },
  cardDesc:      { fontSize: 13, color: TEXT, lineHeight: 18, marginBottom: 6 },
  cardReportadoPor: { fontSize: 11, color: TEXT, fontStyle: 'italic', marginBottom: 10 },

  cardMetaRow:    { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  cardDistancia:  { fontSize: 12, color: BUTTON, fontWeight: '600' },
  cardFecha:      { fontSize: 12, color: TEXT },
  cardVolAsig:    { fontSize: 12, color: TEXT },

  prioBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  prioText:   { fontSize: 11, fontWeight: '700' },
  estadoBadge:{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  estadoText: { fontSize: 11, fontWeight: '700' },

  // Solicitud buttons
  solBtns:    { flexDirection: 'row', gap: 10 },
  rechazarBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E74C3C', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  rechazarText: { fontSize: 13, fontWeight: '600', color: '#E74C3C' },
  aceptarBtn: {
    flex: 1, backgroundColor: BUTTON, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  aceptarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnLoading:  { opacity: 0.6 },

  // Estado button
  estadoBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  estadoBtnText: { fontSize: 13, fontWeight: '700' },

  // Evidence toggle
  evidToggleBtn:  { marginTop: 10, paddingVertical: 6 },
  evidToggleText: { fontSize: 12, fontWeight: '600', color: BUTTON },

  // Evidence section
  evidSection:  { marginTop: 8, borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 12 },
  evidItem:     { marginBottom: 12, padding: 10, backgroundColor: '#F5F7F8', borderRadius: 8 },
  evidFecha:    { fontSize: 11, color: TEXT, marginBottom: 4 },
  evidContenido:{ fontSize: 13, color: TITULO },
  evidFotoContainer: { marginTop: 8, borderRadius: 8, overflow: 'hidden' },
  evidFotoImg:  { width: '100%', height: 120 },
  evidEmpty:    { fontSize: 13, color: TEXT, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  evidDivider:  { height: 1, backgroundColor: DIVIDER, marginVertical: 12 },
  evidNuevaLabel: { fontSize: 13, fontWeight: '700', color: TITULO, marginBottom: 8 },
  evidInput: {
    borderWidth: 1, borderColor: DIVIDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: TITULO, backgroundColor: '#FAFBFC',
    minHeight: 80, textAlignVertical: 'top',
    marginBottom: 8,
  },
  evidPickFotoBtn: {
    borderWidth: 1.5, borderColor: BUTTON, borderStyle: 'dashed',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 10,
  },
  evidPickFotoText: { fontSize: 12, fontWeight: '600', color: BUTTON },
  evidFotoPreview: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: DIVIDER,
    marginBottom: 10,
  },
  evidFotoPreviewImg: { width: 60, height: 60 },
  evidFotoNombre:     { fontSize: 12, color: TITULO, fontWeight: '600', marginBottom: 4 },
  evidFotoQuitar:     { fontSize: 12, color: '#E74C3C', fontWeight: '600' },
  evidEnviarBtn: {
    backgroundColor: BUTTON, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  evidEnviarBtnDisabled: { backgroundColor: BUTTON + '55' },
  evidEnviarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
