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
import { AuthStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const TITULO  = '#0E3A44';
const BUTTON  = '#1AA6A6';
const DIVIDER = '#D9D9D9';
const TEXT    = '#6B7C85';

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando]       = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    setEnviando(true);
    const result = await login(email.trim().toLowerCase(), password);
    setEnviando(false);
    if (!result.ok) Alert.alert('Error al iniciar sesión', result.error ?? 'Credenciales incorrectas');
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding centrado */}
        <View style={s.branding}>
          <Image
            source={require('../../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.appName}>GUARDIAN ZERO</Text>
          <Text style={s.appSub}>Sistema de Reportes de Emergencia</Text>
        </View>

        {/* Tarjeta del formulario */}
        <View style={s.formCard}>
          <Text style={s.formTitulo}>Iniciar Sesión</Text>
          <Text style={s.formSub}>Ingresa tus credenciales para continuar</Text>

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
                style={[s.input, s.inputConPadding]}
                placeholder="••••••••"
                placeholderTextColor="#B0B8BC"
                secureTextEntry={!verPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setVerPassword(!verPassword)}
                activeOpacity={0.7}
              >
                <Image
                  source={require('../../assets/ocultar_contra.png')}
                  style={[s.eyeIcon, verPassword && s.eyeIconActivo]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón */}
          <TouchableOpacity style={s.btnPrimary} onPress={handleLogin} activeOpacity={0.85} disabled={enviando}>
            {enviando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Iniciar Sesión</Text>}
          </TouchableOpacity>
        </View>

        {/* Link a registro */}
        <View style={s.linkRow}>
          <Text style={s.linkText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.link}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F8' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  /* Branding */
  branding: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 90, height: 90, marginBottom: 14 },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: TITULO,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  appSub: { fontSize: 12, color: TEXT, textAlign: 'center' },

  /* Formulario */
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  formTitulo: { fontSize: 20, fontWeight: '800', color: TITULO, textAlign: 'center', marginBottom: 4 },
  formSub: { fontSize: 12, color: TEXT, textAlign: 'center', marginBottom: 22 },

  /* Campos */
  campo: { marginBottom: 16 },
  campoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TITULO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  inputRow: { position: 'relative' },
  input: {
    backgroundColor: '#F8FAFB',
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TITULO,
  },
  inputConPadding: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 14, top: 12, padding: 4 },
  eyeIcon: { width: 24, height: 24, opacity: 0.3 },
  eyeIconActivo: { opacity: 1, tintColor: BUTTON },

  /* Botón */
  btnPrimary: {
    backgroundColor: BUTTON,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: BUTTON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Links */
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  linkText: { color: TEXT, fontSize: 14 },
  link: { color: BUTTON, fontSize: 14, fontWeight: '700' },
});
