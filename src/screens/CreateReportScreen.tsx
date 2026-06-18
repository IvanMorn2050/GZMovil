import React, { useState } from 'react';
import {
  Alert,
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
import { useAuth } from '../hooks/useAuth';
import { crearReporte } from '../services/reporteService';
import { TipoDesastre } from '../types';

const TIPOS: { valor: TipoDesastre; emoji: string; color: string }[] = [
  { valor: 'Terremoto',       emoji: '🌋', color: '#8B4513' },
  { valor: 'Inundación',      emoji: '🌧️', color: '#1565C0' },
  { valor: 'Incendio Forestal', emoji: '🔥', color: '#E65100' },
  { valor: 'Huracán',         emoji: '🌀', color: '#6A1B9A' },
  { valor: 'Deslizamiento',   emoji: '⛰️', color: '#5D4037' },
  { valor: 'Tsunami',         emoji: '🌊', color: '#0D47A1' },
];

export default function CreateReportScreen() {
  const navigation = useNavigation();
  const { usuario } = useAuth();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [tipo, setTipo] = useState<TipoDesastre | null>(null);

  const handleSubmit = () => {
    if (!titulo.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el título del reporte.');
      return;
    }
    if (!ubicacion.trim()) {
      Alert.alert('Campo requerido', 'Ingresa la ubicación del desastre.');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Campo requerido', 'Ingresa la descripción del evento.');
      return;
    }
    if (!tipo) {
      Alert.alert('Campo requerido', 'Selecciona el tipo de desastre.');
      return;
    }

    crearReporte(titulo.trim(), descripcion.trim(), tipo, ubicacion.trim(), usuario!.id, usuario!.nombre);

    Alert.alert(
      '¡Reporte enviado!',
      `Se registró la alerta de "${tipo}" en ${ubicacion}. Los voluntarios serán notificados.`,
      [{ text: 'Aceptar', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar Desastre</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.aviso}>⚠️  Solo reporta eventos reales. Los datos son usados por voluntarios en campo.</Text>

        <Text style={styles.label}>Tipo de desastre *</Text>
        <View style={styles.tiposGrid}>
          {TIPOS.map((t) => {
            const activo = tipo === t.valor;
            return (
              <TouchableOpacity
                key={t.valor}
                style={[
                  styles.tipoBtn,
                  { borderColor: t.color + '60', backgroundColor: activo ? t.color : t.color + '12' },
                ]}
                onPress={() => setTipo(t.valor)}
                activeOpacity={0.8}
              >
                <Text style={styles.tipoEmoji}>{t.emoji}</Text>
                <Text style={[styles.tipoBtnText, { color: activo ? '#fff' : t.color }]}>
                  {t.valor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Título del reporte *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Sismo de 5.8 grados cerca de la costa"
          placeholderTextColor="#aab4bc"
          value={titulo}
          onChangeText={setTitulo}
          maxLength={100}
        />

        <Text style={styles.label}>Ubicación *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ciudad, Estado, País"
          placeholderTextColor="#aab4bc"
          value={ubicacion}
          onChangeText={setUbicacion}
          maxLength={80}
        />

        <Text style={styles.label}>Descripción del evento *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe lo que está ocurriendo: magnitud, afectados, daños observados..."
          placeholderTextColor="#aab4bc"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={descripcion}
          onChangeText={setDescripcion}
          maxLength={500}
        />

        <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.btnSubmitText}>🚨  Enviar Alerta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#3ab5c6';
const DARK = '#0d4f5c';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 18,
  },
  backBtn: { padding: 4 },
  backText: { color: '#a8d8e0', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  form: { padding: 20, paddingBottom: 48 },
  aviso: {
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    color: '#7a5f00',
    marginBottom: 22,
    lineHeight: 18,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#4a6470', marginBottom: 10 },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tipoBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '30%',
    alignItems: 'center',
    gap: 4,
  },
  tipoEmoji: { fontSize: 20 },
  tipoBtnText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: '#f0f4f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1a2730',
    marginBottom: 20,
  },
  textarea: { height: 120, paddingTop: 13 },
  btnSubmit: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  btnSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
