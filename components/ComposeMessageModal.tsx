import { Feather } from "@expo/vector-icons";
import { useListUsers, getListUsersQueryKey, useSendMessage } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function ComposeMessageModal({ visible, onClose, onSent }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const { data: users } = useListUsers({ query: { enabled: visible, queryKey: getListUsersQueryKey() } });
  const { mutate: sendMessage, isPending } = useSendMessage();

  const selectedUser = recipientId != null ? users?.find((u) => u.id === recipientId) : null;

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      Alert.alert("Error", "El contenido del mensaje es requerido.");
      return;
    }

    sendMessage(
      {
        data: {
          type: recipientId == null ? "publico" : "privado",
          toUserId: recipientId ?? undefined,
          subject: subject.trim() || undefined,
          content: trimmedContent,
        },
      },
      {
        onSuccess: () => {
          setRecipientId(null);
          setSubject("");
          setContent("");
          onSent?.();
          onClose();
        },
        onError: () => {
          Alert.alert("Error", "No se pudo enviar el mensaje. Inténtalo de nuevo.");
        },
      }
    );
  };

  const handleClose = () => {
    if (isPending) return;
    setRecipientId(null);
    setSubject("");
    setContent("");
    setShowUserPicker(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 16,
              borderBottomColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} disabled={isPending}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Redactar mensaje</Text>
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              { backgroundColor: isPending || !content.trim() ? `${colors.primary}40` : colors.primary },
            ]}
            disabled={isPending || !content.trim()}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={15} color="#fff" />
            )}
            <Text style={styles.sendBtnTxt}>{isPending ? "Enviando..." : "Enviar"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Recipient */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DESTINATARIO</Text>
            <TouchableOpacity
              style={[styles.recipientBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowUserPicker((v) => !v)}
            >
              <Feather
                name={recipientId == null ? "globe" : "user"}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.recipientTxt, { color: colors.foreground }]}>
                {recipientId == null ? "Todos los usuarios (público)" : selectedUser?.name ?? "..."}
              </Text>
              <Feather name={showUserPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
            </TouchableOpacity>

            {showUserPicker && (
              <View style={[styles.pickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* All users option */}
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    recipientId == null && { backgroundColor: `${colors.primary}12` },
                  ]}
                  onPress={() => { setRecipientId(null); setShowUserPicker(false); }}
                >
                  <Feather name="globe" size={14} color={colors.primary} />
                  <Text style={[styles.pickerItemTxt, { color: colors.foreground }]}>
                    Todos los usuarios (público)
                  </Text>
                  {recipientId == null && <Feather name="check" size={14} color={colors.primary} />}
                </TouchableOpacity>

                {/* Individual users */}
                {users?.filter((u) => u.role !== "admin").map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.border },
                      recipientId === u.id && { backgroundColor: `${colors.primary}12` },
                    ]}
                    onPress={() => { setRecipientId(u.id); setShowUserPicker(false); }}
                  >
                    <Feather name="user" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.pickerItemTxt, { color: colors.foreground }]} numberOfLines={1}>
                      {u.name}
                    </Text>
                    <Text style={[styles.pickerItemEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {u.email}
                    </Text>
                    {recipientId === u.id && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Subject */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ASUNTO (opcional)</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Escribe un asunto..."
              placeholderTextColor={colors.mutedForeground}
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
              returnKeyType="next"
            />
          </View>

          {/* Content */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MENSAJE *</Text>
            <TextInput
              style={[
                styles.textarea,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Escribe el contenido del mensaje..."
              placeholderTextColor={colors.mutedForeground}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              numberOfLines={6}
            />
          </View>

          {/* Info chip */}
          <View style={[styles.infoChip, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.infoTxt, { color: colors.primary }]}>
              {recipientId == null
                ? "Este mensaje será visible para todos los participantes."
                : `Este mensaje será privado y solo lo verá ${selectedUser?.name ?? "el usuario seleccionado"}.`}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  sendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  sendBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  body: { padding: 20, gap: 20 },
  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  recipientBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  recipientTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  pickerList: {
    borderRadius: 10, borderWidth: 1, overflow: "hidden", marginTop: 4,
  },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1,
  },
  pickerItemTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  pickerItemEmail: { fontSize: 11, fontFamily: "Inter_400Regular", maxWidth: 120 },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
    minHeight: 140,
  },
  infoChip: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  infoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
