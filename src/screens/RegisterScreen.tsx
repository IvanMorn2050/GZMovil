import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RolUsuario } from '../types';
import { useAuth } from '../hooks/useAuth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const HEADER  = '#B6C3C9';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

const ROLES: { valor: RolUsuario; titulo: string; desc: string; emoji: string }[] = [
  { valor: 'ciudadano',  titulo: 'Ciudadano',  desc: 'Reporta desastres en tu comunidad', emoji: '🏘️' },
  { valor: 'voluntario', titulo: 'Voluntario', desc: 'Atiende emergencias en el campo',   emoji: '🤝' },
];

export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { register } = useAuth();

  const [nombre, setNombre]         = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmar, setConfirmar]   = useState('');
  const [rol, setRol]               = useState<RolUsuario>('ciudadano');
  const [verPass, setVerPass]       = useState(false);
  const [verConf, setVerConf]       = useState(false);
  const [enviando, setEnviando]     = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmar.trim()) {
      Alert.alert('Campos requeridos', 'Completa todos los campos.');
      return;
    }
    if (password !== confirmar) { Alert.alert('Error', 'Las contraseñas no coinciden.'); return; }
    if (password.length < 8)   { Alert.alert('Error', 'Mínimo 8 caracteres.'); return; }

    setEnviando(true);
    const res = await register(nombre.trim(), email.trim().toLowerCase(), password, rol);
    setEnviando(false);

    if (res.success) {
      Alert.alert(
        '¡Registro exitoso! ✅',
        'Te enviamos un correo de verificación. Revisa tu bandeja de entrada y activa tu cuenta antes de iniciar sesión.',
        [{ text: 'Ir al login', onPress: () => navigation.navigate('Login') }],
      );
    } else {
      Alert.alert('Error al registrar', res.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header con botón volver */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>GUARDIAN ZERO</Text>
          <Text style={s.headerSub}>Crear nueva cuenta</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Text style={s.titulo}>Crear Cuenta</Text>
        <Text style={s.subtitulo}>Selecciona cómo quieres participar en GuardianZero.</Text>

        {/* Selector de rol */}
        <View style={s.rolesRow}>
          {ROLES.map((r) => {
            const activo = rol === r.valor;
            return (
              <TouchableOpacity
                key={r.valor}
                style={[s.rolCard, activo && s.rolCardActivo]}
                onPress={() => setRol(r.valor)}
                activeOpacity={0.8}
              >
                <Text style={s.rolEmoji}>{r.emoji}</Text>
                <Text style={[s.rolTitulo, activo && s.rolTituloActivo]}>{r.titulo}</Text>
                <Text style={s.rolDesc}>{r.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nombre */}
        <View style={s.campo}>
          <Text style={s.campoLabel}>Nombre completo</Text>
          <TextInput
            style={s.input}
            placeholder="Tu nombre"
            placeholderTextColor="#B0B8BC"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        {/* Email */}
        <View style={s.campo}>
          <Text style={s.campoLabel}>Correo electrónico</Text>
          <TextInput
            style={s.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#B0B8BC"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Contraseña */}
        <View style={s.campo}>
          <Text style={s.campoLabel}>Contraseña</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, s.inputFlex]}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#B0B8BC"
              secureTextEntry={!verPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setVerPass(!verPass)} activeOpacity={0.7}>
              <Image
                source={require('../../assets/ocultar_contra.png')}
                style={[s.eyeIcon, verPass && s.eyeIconActivo]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmar contraseña */}
        <View style={s.campo}>
          <Text style={s.campoLabel}>Confirmar contraseña</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, s.inputFlex]}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#B0B8BC"
              secureTextEntry={!verConf}
              value={confirmar}
              onChangeText={setConfirmar}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setVerConf(!verConf)} activeOpacity={0.7}>
              <Image
                source={require('../../assets/ocultar_contra.png')}
                style={[s.eyeIcon, verConf && s.eyeIconActivo]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón registrar */}
        <TouchableOpacity style={s.btnPrimary} onPress={handleRegister} activeOpacity={0.85} disabled={enviando}>
          {enviando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Registrarse como {rol === 'voluntario' ? 'Voluntario' : 'Ciudadano'}</Text>}
        </TouchableOpacity>

        <View style={s.linkRow}>
          <Text style={s.linkText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.link}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backBtn: { padding: 6 },
  backIcon: { fontSize: 22, color: TITULO, fontWeight: '700' },
  logo: { width: 36, height: 36 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TITULO, letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: TITULO, opacity: 0.65, marginTop: 1 },

  scroll: { padding: 24, paddingTop: 24, paddingBottom: 48 },

  titulo: { fontSize: 22, fontWeight: '800', color: TITULO, marginBottom: 6 },
  subtitulo: { fontSize: 13, color: TEXT, lineHeight: 19, marginBottom: 22 },

  /* Roles */
  rolesRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  rolCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 4,
  },
  rolCardActivo: { borderColor: BUTTON, backgroundColor: BUTTON + '12' },
  rolEmoji: { fontSize: 28, marginBottom: 4 },
  rolTitulo: { fontSize: 13, fontWeight: '700', color: TEXT },
  rolTituloActivo: { color: TITULO },
  rolDesc: { fontSize: 11, color: TEXT, textAlign: 'center', lineHeight: 15 },

  /* Campos */
  campo: { marginBottom: 16 },
  campoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TITULO,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { position: 'relative' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TITULO,
  },
  inputFlex: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 14, top: 12, padding: 4 },
  eyeIcon: { width: 24, height: 24, opacity: 0.3 },
  eyeIconActivo: { opacity: 1, tintColor: BUTTON },

  btnPrimary: {
    backgroundColor: BUTTON,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: BUTTON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  linkText: { color: TEXT, fontSize: 14 },
  link: { color: BUTTON, fontSize: 14, fontWeight: '700' },
});
