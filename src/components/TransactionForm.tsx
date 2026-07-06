import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Modal, Animated, Alert, StyleSheet, Dimensions,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type Transaction, type CurrencyId } from '../types'
import { CATEGORIES } from '../utils/constants'
import { COLORS } from '../theme'
import { CURRENCIES as CUR } from '../utils/currency'
import CategoryPicker from './CategoryPicker'

const { height: SH } = Dimensions.get('window')

interface FormState {
  type: 'income' | 'expense'
  category: string
  customCategory: string
  amount: string
  date: string
  note: string
}

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  visible: boolean
  editTx: Transaction | null
  theme: 'dark' | 'light'
  currency: CurrencyId
  onSave: (tx: Omit<Transaction, 'id'>) => void
  onEdit: (id: number, tx: Omit<Transaction, 'id'>) => void
  onClose: () => void
}

export default function TransactionForm({ visible, editTx, theme, currency, onSave, onEdit, onClose }: Props) {
  const C = COLORS[theme]
  const insets = useSafeAreaInsets()
  const slide = useRef(new Animated.Value(SH)).current
  const [form, setForm] = useState<FormState>({
    type: 'expense', category: '', customCategory: '', amount: '', date: today(), note: '',
  })
  const [showSuggestions, setShowSuggestions] = useState(true)

  useEffect(() => {
    if (!visible) return
    if (editTx) {
      setForm({
        type: editTx.type,
        category: editTx.category,
        customCategory: editTx.category,
        amount: String(editTx.amount),
        date: editTx.date,
        note: editTx.note,
      })
      setShowSuggestions(false)
    } else {
      setForm({ type: 'expense', category: '', customCategory: '', amount: '', date: today(), note: '' })
      setShowSuggestions(true)
    }
    slide.setValue(SH)
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 240 }).start()
  }, [visible, editTx])

  const close = useCallback(() => {
    Animated.timing(slide, { toValue: SH, duration: 200, useNativeDriver: true }).start(onClose)
  }, [onClose])

  const submit = useCallback(() => {
    const amount = parseFloat(form.amount.replace(',', '.'))
    const finalCategory = form.category.trim() || form.customCategory.trim()
    if (!finalCategory) { Alert.alert('Catégorie manquante', 'Veuillez saisir une catégorie.'); return }
    if (isNaN(amount) || amount <= 0) { Alert.alert('Montant invalide', 'Entrez un montant supérieur à 0.'); return }
    const txCurrency = editTx?.currency ?? currency
    const tx: Omit<Transaction, 'id'> = { type: form.type, category: finalCategory, amount, currency: txCurrency, date: form.date, note: form.note }
    if (editTx) onEdit(editTx.id, tx)
    else onSave(tx)
    Animated.timing(slide, { toValue: SH, duration: 200, useNativeDriver: true }).start(onClose)
  }, [form, editTx, onSave, onEdit, onClose])

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const switchType = (t: 'income' | 'expense') => {
    setForm(f => ({ ...f, type: t, category: '', customCategory: '' }))
    setShowSuggestions(true)
  }

  const selectCategory = (cat: string) => {
    setForm(f => ({ ...f, category: cat, customCategory: cat }))
    setShowSuggestions(false)
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <Animated.View
            onStartShouldSetResponder={() => true}
            style={[s.sheet, { backgroundColor: C.surface, borderColor: C.border }, { transform: [{ translateY: slide }] }]}
          >
            <View style={[s.handle, { backgroundColor: C.border }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            >
              {/* Titre */}
              <View style={s.titleRow}>
                <Text style={[s.title, { color: C.text }]}>
                  {editTx ? 'Modifier' : 'Nouvelle transaction'}
                </Text>
                <TouchableOpacity onPress={close} style={[s.closeBtn, { backgroundColor: C.surface2 }]}>
                  <Text style={[s.closeBtnText, { color: C.text2 }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Type toggle */}
              <View style={[s.typeRow, { backgroundColor: C.surface2 }]}>
                {(['expense', 'income'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeBtn, form.type === t && { backgroundColor: t === 'income' ? C.green : C.red }]}
                    onPress={() => switchType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.typeBtnText, { color: form.type === t ? '#fff' : C.text2 }]}>
                      {t === 'income' ? '💰  Entrée' : '💸  Sortie'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Catégorie */}
              <Text style={[s.label, { color: C.text2 }]}>Catégorie</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.surface2, color: C.text, borderColor: C.border }]}
                placeholder="Ex: Salaire, Loyer, Épicerie..."
                placeholderTextColor={C.text2}
                value={form.customCategory || form.category}
                onChangeText={v => setForm(f => ({ ...f, customCategory: v, category: v }))}
                returnKeyType="done"
              />
              {showSuggestions && CATEGORIES[form.type].length > 0 && (
                <View style={s.suggestionsWrap}>
                  <Text style={[s.suggestionsLabel, { color: C.text2 }]}>Suggestions :</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                    {CATEGORIES[form.type].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.chip, { backgroundColor: C.surface, borderColor: C.border }]}
                        onPress={() => selectCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipText, { color: C.text }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Montant */}
              <Text style={[s.label, { color: C.text2 }]}>Montant</Text>
              <View style={[s.amountRow, { backgroundColor: C.surface2, borderColor: C.border }]}>
                <Text style={[s.currencyBadge, { color: C.primary }]}>
                  {CUR[editTx?.currency ?? currency].label}
                </Text>
                <TextInput
                  style={[s.amountInput, { color: C.text }]}
                  placeholder="0.00"
                  placeholderTextColor={C.text2}
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={set('amount')}
                  returnKeyType="done"
                />
              </View>

              {/* Date */}
              <Text style={[s.label, { color: C.text2 }]}>Date</Text>
              <TextInput
                style={[s.input, { backgroundColor: C.surface2, color: C.text, borderColor: C.border }]}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={C.text2}
                value={form.date}
                onChangeText={set('date')}
                returnKeyType="done"
              />

              {/* Note */}
              <Text style={[s.label, { color: C.text2 }]}>
                Note <Text style={{ fontWeight: '400' }}>(optionnelle)</Text>
              </Text>
              <TextInput
                style={[s.input, s.noteInput, { backgroundColor: C.surface2, color: C.text, borderColor: C.border }]}
                placeholder="Ajouter une note..."
                placeholderTextColor={C.text2}
                value={form.note}
                onChangeText={set('note')}
                multiline
                returnKeyType="done"
              />

              {/* Bouton */}
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: form.type === 'income' ? C.green : C.primary }]}
                onPress={submit}
                activeOpacity={0.85}
              >
                <Text style={s.submitText}>{editTx ? 'Enregistrer les modifications' : 'Ajouter'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    maxHeight: SH * 0.94,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '600' },
  typeRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  suggestionsWrap: { marginBottom: 16 },
  suggestionsLabel: { fontSize: 11, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  input: {
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16, marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16, overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontWeight: '700',
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(128,128,128,0.3)',
  },
  amountInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  submitBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
