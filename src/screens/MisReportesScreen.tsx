import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { getMisReportes, MiReporte } from '../services/reporteService';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const ESTATUS_INFO: Record<string, { label: string; color: string }> = {
  Pendiente:   { label: 'Pendiente',   color: '#F39C12' },
  En_Proceso:  { label: 'En proceso',  color: '#3498DB' },
  Finalizado:  { label: 'Finalizado',  color: '#27AE60' },
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function MisReportesScreen() {
  const nav = useNavigation<any>();
  const [reportes, setReportes]     = useState<MiReporte[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCargando(true);
    try {
      const data = await getMisReportes();
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
          <Text style={s.headerSub}>Mis Reportes</Text>
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
          {reportes.length === 0 && (
            <Text style={s.sinDatos}>Aún no has enviado reportes.</Text>
          )}

          {reportes.map((r) => {
            const info = ESTATUS_INFO[r.estatus] ?? { label: r.estatus, color: TEXT };
            return (
              <View key={r.id} style={s.card}>
                <View style={s.filaTop}>
                  <Text style={s.emoji}>{r.emoji ?? '📍'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.titulo}>{r.titulo}</Text>
                    <Text style={s.tipo}>{r.tipo_desastre ?? 'General'}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: info.color + '20' }]}>
                    <Text style={[s.badgeText, { color: info.color }]}>{info.label}</Text>
                  </View>
                </View>
                <View style={s.filaMeta}>
                  <Text style={s.meta}>Prioridad: {r.prioridad}</Text>
                  <Text style={s.meta}>{tiempoRelativo(r.creado_en)}</Text>
                </View>
              </View>
            );
          })}
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
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji:   { fontSize: 24 },
  titulo:  { fontSize: 14, fontWeight: '700', color: TITULO, marginBottom: 2 },
  tipo:    { fontSize: 12, color: TEXT },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  filaMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER },
  meta:     { fontSize: 12, color: TEXT },
});
