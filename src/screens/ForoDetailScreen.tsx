import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { uploadMediaApi } from '../services/authService';
import { RootStackParamList } from '../types';

type ForoDetailRoute = RouteProp<RootStackParamList, 'ForoDetail'>;

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

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
}

interface Comentario {
  id: number;
  contenido: string;
  creado_en: string;
  autor_nombre: string;
  autor_foto: string | null;
  foto_url: string | null;
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

function AvatarComentarista({ foto, nombre }: { foto: string | null; nombre: string }) {
  if (foto) {
    return <Image source={{ uri: foto }} style={s.comentAvatar} />;
  }
  return (
    <View style={s.comentAvatarDefault}>
      <Text style={s.comentAvatarLetter}>{(nombre ?? '?')[0].toUpperCase()}</Text>
    </View>
  );
}

export default function ForoDetailScreen() {
  const nav   = useNavigation<any>();
  const route = useRoute<ForoDetailRoute>();
  const { id, titulo: tituloParam } = route.params;
  const { usuario } = useAuth();

  const [pub, setPub]               = useState<Publicacion | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando]     = useState(true);

  const [texto, setTexto]           = useState('');
  const [adjunto, setAdjunto]       = useState<{ uri: string; url: string; filename: string } | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [enviando, setEnviando]     = useState(false);

  const flatRef = useRef<FlatList>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await apiFetch<{ publicacion: Publicacion; comentarios: Comentario[] }>(
        `/api/foro/${id}`, { auth: true },
      );
      setPub(data.publicacion);
      setComentarios(data.comentarios ?? []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cargar la publicación.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

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

  const handleEnviar = async () => {
    if (!texto.trim() && !adjunto) return;
    setEnviando(true);
    try {
      const res = await apiFetch<{ comentario: Comentario }>(
        `/api/foro/${id}/comentarios`,
        {
          method: 'POST',
          body: { contenido: texto.trim(), foto_url: adjunto?.url ?? null },
          auth: true,
        },
      );
      setComentarios((prev) => [...prev, res.comentario]);
      setTexto('');
      setAdjunto(null);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const catColor = CAT_COLOR[pub?.categoria ?? ''] ?? CAT_COLOR.General;

  const ListHeader = () => (
    <View>
      {cargando ? (
        <ActivityIndicator color={BUTTON} style={{ paddingVertical: 40 }} />
      ) : pub ? (
        <>
          <View style={s.pubCard}>
            <View style={s.pubHeader}>
              <View style={[s.catBadge, { backgroundColor: catColor + '20' }]}>
                <Text style={[s.catText, { color: catColor }]}>{pub.categoria}</Text>
              </View>
              <Text style={s.pubFecha}>{tiempoRelativo(pub.creado_en)}</Text>
            </View>

            <Text style={s.pubTitulo}>{pub.titulo}</Text>

            {/* Autor con foto de perfil */}
            <View style={s.autorRow}>
              {pub.autor_foto
                ? <Image source={{ uri: pub.autor_foto }} style={s.autorAvatar} />
                : (
                  <View style={s.autorAvatarDefault}>
                    <Text style={s.autorAvatarLetter}>{(pub.autor_nombre ?? '?')[0].toUpperCase()}</Text>
                  </View>
                )
              }
              <View>
                <Text style={s.autorNombre}>{pub.autor_nombre ?? 'Usuario'}</Text>
                <Text style={s.autorFecha}>{tiempoRelativo(pub.creado_en)}</Text>
              </View>
            </View>

            <View style={s.divider} />
            <Text style={s.pubContenido}>{pub.contenido}</Text>

            {/* Foto adjunta del post */}
            {pub.foto_url && (
              <View style={s.pubFotoContainer}>
                <Image source={{ uri: pub.foto_url }} style={s.pubFotoImg} resizeMode="cover" />
                <Text style={s.pubFotoNombre} numberOfLines={1}>{nombreArchivo(pub.foto_url)}</Text>
              </View>
            )}
          </View>

          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>Comentarios ({comentarios.length})</Text>
          </View>
        </>
      ) : null}
    </View>
  );

  const renderComentario = ({ item }: { item: Comentario }) => (
    <View style={s.comentarioCard}>
      <AvatarComentarista foto={item.autor_foto} nombre={item.autor_nombre} />
      <View style={s.comentBody}>
        <View style={s.comentMeta}>
          <Text style={s.comentarioAutor}>{item.autor_nombre ?? 'Usuario'}</Text>
          <Text style={s.comentarioFecha}>{tiempoRelativo(item.creado_en)}</Text>
        </View>
        {!!item.contenido && (
          <Text style={s.comentarioTexto}>{item.contenido}</Text>
        )}
        {item.foto_url && (
          <View style={s.comentFotoContainer}>
            <Image source={{ uri: item.foto_url }} style={s.comentFotoImg} resizeMode="cover" />
            <Text style={s.comentFotoNombre} numberOfLines={1}>{nombreArchivo(item.foto_url)}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub} numberOfLines={1}>{tituloParam}</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={comentarios}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderComentario}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !cargando
            ? <Text style={s.sinComentarios}>Sé el primero en comentar.</Text>
            : null
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Adjunto pendiente (encima de la barra) */}
      {adjunto && (
        <View style={s.adjuntoPendiente}>
          <Image source={{ uri: adjunto.uri }} style={s.adjuntoPendienteImg} />
          <Text style={s.adjuntoPendienteNombre} numberOfLines={1}>{adjunto.filename}</Text>
          <TouchableOpacity onPress={() => setAdjunto(null)} style={s.adjuntoPendienteRemove}>
            <Text style={s.adjuntoPendienteRemoveText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de comentario */}
      <View style={s.inputBar}>
        {/* Foto de perfil del usuario actual */}
        {usuario?.fotoUrl
          ? <Image source={{ uri: usuario.fotoUrl }} style={s.myAvatar} />
          : (
            <View style={s.myAvatarDefault}>
              <Text style={s.myAvatarLetter}>{(usuario?.nombre ?? '?')[0].toUpperCase()}</Text>
            </View>
          )
        }

        <TextInput
          style={s.commentInput}
          placeholder="Escribe un comentario..."
          placeholderTextColor="#B0B8BC"
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={500}
        />

        {/* Botón adjuntar foto */}
        <TouchableOpacity
          style={s.attachBtn}
          onPress={handlePickFoto}
          disabled={subiendoFoto}
          activeOpacity={0.7}
        >
          {subiendoFoto
            ? <ActivityIndicator color={BUTTON} size="small" />
            : <Text style={s.attachIcon}>📎</Text>
          }
        </TouchableOpacity>

        {/* Botón enviar */}
        <TouchableOpacity
          style={[s.sendBtn, (!texto.trim() && !adjunto) && s.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={enviando || (!texto.trim() && !adjunto)}
          activeOpacity={0.85}
        >
          {enviando
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
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

  listContent: { padding: 14, paddingBottom: 20 },

  pubCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  pubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  catText:   { fontSize: 12, fontWeight: '700' },
  pubFecha:  { fontSize: 11, color: TEXT },
  pubTitulo: { fontSize: 17, fontWeight: '800', color: TITULO, marginBottom: 12, lineHeight: 24 },

  autorRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  autorAvatar:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: HEADER },
  autorAvatarDefault: { width: 36, height: 36, borderRadius: 18, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center' },
  autorAvatarLetter:  { fontSize: 13, fontWeight: '800', color: BUTTON },
  autorNombre:        { fontSize: 13, fontWeight: '700', color: TITULO },
  autorFecha:         { fontSize: 11, color: TEXT, marginTop: 2 },

  divider:      { height: 1, backgroundColor: DIVIDER, marginBottom: 12 },
  pubContenido: { fontSize: 14, color: TITULO, lineHeight: 22, marginBottom: 12 },

  pubFotoContainer: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: DIVIDER },
  pubFotoImg:       { width: '100%', height: 200 },
  pubFotoNombre:    { fontSize: 11, color: TEXT, padding: 8, backgroundColor: '#F5F7F8' },

  sectionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionText:   { fontSize: 14, fontWeight: '700', color: TITULO },

  sinComentarios: { fontSize: 13, color: TEXT, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 },

  // Comentario
  comentarioCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  comentAvatar:        { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: HEADER, flexShrink: 0 },
  comentAvatarDefault: { width: 34, height: 34, borderRadius: 17, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  comentAvatarLetter:  { fontSize: 12, fontWeight: '700', color: BUTTON },
  comentBody:          { flex: 1 },
  comentMeta:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  comentarioAutor:     { fontSize: 12, fontWeight: '700', color: TITULO },
  comentarioFecha:     { fontSize: 11, color: TEXT },
  comentarioTexto:     { fontSize: 13, color: TEXT, lineHeight: 19 },

  comentFotoContainer: { borderRadius: 8, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: DIVIDER },
  comentFotoImg:       { width: '100%', height: 130 },
  comentFotoNombre:    { fontSize: 11, color: TEXT, padding: 6, backgroundColor: '#F5F7F8' },

  // Adjunto pendiente
  adjuntoPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  adjuntoPendienteImg:        { width: 44, height: 44, borderRadius: 8 },
  adjuntoPendienteNombre:     { flex: 1, fontSize: 12, color: TITULO, fontWeight: '600' },
  adjuntoPendienteRemove:     { padding: 6 },
  adjuntoPendienteRemoveText: { fontSize: 16, color: '#E74C3C', fontWeight: '700' },

  // Barra de comentario
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  myAvatar:        { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: HEADER, flexShrink: 0 },
  myAvatarDefault: { width: 34, height: 34, borderRadius: 17, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  myAvatarLetter:  { fontSize: 12, fontWeight: '700', color: BUTTON },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: TITULO,
    backgroundColor: '#F5F7F8',
    maxHeight: 100,
  },
  attachBtn:  { padding: 6, justifyContent: 'center', alignItems: 'center', width: 36, height: 36 },
  attachIcon: { fontSize: 20 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: BUTTON,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: BUTTON + '60' },
  sendIcon:        { color: '#fff', fontSize: 16, fontWeight: '700' },
});
