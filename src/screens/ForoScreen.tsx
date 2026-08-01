import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { uploadMediaApi } from '../services/authService';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const CATEGORIAS = ['General', 'Aviso', 'Protocolo', 'Reporte', 'Guia', 'Pregunta', 'Noticia'];
const CAT_COLOR: Record<string, string> = {
  General:   '#6B7C85',
  Aviso:     '#1AA6A6',
  Protocolo: '#E74C3C',
  Reporte:   '#27AE60',
  Guia:      '#E67E22',
  Pregunta:  '#9B59B6',
  Noticia:   '#3498DB',
};

interface Publicacion {
  id: number;
  titulo: string;
  contenido: string;
  categoria: string;
  creado_en: string;
  id_autor_usuario: number;
  autor_nombre: string;
  autor_foto: string | null;
  foto_url: string | null;
  total_comentarios: number;
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function nombreArchivo(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url);
}

export default function ForoScreen() {
  const nav = useNavigation<any>();
  const { usuario } = useAuth();

  const [pubs, setPubs]             = useState<Publicacion[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal crear / editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState<Publicacion | null>(null);
  const [titulo, setTitulo]             = useState('');
  const [contenido, setContenido]       = useState('');
  const [categoria, setCategoria]       = useState('General');
  const [adjunto, setAdjunto]           = useState<{ uri: string; url: string; filename: string } | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [saving, setSaving]             = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCargando(true);
    try {
      const data = await apiFetch<{ publicaciones: Publicacion[] }>('/api/foro', { auth: false });
      setPubs(data.publicaciones ?? []);
    } catch {
      // silent
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = () => { setRefreshing(true); cargar(true); };

  const abrirCrear = () => {
    setEditTarget(null);
    setTitulo('');
    setContenido('');
    setCategoria('General');
    setAdjunto(null);
    setModalVisible(true);
  };

  const abrirEditar = (pub: Publicacion) => {
    setEditTarget(pub);
    setTitulo(pub.titulo);
    setContenido(pub.contenido);
    setCategoria(pub.categoria);
    setAdjunto(pub.foto_url ? { uri: pub.foto_url, url: pub.foto_url, filename: nombreArchivo(pub.foto_url) } : null);
    setModalVisible(true);
  };

  const handlePickFoto = async () => {
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

    setSubiendoFoto(true);
    try {
      const { url, filename } = await uploadMediaApi(result.assets[0].uri);
      setAdjunto({ uri: result.assets[0].uri, url, filename });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleGuardar = async () => {
    if (!titulo.trim())    return Alert.alert('Campo requerido', 'Ingresa el título.');
    if (!contenido.trim()) return Alert.alert('Campo requerido', 'Ingresa el contenido.');
    setSaving(true);
    try {
      const body = {
        titulo:    titulo.trim(),
        contenido: contenido.trim(),
        categoria,
        foto_url:  adjunto?.url ?? null,
      };
      if (editTarget) {
        await apiFetch(`/api/foro/${editTarget.id}`, { method: 'PUT', body, auth: true });
      } else {
        await apiFetch('/api/foro', { method: 'POST', body, auth: true });
      }
      setModalVisible(false);
      cargar();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la publicación.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = (pub: Publicacion) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/foro/${pub.id}`, { method: 'DELETE', auth: true });
              cargar();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  };

  const esAutor = (pub: Publicacion) => String(pub.id_autor_usuario) === usuario?.id;

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Foro y Comunidad</Text>
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
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>Publicaciones Recientes</Text>
          </View>

          {pubs.length === 0 && (
            <Text style={s.sinDatos}>Aún no hay publicaciones. ¡Sé el primero!</Text>
          )}

          {pubs.map((pub) => {
            const color = CAT_COLOR[pub.categoria] ?? CAT_COLOR.General;
            return (
              <View key={pub.id} style={s.pubCard}>
                {/* Encabezado */}
                <View style={s.pubHeader}>
                  <View style={[s.categoriaBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.categoriaText, { color }]}>{pub.categoria}</Text>
                  </View>
                  <Text style={s.pubFecha}>{tiempoRelativo(pub.creado_en)}</Text>
                </View>

                {/* Título */}
                <Text style={s.pubTitulo}>{pub.titulo}</Text>

                {/* Autor con foto */}
                <View style={s.autorRow}>
                  {pub.autor_foto
                    ? <Image source={{ uri: pub.autor_foto }} style={s.autorAvatar} />
                    : (
                      <View style={s.autorAvatarDefault}>
                        <Text style={s.autorAvatarLetter}>
                          {(pub.autor_nombre ?? '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )
                  }
                  <Text style={s.pubAutor}>{pub.autor_nombre ?? 'Usuario'}</Text>
                </View>

                {/* Extracto */}
                <Text style={s.pubExtracto} numberOfLines={2}>{pub.contenido}</Text>

                {/* Foto adjunta del post */}
                {pub.foto_url && (
                  <View style={s.adjuntoContainer}>
                    <Image source={{ uri: pub.foto_url }} style={s.adjuntoImg} resizeMode="cover" />
                    <Text style={s.adjuntoNombre} numberOfLines={1}>{nombreArchivo(pub.foto_url)}</Text>
                  </View>
                )}

                {/* Acciones */}
                <View style={s.accionesRow}>
                  <TouchableOpacity
                    style={s.leerMasBtn}
                    onPress={() => nav.navigate('ForoDetail', { id: pub.id, titulo: pub.titulo })}
                    activeOpacity={0.7}
                  >
                    <Text style={s.leerMasText}>
                      💬 {pub.total_comentarios ?? 0}  •  Leer más ▶
                    </Text>
                  </TouchableOpacity>

                  {esAutor(pub) && (
                    <View style={s.autorBtns}>
                      <TouchableOpacity onPress={() => abrirEditar(pub)} style={s.iconBtn} activeOpacity={0.7}>
                        <Image source={require('../../assets/lapiz.png')} style={s.iconBtnImg} resizeMode="contain" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEliminar(pub)} style={s.iconBtn} activeOpacity={0.7}>
                        <Text style={s.iconBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* FAB nueva publicación */}
      <TouchableOpacity style={s.fab} onPress={abrirCrear} activeOpacity={0.85}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Modal crear / editar ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.modalBox} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={s.modalTitle}>{editTarget ? 'Editar publicación' : 'Nueva publicación'}</Text>

            <Text style={s.inputLabel}>Título</Text>
            <TextInput
              style={s.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Título de la publicación"
              placeholderTextColor="#B0B8BC"
              maxLength={120}
            />

            <Text style={s.inputLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIAS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.catChip, categoria === c && { backgroundColor: (CAT_COLOR[c] ?? BUTTON) + '22', borderColor: CAT_COLOR[c] ?? BUTTON }]}
                    onPress={() => setCategoria(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.catChipText, categoria === c && { color: CAT_COLOR[c] ?? BUTTON }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.inputLabel}>Contenido</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={contenido}
              onChangeText={setContenido}
              placeholder="Escribe el contenido de tu publicación..."
              placeholderTextColor="#B0B8BC"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />

            {/* Foto adjunta */}
            <Text style={s.inputLabel}>Foto adjunta (opcional)</Text>
            {adjunto ? (
              <View style={s.adjuntoPreview}>
                <Image source={{ uri: adjunto.uri }} style={s.adjuntoPreviewImg} resizeMode="cover" />
                <View style={s.adjuntoPreviewInfo}>
                  <Text style={s.adjuntoPreviewNombre} numberOfLines={2}>{adjunto.filename}</Text>
                  <TouchableOpacity onPress={() => setAdjunto(null)}>
                    <Text style={s.adjuntoRemove}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.pickFotoBtn} onPress={handlePickFoto} disabled={subiendoFoto} activeOpacity={0.8}>
                {subiendoFoto
                  ? <ActivityIndicator color={BUTTON} size="small" />
                  : <Text style={s.pickFotoBtnText}>📎  Adjuntar foto</Text>
                }
              </TouchableOpacity>
            )}

            <View style={[s.modalBtns, { marginTop: 16, marginBottom: Platform.OS === 'ios' ? 20 : 8 }]}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleGuardar} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveText}>{editTarget ? 'Guardar cambios' : 'Publicar'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

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
  logo:        { width: 36, height: 36 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:   { padding: 14, paddingBottom: 100 },
  sinDatos: { fontSize: 13, color: TEXT, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },

  sectionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  sectionAccent: { width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionText:   { fontSize: 15, fontWeight: '700', color: TITULO },

  pubCard: {
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
  pubHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoriaBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoriaText:  { fontSize: 11, fontWeight: '700' },
  pubFecha:       { fontSize: 11, color: TEXT },
  pubTitulo:      { fontSize: 14, fontWeight: '700', color: TITULO, marginBottom: 8 },

  autorRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  autorAvatar:        { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: HEADER },
  autorAvatarDefault: { width: 26, height: 26, borderRadius: 13, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center' },
  autorAvatarLetter:  { fontSize: 11, fontWeight: '700', color: BUTTON },
  pubAutor:           { fontSize: 12, color: TEXT },

  pubExtracto: { fontSize: 13, color: TEXT, lineHeight: 19, marginBottom: 10 },

  adjuntoContainer: { borderRadius: 10, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: DIVIDER },
  adjuntoImg:       { width: '100%', height: 160 },
  adjuntoNombre:    { fontSize: 11, color: TEXT, padding: 8, backgroundColor: '#F5F7F8' },

  accionesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leerMasBtn:  {},
  leerMasText: { fontSize: 12, fontWeight: '700', color: BUTTON },
  autorBtns:   { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn:     { padding: 4 },
  iconBtnImg:  { width: 20, height: 20 },
  iconBtnText: { fontSize: 16 },

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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TITULO, marginBottom: 18 },
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
  textArea: { height: 110, paddingTop: 12 },

  catChip: {
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F7F8',
  },
  catChipText: { fontSize: 12, fontWeight: '600', color: TEXT },

  pickFotoBtn: {
    borderWidth: 1.5,
    borderColor: BUTTON,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  pickFotoBtnText: { fontSize: 13, fontWeight: '600', color: BUTTON },

  adjuntoPreview: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
    overflow: 'hidden',
    marginBottom: 4,
  },
  adjuntoPreviewImg:    { width: 80, height: 80 },
  adjuntoPreviewInfo:   { flex: 1, justifyContent: 'center', paddingRight: 12 },
  adjuntoPreviewNombre: { fontSize: 13, color: TITULO, fontWeight: '600', marginBottom: 8 },
  adjuntoRemove:        { fontSize: 12, color: '#E74C3C', fontWeight: '600' },

  modalBtns:  { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: DIVIDER, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: TEXT },
  saveBtn:    { flex: 1, backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
});
