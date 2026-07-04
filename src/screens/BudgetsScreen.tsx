import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Modal, TextInput, TouchableOpacity,
  StyleSheet, Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native'
import { COLORS } from '../theme'
import { CATEGORIES, ICONS } from '../utils/constants'
import { fmt, mkKey } from '../utils/currency'
import CategoryPicker from '../components/CategoryPicker'
import type { Transaction, Budgets, CurrencyId } from '../types'

const { height: SH } = Dimensions.get('window')

interface Props {
  transactions: Transaction[]
  budgets: Budgets
  onSaveBudget: (category: string, amount: number) => void
  currentMonth: Date
  theme: 'dark' | 'light'
  currency: CurrencyId
}

export default function BudgetsScreen({ transactions, budgets, onSaveBudget, currentMonth, theme, currency }: Props) {
  const C = COLORS[theme]
  const monthKey = mkKey(currentMonth)
  const slide = useRef(new Animated.Value(SH)).current

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === 'expense' && t.date.startsWith(monthKey))
        map[t.category] = (map[t.category] || 0) + t.amount
    }
    return map
  }, [transactions, monthKey])

  const [modalVisible, setModalVisible] = useState(false)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState(CATEGORIES.expense[0])
  const [amountText, setAmountText] = useState('')

  useEffect(() => {
    Animated.timing(slide, {
      toValue: modalVisible ? 0 : SH,
      duration: modalVisible ? 280 : 220,
      useNativeDriver: true,
    }).start()
  }, [modalVisible])

  const openAdd = () => {
    setEditingCat(null)
    setSelectedCat(CATEGORIES.expense[0])
    setAmountText('')
    setModalVisible(true)
  }

  const openEdit = (cat: string) => {
    setEditingCat(cat)
    setSelectedCat(cat)
    setAmountText(String(budgets[cat]))
    setModalVisible(true)
  }

  const handleSave = () => {
    const amt = parseFloat(amountText.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) return
    onSaveBudget(selectedCat, amt)
    setModalVisible(false)
  }

  const entries = Object.entries(budgets)
  const totalBudget = entries.reduce((s, [, v]) => s + v, 0)
  const totalSpent = entries.reduce((s, [cat]) => s + (spentMap[cat] || 0), 0)
  const globalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {entries.length > 0 && (
        <View style={[st.summary, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={st.summaryRow}>
            <View>
              <Text style={[st.summaryLabel, { color: C.text2 }]}>Total dépensé</Text>
              <Text style={[st.summaryVal, { color: C.red }]}>{fmt(totalSpent, currency)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[st.summaryLabel, { color: C.text2 }]}>Budget total</Text>
              <Text style={[st.summaryVal, { color: C.text }]}>{fmt(totalBudget, currency)}</Text>
            </View>
          </View>
          <View style={[st.globalBarBg, { backgroundColor: C.surface2 }]}>
            <View style={[st.globalBarFill, { width: `${globalPct}%`, backgroundColor: globalPct < 75 ? C.green : globalPct < 100 ? C.orange : C.red }]} />
          </View>
          <Text style={[st.globalPct, { color: C.text2 }]}>{Math.round(globalPct)}% utilisé</Text>
        </View>
      )}

      {entries.length === 0 ? (
        <View style={st.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
          <Text style={[st.emptyTitle, { color: C.text }]}>Aucun budget</Text>
          <Text style={[st.emptyText, { color: C.text2 }]}>Définissez des budgets pour suivre vos dépenses par catégorie.</Text>
          <TouchableOpacity style={[st.emptyBtn, { backgroundColor: C.primary }]} onPress={openAdd}>
            <Text style={st.emptyBtnText}>Créer un budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
          {entries.map(([cat, budget]) => {
            const spent = spentMap[cat] || 0
            const pct = budget > 0 ? (spent / budget) * 100 : 0
            const barColor = pct < 75 ? C.green : pct < 100 ? C.orange : C.red
            return (
              <BudgetCard
                key={cat} category={cat} icon={ICONS[cat] || '📁'}
                spent={spent} budget={budget} pct={pct}
                barColor={barColor} C={C} currency={currency}
                onPress={() => openEdit(cat)}
              />
            )
          })}
        </ScrollView>
      )}

      {entries.length > 0 && (
        <TouchableOpacity style={[st.fab, { backgroundColor: C.primary }]} onPress={openAdd} activeOpacity={0.85}>
          <Text style={st.fabText}>＋</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={st.overlay} onPress={() => setModalVisible(false)}>
            <Animated.View
              onStartShouldSetResponder={() => true}
              style={[st.sheet, { backgroundColor: C.surface, borderColor: C.border }, { transform: [{ translateY: slide }] }]}
            >
              <View style={[st.handle, { backgroundColor: C.border }]} />
              <View style={st.sheetTitleRow}>
                <Text style={[st.sheetTitle, { color: C.text }]}>{editingCat ? 'Modifier le budget' : 'Nouveau budget'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={[st.closeBtn, { backgroundColor: C.surface2 }]}>
                  <Text style={[{ fontSize: 13, fontWeight: '600' }, { color: C.text2 }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[st.label, { color: C.text2 }]}>Catégorie</Text>
              <CategoryPicker
                categories={CATEGORIES.expense}
                selected={selectedCat}
                onSelect={setSelectedCat}
                theme={theme}
              />

              <Text style={[st.label, { color: C.text2 }]}>Montant mensuel</Text>
              <TextInput
                style={[st.input, { backgroundColor: C.surface2, color: C.text, borderColor: C.border }]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={C.text2}
                value={amountText}
                onChangeText={setAmountText}
                returnKeyType="done"
              />

              <TouchableOpacity style={[st.saveBtn, { backgroundColor: C.primary }]} onPress={handleSave} activeOpacity={0.85}>
                <Text style={st.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

function BudgetCard({ category, icon, spent, budget, pct, barColor, C, currency, onPress }: {
  category: string; icon: string; spent: number; budget: number; pct: number
  barColor: string; C: Record<string, string>; currency: CurrencyId; onPress: () => void
}) {
  const widthAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(widthAnim, { toValue: Math.min(pct, 100), duration: 500, useNativeDriver: false }).start()
  }, [pct])

  const remaining = budget - spent
  return (
    <TouchableOpacity style={[st.card, { backgroundColor: C.surface, borderColor: C.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={st.cardRow}>
        <View style={[st.cardIconWrap, { backgroundColor: C.surface2 }]}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={st.cardTop}>
            <Text style={[st.cardCat, { color: C.text }]} numberOfLines={1}>{category}</Text>
            <Text style={[st.cardPct, { color: pct >= 100 ? C.red : C.text2 }]}>{Math.round(pct)}%</Text>
          </View>
          <Text style={[st.cardAmts, { color: C.text2 }]}>
            {fmt(spent, currency)} <Text style={{ color: C.text2 }}>/ {fmt(budget, currency)}</Text>
          </Text>
        </View>
      </View>
      <View style={[st.barBg, { backgroundColor: C.surface2 }]}>
        <Animated.View style={[st.barFill, { backgroundColor: barColor, width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={[st.remaining, { color: remaining >= 0 ? C.text2 : C.red }]}>
        {remaining >= 0 ? `Reste ${fmt(remaining, currency)}` : `Dépassé de ${fmt(Math.abs(remaining), currency)}`}
      </Text>
    </TouchableOpacity>
  )
}

const st = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  summaryVal: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  globalBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  globalBarFill: { height: '100%', borderRadius: 3 },
  globalPct: { fontSize: 11, fontWeight: '500', marginTop: 6, textAlign: 'right' },
  list: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCat: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardPct: { fontSize: 13, fontWeight: '700' },
  cardAmts: { fontSize: 12, marginTop: 2 },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  remaining: { fontSize: 12, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20, paddingBottom: 36,
    maxHeight: SH * 0.85,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16, marginBottom: 20,
  },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
