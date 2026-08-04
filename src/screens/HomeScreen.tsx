import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { getHomeStatsApi } from '../services/authService';
import { getDesastreImg, SIMBOLOGIA } from '../constants/desastres';

// Querétaro capital — se usa solo como respaldo si no hay permiso/ubicación GPS
const REGION_DEFAULT = {
  latitude:      20.5888,
  longitude:    -100.3899,
  latitudeDelta:  0.08,
  longitudeDelta: 0.08,
};

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const NIVEL_COLOR: Record<string, string> = {
  Evacuacion:  '#E74C3C',
  Precaucion:  '#E67E22',
  Informativa: '#3498DB',
};

interface HomeStats {
  total_activos:       number;
  total_reportes:      number;
  voluntarios_activos: number;
  albergues_activos:   number;
  reportes_por_tipo:   { nombre: string; emoji: string; total: number; pct: number }[];
  alertas_recientes:   { titulo: string; nivel: string; zona: string; creado_en: string }[];
  marcadores:          { latitud: number; longitud: number; emoji: string }[];
}

const DEFAULT_STATS: HomeStats = {
  total_activos: 0, total_reportes: 0,
  voluntarios_activos: 0, albergues_activos: 0,
  reportes_por_tipo: [], alertas_recientes: [], marcadores: [],
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function SectionTitle({ text }: { text: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <View style={s.sectionTitleAccent} />
      <Text style={s.sectionTitleText}>{text}</Text>
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const [stats,     setStats]     = useState<HomeStats>(DEFAULT_STATS);
  const [cargando,  setCargando]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCargando(true);
    try {
      const data = await getHomeStatsApi();
      setStats(data);
    } catch {
      // mantiene los defaults si falla
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Centra el mapa en la ubicación aproximada del usuario al abrir la pantalla
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        mapRef.current?.animateToRegion({
          latitude:      pos.coords.latitude,
          longitude:     pos.coords.longitude,
          latitudeDelta:  0.08,
          longitudeDelta: 0.08,
        }, 600);
      } catch {
        // se queda con la región por defecto (Querétaro)
      }
    })();
  }, []);

  const onRefresh = () => { setRefreshing(true); cargar(true); };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Panorámica Nacional de Incidentes</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BUTTON} />}
      >
        {/* ── Mapa ── */}
        <Card>
          <SectionTitle text="Mapa de Incidentes Cercanos" />
          <View style={s.mapRow}>
            <View style={s.mapWrapper}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={REGION_DEFAULT}
                showsUserLocation
                showsMyLocationButton
                scrollEnabled
                zoomEnabled
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {stats.marcadores.map((m, i) => (
                  <Marker
                    key={i}
                    coordinate={{ latitude: m.latitud, longitude: m.longitud }}
                  >
                    <View style={s.markerBubble}>
                      <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            </View>
            <View style={s.simbologiaCol}>
              <Text style={s.simbologiaTitulo}>Simbología</Text>
              {SIMBOLOGIA.map((item) => (
                <View key={item.l} style={s.simbologiaFila}>
                  <Image source={item.img} style={s.simbologiaImg} resizeMode="contain" />
                  <Text style={s.simbologiaLabel}>{item.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* ── Incidentes activos ── */}
        <Card>
          <SectionTitle text="Incidentes Activos Totales" />
          {cargando ? (
            <ActivityIndicator color={BUTTON} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={s.incidentesRow}>
              <Text style={s.bigNum}>{stats.total_activos}</Text>
              <View style={s.incidentesList}>
                {stats.reportes_por_tipo.slice(0, 3).map((t) => {
                  const img = getDesastreImg(t.nombre);
                  return (
                    <View key={t.nombre} style={s.incidenteFila}>
                      {img
                        ? <Image source={img} style={s.incidenteImg} resizeMode="contain" />
                        : <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                      }
                      <Text style={s.incidenteLabel}>{t.nombre} ({t.total})</Text>
                      {t.total > 0 && <View style={s.alertDot} />}
                    </View>
                  );
                })}
                {stats.reportes_por_tipo.length === 0 && (
                  <Text style={[s.incidenteLabel, { fontStyle: 'italic' }]}>Sin reportes activos</Text>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* ── Cómo estamos ayudando ── */}
        <Card>
          <SectionTitle text="Cómo estamos ayudando" />
          {cargando ? (
            <ActivityIndicator color={BUTTON} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={s.ayudaGrid}>
              <View style={s.ayudaItem}>
                <Text style={s.ayudaNum}>{stats.total_reportes}</Text>
                <Text style={s.ayudaLabel}>Reportes{'\n'}Registrados</Text>
              </View>
              <View style={s.ayudaItem}>
                <Text style={s.ayudaNum}>{stats.voluntarios_activos}</Text>
                <Text style={s.ayudaLabel}>Voluntarios{'\n'}Activos</Text>
              </View>
              <View style={s.ayudaItem}>
                <Text style={s.ayudaNum}>{stats.albergues_activos}</Text>
                <Text style={s.ayudaLabel}>Albergues{'\n'}Activos</Text>
              </View>
            </View>
          )}
        </Card>

        {/* ── Tipos de desastres + alertas ── */}
        <Card>
          <SectionTitle text="Tipos de Desastres Reportados" />
          {cargando ? (
            <ActivityIndicator color={BUTTON} style={{ paddingVertical: 20 }} />
          ) : stats.reportes_por_tipo.length === 0 ? (
            <Text style={s.sinDatos}>Sin reportes por tipo aún</Text>
          ) : (
            stats.reportes_por_tipo.map(({ nombre, pct, total }) => (
              <View key={nombre} style={s.tipoFila}>
                <Text style={s.tipoLabel}>{nombre} ({total})</Text>
                <View style={s.tipoBarTrack}>
                  <View style={[s.tipoBarFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
            ))
          )}

          <View style={s.separador} />
          <Text style={s.subSectionTitle}>Últimas Alertas Emitidas</Text>

          {cargando ? (
            <ActivityIndicator color={BUTTON} />
          ) : stats.alertas_recientes.length === 0 ? (
            <Text style={s.sinDatos}>Sin alertas activas</Text>
          ) : (
            stats.alertas_recientes.map((a, i) => (
              <View key={i} style={s.alertaFila}>
                <View style={[s.alertaDot2, { backgroundColor: NIVEL_COLOR[a.nivel] ?? '#6B7C85' }]} />
                <Text style={s.alertaLabel}>{a.titulo} · {a.zona}</Text>
                <Text style={s.alertaTiempo}>{tiempoRelativo(a.creado_en)}</Text>
              </View>
            ))
          )}
        </Card>

      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('CreateReport')} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
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
  logo: { width: 36, height: 36 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  scroll: { padding: 14, paddingBottom: 100, gap: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  sectionTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitleAccent:{ width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionTitleText:  { fontSize: 14, fontWeight: '700', color: TITULO },

  mapRow:    { flexDirection: 'row', gap: 12 },
  mapWrapper: { flex: 1, height: 260, borderRadius: 10, overflow: 'hidden' },
  markerBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  simbologiaCol:    { width: 110, justifyContent: 'flex-start' },
  simbologiaTitulo: { fontSize: 10, fontWeight: '700', color: TITULO, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  simbologiaFila:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  simbologiaImg:    { width: 16, height: 16 },
  simbologiaLabel:  { fontSize: 10, color: TEXT },

  incidentesRow:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigNum:         { fontSize: 52, fontWeight: '900', color: TITULO, lineHeight: 56 },
  incidentesList: { flex: 1, gap: 6 },
  incidenteFila:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  incidenteImg:   { width: 18, height: 18 },
  incidenteLabel: { flex: 1, fontSize: 12, color: TEXT },
  alertDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },

  ayudaGrid:  { flexDirection: 'row', justifyContent: 'space-around' },
  ayudaItem:  { alignItems: 'center', flex: 1 },
  ayudaNum:   { fontSize: 26, fontWeight: '800', color: BUTTON, marginBottom: 4 },
  ayudaLabel: { fontSize: 11, color: TEXT, textAlign: 'center', lineHeight: 15 },

  tipoFila:     { marginBottom: 10 },
  tipoLabel:    { fontSize: 12, color: TEXT, marginBottom: 4 },
  tipoBarTrack: { height: 10, backgroundColor: DIVIDER, borderRadius: 5, overflow: 'hidden' },
  tipoBarFill:  { height: '100%', borderRadius: 5, backgroundColor: BUTTON },

  separador:       { height: 1, backgroundColor: DIVIDER, marginVertical: 12 },
  subSectionTitle: { fontSize: 12, fontWeight: '700', color: TITULO, marginBottom: 8 },
  alertaFila:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  alertaDot2:      { width: 10, height: 10, borderRadius: 5 },
  alertaLabel:     { flex: 1, fontSize: 12, color: TEXT },
  alertaTiempo:    { fontSize: 12, fontWeight: '600', color: TITULO },

  sinDatos: { fontSize: 13, color: TEXT, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  barTrack: { flex: 1, height: 8, backgroundColor: DIVIDER, borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4 },

  fab: {
    position: 'absolute', bottom: 22, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BUTTON,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: BUTTON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
