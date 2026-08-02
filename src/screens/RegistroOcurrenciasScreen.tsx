import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getReportes } from '../services/reporteService';
import { Reporte, EstadoReporte } from '../types';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const ESTADO_COLOR: Record<EstadoReporte, string> = {
  Activo:        '#E74C3C',
  'En atención': '#3498DB',
  Resuelto:      '#27AE60',
};

const TIPOS_FILTRO = ['Todos', 'Terremoto', 'Inundación', 'Incendio Forestal', 'Huracán', 'Deslizamiento', 'Tsunami'];
const ESTADOS_FILTRO: ('Todos' | EstadoReporte)[] = ['Todos', 'Activo', 'En atención', 'Resuelto'];

export default function RegistroOcurrenciasScreen() {
  const nav = useNavigation<any>();
  const [reportes, setReportes]     = useState<Reporte[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [busqueda, setBusqueda]     = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [estadoFiltro, setEstadoFiltro] = useState<'Todos' | EstadoReporte>('Todos');

  const cargar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCargando(true);
    try {
      const data = await getReportes();
      setReportes(data);
    } catch {
      // silent
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = () => { setRefreshing(true); cargar(true); };

  const filtrados = useMemo(() => reportes.filter((r) => {
    const texto = busqueda.trim().toLowerCase();
    const coincideTexto = !texto
      || r.titulo.toLowerCase().includes(texto)
      || r.ubicacion.toLowerCase().includes(texto);
    const coincideTipo   = tipoFiltro   === 'Todos' || r.tipo   === tipoFiltro;
    const coincideEstado = estadoFiltro === 'Todos' || r.estado === estadoFiltro;
    return coincideTexto && coincideTipo && coincideEstado;
  }), [reportes, busqueda, tipoFiltro, estadoFiltro]);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Registro de Ocurrencias</Text>
        </View>
      </View>

      {cargando ? (
        <View style={s.centered}><ActivityIndicator size="large" color={BUTTON} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BUTTON} />}
        >
          {/* Buscador */}
          <TextInput
            style={s.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por título o ubicación..."
            placeholderTextColor="#B0B8BC"
          />

          {/* Filtro por estado */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtroScroll}>
            <View style={s.filtroRow}>
              {ESTADOS_FILTRO.map((e) => {
                const activo = estadoFiltro === e;
                const color = e === 'Todos' ? BUTTON : ESTADO_COLOR[e];
                return (
                  <TouchableOpacity
                    key={e}
                    style={[s.chip, activo && { backgroundColor: color + '22', borderColor: color }]}
                    onPress={() => setEstadoFiltro(e)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, activo && { color }]}>{e}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Filtro por tipo */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtroScroll}>
            <View style={s.filtroRow}>
              {TIPOS_FILTRO.map((t) => {
                const activo = tipoFiltro === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, activo && { backgroundColor: BUTTON + '22', borderColor: BUTTON }]}
                    onPress={() => setTipoFiltro(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, activo && { color: BUTTON }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {reportes.length === 0 && (
            <Text style={s.sinDatos}>Aún no hay reportes registrados.</Text>
          )}
          {reportes.length > 0 && filtrados.length === 0 && (
            <Text style={s.sinDatos}>No hay ocurrencias que coincidan con tu búsqueda.</Text>
          )}

          {filtrados.map((r) => (
            <View key={r.id} style={s.card}>
              <View style={s.filaTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.titulo}>{r.titulo}</Text>
                  <Text style={s.tipo}>{r.tipo}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: ESTADO_COLOR[r.estado] + '20' }]}>
                  <Text style={[s.badgeText, { color: ESTADO_COLOR[r.estado] }]}>{r.estado}</Text>
                </View>
              </View>
              {!!r.ubicacion && <Text style={s.ubicacion}>📍 {r.ubicacion}</Text>}
              <View style={s.filaMeta}>
                <Text style={s.meta}>{r.usuarioNombre || 'Anónimo'}</Text>
                <Text style={s.meta}>{r.fecha}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
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

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:   { padding: 14, paddingBottom: 40 },
  sinDatos: { fontSize: 13, color: TEXT, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },

  buscador: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: TITULO,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  filtroScroll: { marginBottom: 8 },
  filtroRow:    { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: TEXT },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  titulo:  { fontSize: 14, fontWeight: '700', color: TITULO, marginBottom: 2 },
  tipo:    { fontSize: 12, color: TEXT },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  ubicacion: { fontSize: 12, color: TEXT, marginBottom: 8 },
  filaMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: DIVIDER },
  meta:     { fontSize: 12, color: TEXT },
});
