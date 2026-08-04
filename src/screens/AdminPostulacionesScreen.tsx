import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getPostulacionesPendientesApi, getCertificacionesPostulanteApi, responderPostulacionApi,
  PostulacionPendiente, Certificacion,
} from '../services/authService';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function AdminPostulacionesScreen() {
  const nav = useNavigation<any>();
  const [postulaciones, setPostulaciones] = useState<PostulacionPendiente[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);

  const [expandido, setExpandido]   = useState<number | null>(null);
  const [certs, setCerts]           = useState<Record<number, Certificacion[]>>({});
  const [cargandoCerts, setCargandoCerts] = useState<number | null>(null);

  const cargar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCargando(true);
    try {
      const data = await getPostulacionesPendientesApi();
      setPostulaciones(data.postulaciones ?? []);
    } catch {
      // silent
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = () => { setRefreshing(true); cargar(true); };

  const toggleCertificaciones = async (post: PostulacionPendiente) => {
    if (expandido === post.id) {
      setExpandido(null);
      return;
    }
    setExpandido(post.id);
    if (!certs[post.id]) {
      setCargandoCerts(post.id);
      try {
        const data = await getCertificacionesPostulanteApi(post.id);
        setCerts((prev) => ({ ...prev, [post.id]: data.certificaciones ?? [] }));
      } catch {
        setCerts((prev) => ({ ...prev, [post.id]: [] }));
      } finally {
        setCargandoCerts(null);
      }
    }
  };

  const handleResponder = (post: PostulacionPendiente, respuesta: 'aprobar' | 'rechazar') => {
    const verbo = respuesta === 'aprobar' ? 'aprobar' : 'rechazar';
    Alert.alert(
      respuesta === 'aprobar' ? 'Aprobar postulación' : 'Rechazar postulación',
      `¿Seguro que deseas ${verbo} la postulación de ${post.nombre} como ${post.rol_solicitado}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: respuesta === 'aprobar' ? 'Aprobar' : 'Rechazar',
          style: respuesta === 'aprobar' ? 'default' : 'destructive',
          onPress: async () => {
            setProcesando(post.id);
            try {
              const res = await responderPostulacionApi(post.id, respuesta);
              setPostulaciones((prev) => prev.filter((p) => p.id !== post.id));
              Alert.alert('Listo', res.message);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo procesar la postulación.');
            } finally {
              setProcesando(null);
            }
          },
        },
      ],
    );
  };

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
          <Text style={s.headerSub}>Postulaciones Pendientes</Text>
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
          {postulaciones.length === 0 && (
            <Text style={s.sinDatos}>No hay postulaciones pendientes de revisión.</Text>
          )}

          {postulaciones.map((post) => (
            <View key={post.id} style={s.card}>
              <View style={s.filaTop}>
                {post.foto_url
                  ? <Image source={{ uri: post.foto_url }} style={s.avatar} />
                  : (
                    <View style={s.avatarDefault}>
                      <Text style={s.avatarLetter}>{(post.nombre ?? '?')[0].toUpperCase()}</Text>
                    </View>
                  )
                }
                <View style={{ flex: 1 }}>
                  <Text style={s.nombre}>{post.nombre}</Text>
                  <Text style={s.email}>{post.email}</Text>
                  {!!post.telefono && <Text style={s.email}>📞 {post.telefono}</Text>}
                </View>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{post.rol_solicitado}</Text>
                </View>
              </View>

              <Text style={s.motivo}>"{post.motivo}"</Text>
              <Text style={s.fecha}>{tiempoRelativo(post.creado_en)}</Text>

              <TouchableOpacity
                style={s.certBtn}
                onPress={() => toggleCertificaciones(post)}
                activeOpacity={0.7}
              >
                <Text style={s.certBtnText}>
                  📄 Certificaciones ({post.total_certificaciones}) {expandido === post.id ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {expandido === post.id && (
                <View style={s.certList}>
                  {cargandoCerts === post.id ? (
                    <ActivityIndicator color={BUTTON} size="small" style={{ paddingVertical: 8 }} />
                  ) : (certs[post.id]?.length ?? 0) === 0 ? (
                    <Text style={s.sinCerts}>No subió certificaciones.</Text>
                  ) : (
                    certs[post.id].map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={s.certFila}
                        onPress={() => Linking.openURL(c.archivo_url)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.certIcono}>📄</Text>
                        <Text style={s.certNombre} numberOfLines={1}>{c.nombre_archivo}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <View style={s.accionesRow}>
                <TouchableOpacity
                  style={s.rechazarBtn}
                  onPress={() => handleResponder(post, 'rechazar')}
                  disabled={procesando === post.id}
                  activeOpacity={0.85}
                >
                  {procesando === post.id
                    ? <ActivityIndicator color="#E74C3C" size="small" />
                    : <Text style={s.rechazarText}>Rechazar</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.aprobarBtn}
                  onPress={() => handleResponder(post, 'aprobar')}
                  disabled={procesando === post.id}
                  activeOpacity={0.85}
                >
                  {procesando === post.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.aprobarText}>Aprobar</Text>
                  }
                </TouchableOpacity>
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
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:        { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: HEADER },
  avatarDefault: { width: 40, height: 40, borderRadius: 20, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center' },
  avatarLetter:  { fontSize: 15, fontWeight: '800', color: BUTTON },
  nombre: { fontSize: 14, fontWeight: '700', color: TITULO },
  email:  { fontSize: 12, color: TEXT, marginTop: 1 },
  badge:      { backgroundColor: BUTTON + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:  { fontSize: 11, fontWeight: '700', color: BUTTON },

  motivo: { fontSize: 13, color: TEXT, fontStyle: 'italic', lineHeight: 19, marginBottom: 4 },
  fecha:  { fontSize: 11, color: TEXT, marginBottom: 10 },

  certBtn:     { paddingVertical: 8, borderTopWidth: 1, borderTopColor: DIVIDER },
  certBtnText: { fontSize: 12, fontWeight: '600', color: BUTTON },
  certList:    { paddingBottom: 6 },
  sinCerts:    { fontSize: 12, color: TEXT, fontStyle: 'italic', paddingVertical: 6 },
  certFila:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  certIcono:   { fontSize: 14 },
  certNombre:  { flex: 1, fontSize: 12, color: TITULO, textDecorationLine: 'underline' },

  accionesRow: { flexDirection: 'row', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER },
  rechazarBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E74C3C', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  rechazarText:{ fontSize: 13, fontWeight: '700', color: '#E74C3C' },
  aprobarBtn:  { flex: 1, backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  aprobarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
