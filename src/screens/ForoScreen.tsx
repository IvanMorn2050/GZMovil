import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function ForoScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Foro</Text>
      </View>
      <View style={styles.content}>
        <Image source={require('../../assets/foro_activo.jpeg')} style={styles.icon} resizeMode="contain" />
        <Text style={styles.titulo}>Foro comunitario</Text>
        <Text style={styles.sub}>Próximamente podrás discutir reportes y coordinar acciones con tu equipo.</Text>
      </View>
    </View>
  );
}

const DARK = '#0d4f5c';
const PRIMARY = '#3ab5c6';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f5' },
  header: {
    backgroundColor: DARK,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { width: 90, height: 90, marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: '700', color: DARK, marginBottom: 10 },
  sub: { fontSize: 14, color: '#8a9ba8', textAlign: 'center', lineHeight: 22 },
});
