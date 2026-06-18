import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getReportes } from '../services/reporteService';

const ROL_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  ciudadano:   { label: 'Ciudadano',    emoji: '🏘️', color: '#3498db' },
  voluntario:  { label: 'Voluntario',   emoji: '🤝', color: '#27ae60' },
  coordinador: { label: 'Coordinador',  emoji: '⭐', color: '#f39c12' },
};

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();
  const todos = getReportes();
  const misReportes = todos.filter((r) => r.usuarioId === usuario?.id);
  const reportesAtendidos = todos.filter((r) => r.voluntariosIds.includes(usuario?.id ?? ''));
  const resueltos = misReportes.filter((r) => r.estado === 'Resuelto').length;

  const rolInfo = ROL_INFO[usuario?.rol ?? 'ciudadano'];
  const esVoluntario = usuario?.rol === 'voluntario' || usuario?.rol === 'coordinador';

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {/* Tarjeta de usuario */}
      <View style={styles.avatarCard}>
        <Image
          source={require('../../assets/perfil_activo.jpeg')}
          style={styles.avatar}
          resizeMode="cover"
        />
        <Text style={styles.nombre}>{usuario?.nombre}</Text>
        <Text style={styles.email}>{usuario?.email}</Text>
        <View style={[styles.rolBadge, { backgroundColor: rolInfo.color + '20' }]}>
          <Text style={styles.rolEmoji}>{rolInfo.emoji}</Text>
          <Text style={[styles.rolText, { color: rolInfo.color }]}>{rolInfo.label}</Text>
        </View>
      </View>

      {/* Estadísticas */}
      <Text style={styles.seccion}>Mis estadísticas</Text>
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{misReportes.length}</Text>
          <Text style={styles.statLabel}>Reportes{'\n'}creados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{resueltos}</Text>
          <Text style={styles.statLabel}>Reportes{'\n'}resueltos</Text>
        </View>
        {esVoluntario && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#27ae60' }]}>{reportesAtendidos.length}</Text>
              <Text style={styles.statLabel}>Emergencias{'\n'}atendidas</Text>
            </View>
          </>
        )}
      </View>

      {/* Rol info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitulo}>{rolInfo.emoji}  ¿Qué puedo hacer?</Text>
        {esVoluntario ? (
          <>
            <Text style={styles.infoItem}>• Ver y atender reportes de desastres</Text>
            <Text style={styles.infoItem}>• Registrarte como voluntario activo</Text>
            <Text style={styles.infoItem}>• Reportar nuevas ocurrencias</Text>
          </>
        ) : (
          <>
            <Text style={styles.infoItem}>• Reportar desastres naturales</Text>
            <Text style={styles.infoItem}>• Ver el estado de tus reportes</Text>
            <Text style={styles.infoItem}>• Consultar el registro de ocurrencias</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.btnLogoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const DARK = '#0d4f5c';
const PRIMARY = '#3ab5c6';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f4f5' },
  content: { paddingBottom: 48 },
  header: {
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerLogo: { width: 36, height: 36 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  avatarCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  nombre: { fontSize: 20, fontWeight: '700', color: '#1a2730', marginBottom: 4 },
  email: { fontSize: 13, color: '#8a9ba8', marginBottom: 12 },
  rolBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  rolEmoji: { fontSize: 16 },
  rolText: { fontWeight: '700', fontSize: 13 },
  seccion: { fontSize: 13, fontWeight: '700', color: '#8a9ba8', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '800', color: DARK },
  statLabel: { fontSize: 11, color: '#8a9ba8', marginTop: 4, textAlign: 'center', lineHeight: 15 },
  statDivider: { width: 1, backgroundColor: '#e8edf0' },
  infoBox: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoTitulo: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 10 },
  infoItem: { fontSize: 13, color: '#6b7c85', marginBottom: 6, lineHeight: 18 },
  btnLogout: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 16,
    elevation: 3,
  },
  btnLogoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
