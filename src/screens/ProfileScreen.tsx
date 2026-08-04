import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import {
  getPerfilApi, updatePerfilApi, uploadFotoApi, postulacionApi,
  getCertificacionesApi, uploadCertificacionApi, deleteCertificacionApi,
  Certificacion,
} from '../services/authService';

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const ROL_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  ciudadano:     { label: 'Ciudadano',     emoji: '🏘️', color: '#3498DB' },
  voluntario:    { label: 'Voluntario',    emoji: '🤝', color: '#27AE60' },
  coordinador:   { label: 'Coordinador',   emoji: '⭐', color: '#F39C12' },
  administrador: { label: 'Administrador', emoji: '🛡️', color: '#8E44AD' },
};

interface PermisoItem { texto: string; screen?: 'MisReportes' | 'RegistroOcurrencias' | 'AdminPostulaciones' }

const PERMISOS: Record<string, PermisoItem[]> = {
  voluntario:  [
    { texto: 'Ver y atender reportes de desastres activos' },
    { texto: 'Registrarte como voluntario en emergencias' },
    { texto: 'Crear reportes de nuevas ocurrencias' },
  ],
  coordinador: [
    { texto: 'Coordinar equipos de respuesta' },
    { texto: 'Atender y gestionar reportes activos' },
    { texto: 'Crear reportes de nuevas ocurrencias' },
  ],
  ciudadano:   [
    { texto: 'Reportar desastres naturales en tu zona' },
    { texto: 'Ver el estado de tus reportes enviados', screen: 'MisReportes' },
    { texto: 'Consultar el registro de ocurrencias', screen: 'RegistroOcurrencias' },
  ],
  administrador: [
    { texto: 'Revisar y aprobar postulaciones de Voluntario/Especialista', screen: 'AdminPostulaciones' },
    { texto: 'Consultar el registro de ocurrencias', screen: 'RegistroOcurrencias' },
  ],
};

interface Postulacion {
  id: number;
  rol_solicitado: string;
  estado: string;
  motivo: string;
}

const ESTADO_POST_COLOR: Record<string, string> = {
  Pendiente: '#F39C12',
  Aprobada:  '#27AE60',
  Rechazada: '#E74C3C',
};

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const { usuario, logout, actualizarUsuario, refrescarUsuario } = useAuth();

  // ── Estado del perfil ─────────────────────────────────────────────
  const [stats, setStats]         = useState({ total_reportes: 0, reportes_resueltos: 0, capacitaciones_completadas: 0 });
  const [fotoUrl, setFotoUrl]     = useState<string | null>(usuario?.fotoUrl ?? null);
  const [telefono, setTelefono]   = useState(usuario?.telefono ?? '');
  const [postulacion, setPost]    = useState<Postulacion | null>(null);
  const [cargando, setCargando]   = useState(true);

  // ── Modales ───────────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [postVisible, setPostVisible] = useState(false);

  // ── Formulario edición ────────────────────────────────────────────
  const [editNombre, setEditNombre]   = useState(usuario?.nombre ?? '');
  const [editEmail, setEditEmail]     = useState(usuario?.email ?? '');
  const [editTelefono, setEditTel]    = useState(usuario?.telefono ?? '');
  const [savingEdit, setSavingEdit]   = useState(false);

  // ── Certificaciones ───────────────────────────────────────────────
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [subiendoCert, setSubiendoCert]       = useState(false);

  // ── Formulario postulación ────────────────────────────────────────
  const [postRol, setPostRol]       = useState<'Voluntario' | 'Especialista'>('Voluntario');
  const [postMotivo, setPostMotivo] = useState('');
  const [sendingPost, setSendingPost] = useState(false);

  // ── Subiendo foto ─────────────────────────────────────────────────
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const cargar = useCallback(() => {
    getPerfilApi()
      .then((data) => {
        setStats({
          total_reportes:             data.total_reportes             ?? 0,
          reportes_resueltos:         data.reportes_resueltos         ?? 0,
          capacitaciones_completadas: data.capacitaciones_completadas ?? 0,
        });
        if (data.foto_url) setFotoUrl(data.foto_url);
        if (data.telefono) {
          setTelefono(data.telefono);
          setEditTel(data.telefono);
        }
        // Siempre se sincroniza (incluso a null): si la postulación ya no
        // existe o cambió de estado, no debe quedarse pegada la anterior.
        setPost(data.postulacion ?? null);
      })
      .catch(() => {})
      .finally(() => setCargando(false));

    getCertificacionesApi()
      .then((data) => setCertificaciones(data.certificaciones ?? []))
      .catch(() => {});

    // Sincroniza el rol del usuario (ej. si un admin acaba de aprobar su
    // postulación, el token sigue siendo válido pero el rol local queda
    // desactualizado hasta refrescarlo).
    refrescarUsuario();
  }, [refrescarUsuario]);

  // Se recarga cada vez que la pestaña Perfil vuelve a tener foco, no solo
  // al montar — así una aprobación de admin se refleja sin tener que
  // cerrar sesión.
  useFocusEffect(cargar);

  const rolInfo      = ROL_INFO[usuario?.rol ?? 'ciudadano'];
  const esVoluntario = usuario?.rol === 'voluntario' || usuario?.rol === 'coordinador';
  const permisos     = PERMISOS[usuario?.rol ?? 'ciudadano'];

  // ── Handlers ──────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleGuardarEdit = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('Campo requerido', 'El email no puede estar vacío.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updatePerfilApi(editNombre.trim(), editEmail.trim().toLowerCase(), editTelefono.trim() || undefined);
      setTelefono(editTelefono.trim());
      setEditVisible(false);

      if (res.requiere_verificacion) {
        Alert.alert(
          '¡Listo! Verifica tu nuevo correo 📧',
          'Te enviamos un correo para verificar tu nuevo email. Debes verificarlo antes de volver a iniciar sesión.',
          [{ text: 'Entendido', onPress: () => logout() }],
        );
      } else {
        actualizarUsuario({ nombre: editNombre.trim(), telefono: editTelefono.trim() || undefined });
        Alert.alert('¡Listo!', 'Tu perfil fue actualizado correctamente.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePickCertificacion = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || !result.assets?.[0]) return;

    setSubiendoCert(true);
    try {
      const asset = result.assets[0];
      const nuevo = await uploadCertificacionApi(asset.uri, asset.name ?? 'certificado.pdf');
      setCertificaciones((prev) => [nuevo, ...prev]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir el certificado.');
    } finally {
      setSubiendoCert(false);
    }
  };

  const handleEliminarCert = (cert: Certificacion) => {
    Alert.alert('Eliminar certificado', `¿Eliminar "${cert.nombre_archivo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCertificacionApi(cert.id);
            setCertificaciones((prev) => prev.filter((c) => c.id !== cert.id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'No se pudo eliminar el certificado.');
          }
        },
      },
    ]);
  };

  const handlePickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (result.canceled) return;

    setSubiendoFoto(true);
    try {
      const { foto_url } = await uploadFotoApi(result.assets[0].uri);
      setFotoUrl(foto_url);
      actualizarUsuario({ fotoUrl: foto_url });
      Alert.alert('¡Listo!', 'Tu foto de perfil fue actualizada.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handlePostulacion = async () => {
    if (!postMotivo.trim()) {
      Alert.alert('Campo requerido', 'Por favor describe tu motivación.');
      return;
    }
    setSendingPost(true);
    try {
      await postulacionApi(postRol, postMotivo.trim());
      setPost({ id: 0, rol_solicitado: postRol, estado: 'Pendiente', motivo: postMotivo.trim() });
      setPostVisible(false);
      setPostMotivo('');
      Alert.alert(
        '¡Postulación enviada! 📋',
        'Tu solicitud está pendiente de revisión por un administrador. Te notificaremos cuando sea procesada.',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la postulación.');
    } finally {
      setSendingPost(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Mi Perfil</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Tarjeta usuario ── */}
        <View style={s.userCard}>
          <TouchableOpacity onPress={handlePickFoto} disabled={subiendoFoto} activeOpacity={0.85}>
            {subiendoFoto ? (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <ActivityIndicator color={BUTTON} />
              </View>
            ) : fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={s.avatar} resizeMode="cover" />
            ) : (
              <Image source={require('../../assets/default-user.png')} style={s.avatar} resizeMode="cover" />
            )}
            <View style={s.cameraOverlay}>
              <Image source={require('../../assets/camara.png')} style={s.cameraIcon} resizeMode="contain" />
            </View>
          </TouchableOpacity>

          <Text style={s.userName}>{usuario?.nombre}</Text>
          <Text style={s.userEmail}>{usuario?.email}</Text>
          {telefono ? <Text style={s.userTel}>📞 {telefono}</Text> : null}

          <View style={[s.rolBadge, { backgroundColor: rolInfo.color + '22' }]}>
            <Text style={s.rolEmoji}>{rolInfo.emoji}</Text>
            <Text style={[s.rolText, { color: rolInfo.color }]}>{rolInfo.label}</Text>
          </View>

          <TouchableOpacity
            style={s.editBtn}
            onPress={() => {
              setEditNombre(usuario?.nombre ?? '');
              setEditEmail(usuario?.email ?? '');
              setEditTel(telefono);
              setEditVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={s.editBtnInner}>
              <Image source={require('../../assets/lapiz.png')} style={s.editBtnIcon} resizeMode="contain" />
              <Text style={s.editBtnText}>Editar Perfil</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Estadísticas ── */}
        <View style={s.statsCard}>
          {cargando ? (
            <ActivityIndicator color={BUTTON} style={{ flex: 1, paddingVertical: 20 }} />
          ) : (
            <>
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.total_reportes}</Text>
                <Text style={s.statLabel}>Reportes{'\n'}creados</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statNum}>{stats.reportes_resueltos}</Text>
                <Text style={s.statLabel}>Reportes{'\n'}resueltos</Text>
              </View>
              {esVoluntario && (
                <>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={[s.statNum, { color: '#27AE60' }]}>{stats.capacitaciones_completadas}</Text>
                    <Text style={s.statLabel}>Cursos{'\n'}completados</Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* ── Postulación (ciudadanos → Voluntario; voluntarios → Especialista) ── */}
        {(usuario?.rol === 'ciudadano' || usuario?.rol === 'voluntario') && (
          <View style={s.card}>
            <View style={s.sectionRow}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionText}>
                {usuario?.rol === 'voluntario' ? '⭐  Postúlate como Especialista' : '🤝  Únete como Voluntario'}
              </Text>
            </View>
            {postulacion?.estado === 'Pendiente' ? (
              <View style={[s.postBadge, { backgroundColor: (ESTADO_POST_COLOR[postulacion.estado] ?? '#6B7C85') + '18' }]}>
                <Text style={[s.postEstado, { color: ESTADO_POST_COLOR[postulacion.estado] ?? '#6B7C85' }]}>
                  ⏳ Postulación como {postulacion.rol_solicitado}: {postulacion.estado}
                </Text>
                <Text style={s.postMotivo}>"{postulacion.motivo}"</Text>
                <Text style={s.postInfo}>Tu solicitud está siendo revisada por un administrador.</Text>
                <Text style={s.postInfo}>Mientras tanto, conservas los permisos de tu rol actual.</Text>
              </View>
            ) : (
              <>
                <Text style={s.postDesc}>
                  {usuario?.rol === 'voluntario'
                    ? 'Si ya cuentas con experiencia y certificaciones, postúlate para convertirte en especialista y coordinar equipos de respuesta.'
                    : 'Forma parte del equipo de respuesta a emergencias. Ayuda a tu comunidad como voluntario.'}
                </Text>
                <TouchableOpacity
                  style={s.postBtn}
                  onPress={() => {
                    setPostRol(usuario?.rol === 'voluntario' ? 'Especialista' : 'Voluntario');
                    setPostVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.postBtnText}>Enviar Postulación</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Permisos ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>{rolInfo.emoji}  ¿Qué puedo hacer?</Text>
          </View>
          {permisos.map((p, i) => {
            const Wrapper = p.screen ? TouchableOpacity : View;
            return (
              <Wrapper
                key={i}
                style={[s.permisoFila, i < permisos.length - 1 && s.permisoDivider]}
                {...(p.screen ? { onPress: () => nav.navigate(p.screen), activeOpacity: 0.7 } : {})}
              >
                <View style={s.checkCircle}>
                  <Text style={s.checkIcon}>✓</Text>
                </View>
                <Text style={s.permisoTexto}>{p.texto}</Text>
                {p.screen && <Text style={s.permisoChevron}>›</Text>}
              </Wrapper>
            );
          })}
        </View>

        {/* ── Certificaciones ── */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionText}>📄  Mis Certificaciones</Text>
          </View>

          {certificaciones.length === 0 && (
            <Text style={s.postDesc}>Aún no has subido certificados de cursos terminados.</Text>
          )}

          {certificaciones.map((cert) => (
            <View key={cert.id} style={s.certFila}>
              <Text style={s.certIcono}>📄</Text>
              <Text style={s.certNombre} numberOfLines={1}>{cert.nombre_archivo}</Text>
              <TouchableOpacity onPress={() => handleEliminarCert(cert)} style={s.certDeleteBtn} activeOpacity={0.7}>
                <Text style={s.certDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={s.pickCertBtn}
            onPress={handlePickCertificacion}
            disabled={subiendoCert}
            activeOpacity={0.8}
          >
            {subiendoCert
              ? <ActivityIndicator color={BUTTON} size="small" />
              : <Text style={s.pickCertText}>📎  Subir certificado (PDF)</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Cerrar sesión ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Modal editar perfil ── */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Editar Perfil</Text>

            <Text style={s.inputLabel}>Nombre completo</Text>
            <TextInput
              style={s.input}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Tu nombre"
              placeholderTextColor="#B0B8BC"
              maxLength={80}
            />

            <Text style={s.inputLabel}>Correo electrónico</Text>
            <TextInput
              style={s.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#B0B8BC"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.inputLabel}>Teléfono (opcional)</Text>
            <TextInput
              style={s.input}
              value={editTelefono}
              onChangeText={setEditTel}
              placeholder="10 dígitos"
              placeholderTextColor="#B0B8BC"
              keyboardType="phone-pad"
              maxLength={20}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setEditVisible(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={handleGuardarEdit} disabled={savingEdit} activeOpacity={0.85}>
                {savingEdit
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSaveText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal postulación ── */}
      <Modal visible={postVisible} animationType="slide" transparent onRequestClose={() => setPostVisible(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {usuario?.rol === 'voluntario' ? 'Postulación como Especialista' : 'Postulación como Voluntario'}
            </Text>
            <Text style={s.postModalDesc}>
              {usuario?.rol === 'voluntario'
                ? 'Cuéntanos por qué quieres ser especialista.'
                : 'Selecciona el rol al que deseas aplicar y cuéntanos por qué quieres ser parte del equipo.'}
            </Text>

            <Text style={s.inputLabel}>Rol solicitado</Text>
            <View style={s.rolSelector}>
              {(usuario?.rol === 'voluntario' ? ['Especialista'] as const : ['Voluntario', 'Especialista'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.rolOption, postRol === r && s.rolOptionActive]}
                  onPress={() => setPostRol(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.rolOptionText, postRol === r && s.rolOptionTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>¿Por qué quieres ser voluntario?</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={postMotivo}
              onChangeText={setPostMotivo}
              placeholder="Describe tu motivación, experiencia o habilidades relevantes..."
              placeholderTextColor="#B0B8BC"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => { setPostVisible(false); setPostMotivo(''); }} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={handlePostulacion} disabled={sendingPost} activeOpacity={0.85}>
                {sendingPost
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSaveText}>Enviar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
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

  scroll: { padding: 14, paddingBottom: 48 },

  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: HEADER },
  avatarPlaceholder: { backgroundColor: '#E8EDEF', alignItems: 'center', justifyContent: 'center' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BUTTON,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  cameraIcon: { width: 14, height: 14 },
  userName:   { fontSize: 20, fontWeight: '700', color: TITULO, marginTop: 10, marginBottom: 2 },
  userEmail:  { fontSize: 13, color: TEXT, marginBottom: 4 },
  userTel:    { fontSize: 13, color: TEXT, marginBottom: 8 },
  rolBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  rolEmoji:   { fontSize: 15 },
  rolText:    { fontWeight: '700', fontSize: 13 },
  editBtn:      { borderWidth: 1.5, borderColor: BUTTON, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  editBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBtnIcon:  { width: 16, height: 16 },
  editBtnText:  { fontSize: 13, fontWeight: '600', color: BUTTON },

  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem:    { alignItems: 'center', flex: 1 },
  statNum:     { fontSize: 28, fontWeight: '800', color: BUTTON, marginBottom: 4 },
  statLabel:   { fontSize: 11, color: TEXT, textAlign: 'center', lineHeight: 15 },
  statDivider: { width: 1, backgroundColor: DIVIDER, alignSelf: 'stretch' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 3, height: 18, backgroundColor: BUTTON, borderRadius: 2 },
  sectionText:   { fontSize: 14, fontWeight: '700', color: TITULO },

  postBadge:   { borderRadius: 10, padding: 14 },
  postEstado:  { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  postMotivo:  { fontSize: 13, color: TEXT, fontStyle: 'italic', marginBottom: 6 },
  postInfo:    { fontSize: 12, color: TEXT },
  postDesc:    { fontSize: 13, color: TEXT, lineHeight: 20, marginBottom: 14 },
  postBtn:     { backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  permisoFila:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  permisoDivider:{ borderBottomWidth: 1, borderBottomColor: DIVIDER },
  checkCircle:   { width: 22, height: 22, borderRadius: 11, backgroundColor: BUTTON + '22', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkIcon:     { fontSize: 12, color: BUTTON, fontWeight: '700' },
  permisoTexto:  { flex: 1, fontSize: 13, color: TEXT, lineHeight: 20 },
  permisoChevron:{ fontSize: 18, color: BUTTON, fontWeight: '700', marginLeft: 4 },

  certFila: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  certIcono:  { fontSize: 16 },
  certNombre: { flex: 1, fontSize: 13, color: TITULO },
  certDeleteBtn:  { padding: 4 },
  certDeleteText: { fontSize: 15 },
  pickCertBtn: {
    borderWidth: 1.5,
    borderColor: BUTTON,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  pickCertText: { fontSize: 13, fontWeight: '600', color: BUTTON },

  logoutBtn: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modales
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: TITULO, marginBottom: 18 },
  postModalDesc: { fontSize: 13, color: TEXT, lineHeight: 20, marginBottom: 16 },
  inputLabel:    { fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 6 },
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
  textArea:    { height: 110, paddingTop: 12 },
  rolSelector: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  rolOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
  },
  rolOptionActive:     { borderColor: BUTTON, backgroundColor: BUTTON + '18' },
  rolOptionText:       { fontSize: 13, fontWeight: '600', color: TEXT },
  rolOptionTextActive: { color: BUTTON },
  modalBtns:      { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: DIVIDER, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText:{ fontSize: 14, fontWeight: '600', color: TEXT },
  modalSaveBtn:   { flex: 1, backgroundColor: BUTTON, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalSaveText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
