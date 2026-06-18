import React, { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getReportes, getEstadisticas, toggleAtender } from '../services/reporteService';
import { Reporte, Estadisticas } from '../types';

// ─── Mapas de estilos por tipo y estado ───────────────────────────────────────

const TIPO_META: Record<string, { emoji: string; color: string }> = {
  Terremoto:         { emoji: '🌋', color: '#8B4513' },
  Inundación:        { emoji: '🌧️', color: '#1565C0' },
  'Incendio Forestal': { emoji: '🔥', color: '#E65100' },
  Huracán:           { emoji: '🌀', color: '#6A1B9A' },
  Deslizamiento:     { emoji: '⛰️', color: '#5D4037' },
  Tsunami:           { emoji: '🌊', color: '#0D47A1' },
};

const ESTADO_META: Record<string, { color: string; bg: string }> = {
  Activo:        { color: '#c0392b', bg: '#fdecec' },
  'En atención': { color: '#e67e22', bg: '#fef5ec' },
  Resuelto:      { color: '#27ae60', bg: '#eafaf1' },
};

// ─── Tarjeta de estadística ────────────────────────────────────────────────────

function StatCard({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Tarjeta de reporte ────────────────────────────────────────────────────────

function ReporteCard({
  item,
  esVoluntario,
  usuarioId,
  onAtender,
}: {
  item: Reporte;
  esVoluntario: boolean;
  usuarioId: string;
  onAtender: () => void;
}) {
  const meta = TIPO_META[item.tipo] ?? { emoji: '⚠️', color: '#888' };
  const estado = ESTADO_META[item.estado] ?? { color: '#888', bg: '#f5f5f5' };
  const yaAtiende = item.voluntariosIds.includes(usuarioId);

  return (
    <View style={styles.card}>
      {/* Encabezado: tipo + estado */}
      <View style={styles.cardTop}>
        <View style={[styles.tipoBadge, { backgroundColor: meta.color + '18' }]}>
          <Text style={styles.tipoEmoji}>{meta.emoji}</Text>
          <Text style={[styles.tipoBadgeText, { color: meta.color }]}>{item.tipo}</Text>
        </View>
        <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
          <Text style={[styles.estadoText, { color: estado.color }]}>{item.estado}</Text>
        </View>
      </View>

      {/* Contenido */}
      <Text style={styles.cardTitulo} numberOfLines={2}>{item.titulo}</Text>
      <Text style={styles.cardUbicacion}>📍 {item.ubicacion}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>

      {/* Pie */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Text style={styles.cardMeta}>👤 {item.usuarioNombre}</Text>
          <Text style={styles.cardMeta}>📅 {item.fecha}</Text>
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.voluntariosText}>
            🤝 {item.voluntariosIds.length} voluntario{item.voluntariosIds.length !== 1 ? 's' : ''}
          </Text>
          {esVoluntario && item.estado !== 'Resuelto' && (
            <TouchableOpacity
              style={[styles.atenderBtn, yaAtiende && styles.atenderBtnActivo]}
              onPress={onAtender}
              activeOpacity={0.8}
            >
              <Text style={[styles.atenderBtnText, yaAtiende && styles.atenderBtnTextActivo]}>
                {yaAtiende ? '✓ Atendiendo' : 'Atender'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { usuario } = useAuth();

  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [stats, setStats] = useState<Estadisticas>({ total: 0, activos: 0, enAtencion: 0, resueltos: 0 });

  const esVoluntario = usuario?.rol === 'voluntario' || usuario?.rol === 'coordinador';

  const refrescar = useCallback(() => {
    setReportes(getReportes());
    setStats(getEstadisticas());
  }, []);

  useFocusEffect(refrescar);

  const handleAtender = (reporteId: string) => {
    const ahora = toggleAtender(reporteId, usuario!.id);
    Alert.alert(
      ahora ? '¡Registrado!' : 'Cancelado',
      ahora
        ? 'Quedaste registrado como voluntario en este reporte.'
        : 'Ya no apareces como voluntario en este reporte.'
    );
    refrescar();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>GuardianZero</Text>
          <Text style={styles.headerSub}>
            Hola, {usuario?.nombre.split(' ')[0]} · {usuario?.rol === 'voluntario' ? '🤝 Voluntario' : usuario?.rol === 'coordinador' ? '⭐ Coordinador' : '🏘️ Ciudadano'}
          </Text>
        </View>
      </View>

      <FlatList
        data={reportes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <ReporteCard
            item={item}
            esVoluntario={esVoluntario}
            usuarioId={usuario!.id}
            onAtender={() => handleAtender(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>Sin reportes aún. ¡Crea el primero!</Text>
        }
        ListHeaderComponent={
          <>
            {/* Registro de ocurridos */}
            <View style={styles.registroBox}>
              <Text style={styles.registroTitulo}>📊  Registro de ocurrencias</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                <StatCard num={stats.total}      label="Total"       color="#0d4f5c" />
                <StatCard num={stats.activos}    label="Activos"     color="#c0392b" />
                <StatCard num={stats.enAtencion} label="En atención" color="#e67e22" />
                <StatCard num={stats.resueltos}  label="Resueltos"   color="#27ae60" />
              </ScrollView>
            </View>

            <Text style={styles.seccionTitulo}>🚨  Alertas activas</Text>
          </>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateReport')}
        activeOpacity={0.85}
      >
        <Image
          source={require('../../assets/agregar_reporte.jpeg')}
          style={styles.fabIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const PRIMARY = '#3ab5c6';
const DARK = '#0d4f5c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f5' },

  // Header
  header: {
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerLogo: { width: 42, height: 42 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#a8d8e0', fontSize: 12, marginTop: 1 },

  // Registro de ocurridos
  registroBox: {
    backgroundColor: '#fff',
    marginHorizontal: 0,
    marginBottom: 0,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf0',
  },
  registroTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statsScroll: { paddingHorizontal: 12 },
  statCard: {
    backgroundColor: '#f8fbfc',
    borderRadius: 12,
    borderTopWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 90,
  },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#8a9ba8', marginTop: 2, fontWeight: '600' },

  // Lista
  seccionTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  lista: { paddingBottom: 100 },

  // Tarjeta de reporte
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tipoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tipoEmoji: { fontSize: 13 },
  tipoBadgeText: { fontSize: 12, fontWeight: '700' },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText: { fontSize: 11, fontWeight: '700' },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: '#1a2730', marginBottom: 3 },
  cardUbicacion: { fontSize: 12, color: '#8a9ba8', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#6b7c85', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardFooterLeft: { gap: 2 },
  cardFooterRight: { alignItems: 'flex-end', gap: 6 },
  cardMeta: { fontSize: 11, color: '#aab4bc' },
  voluntariosText: { fontSize: 12, color: '#8a9ba8', fontWeight: '600' },
  atenderBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  atenderBtnActivo: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  atenderBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  atenderBtnTextActivo: { color: '#fff' },

  vacio: { textAlign: 'center', color: '#aab4bc', marginTop: 60, fontSize: 15 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: { width: 60, height: 60 },
});
