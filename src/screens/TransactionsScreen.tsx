import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Modal, Animated, Alert, StyleSheet, Dimensions, Pressable,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type Transaction, type CurrencyId } from '../types'
import { ICONS, MONTHS_SHORT } from '../utils/constants'
import { fmt, convert } from '../utils/currency'
import { COLORS } from '../theme'
import AmountText from '../components/AmountText'

const { height: SH } = Dimensions.get('window')

interface Props {
  transactions: Transaction[]
  onDeleteTx: (id: number) => void
  onEditTransaction: (tx: Transaction) => void
  theme: 'dark' | 'light'
  currency: CurrencyId
  hideBalance?: boolean
}

type Filter = 'all' | 'income' | 'expense'

function fmtDate(s: string): string {
  try {
    const [, m, d] = s.split('-')
    return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`
  } catch { return s }
}

export default function TransactionsScreen({ transactions, onDeleteTx, onEditTransaction, theme, currency, hideBalance }: Props) {
  const C = COLORS[theme]
  const insets = useSafeAreaInsets()
  const slide = useRef(new Animated.Value(SH)).current
  const tabBarHeight = useBottomTabBarHeight()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [actionTx, setActionTx] = useState<Transaction | null>(null)
  const [showAction, setShowAction] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...transactions]
      .reverse()
      .filter(t => {
        if (filter === 'income' && t.type !== 'income') return false
        if (filter === 'expense' && t.type !== 'expense') return false
        if (!q) return true
        return t.category.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)
      })
  }, [transactions, search, filter])

  // Totaux convertis dans la devise d'affichage
  const totals = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency ?? currency, currency), 0)
    const exp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency ?? currency, currency), 0)
    return { inc, exp, net: inc - exp }
  }, [transactions, currency])

  const openAction = useCallback((tx: Transaction) => {
    setActionTx(tx)
    setShowAction(true)
    slide.setValue(SH)
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 240 }).start()
  }, [])

  const closeAction = useCallback((cb?: () => void) => {
    Animated.timing(slide, { toValue: SH, duration: 200, useNativeDriver: true }).start(() => {
      setShowAction(false)
      setActionTx(null)
      cb?.()
    })
  }, [])

  const handleEdit = useCallback(() => {
    const tx = actionTx
    closeAction(() => { if (tx) setTimeout(() => onEditTransaction(tx), 50) })
  }, [actionTx, closeAction, onEditTransaction])

  const handleDelete = useCallback(() => {
    const tx = actionTx
    if (!tx) return
    Alert.alert('Supprimer ?', `"${tx.category}" — ${hideBalance ? '••••' : fmt(convert(tx.amount, tx.currency ?? currency, currency), currency)}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { onDeleteTx(tx.id); closeAction() } },
    ])
  }, [actionTx, onDeleteTx, closeAction, currency, hideBalance])

  const renderItem = useCallback(({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income'
    const color = isIncome ? C.green : C.red
    return (
      <TouchableOpacity
        style={[st.item, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => openAction(item)}
        activeOpacity={0.7}
      >
        <View style={[st.itemIcon, { backgroundColor: isIncome ? C.greenSoft : C.redSoft }]}>
          <Text style={{ fontSize: 18 }}>{ICONS[item.category] || (isIncome ? '💰' : '💸')}</Text>
        </View>
        <View style={st.itemBody}>
          <Text style={[st.itemCat, { color: C.text }]} numberOfLines={1}>{item.category}</Text>
          {item.note ? <Text style={[st.itemNote, { color: C.text2 }]} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <View style={st.itemRight}>
          <Text style={[st.itemAmt, { color }]}>{isIncome ? '+' : '−'} <AmountText amount={convert(item.amount, item.currency ?? currency, currency)} currency={currency} hideBalance={hideBalance} /></Text>
          <Text style={[st.itemDate, { color: C.text2 }]}>{fmtDate(item.date)}</Text>
        </View>
      </TouchableOpacity>
    )
  }, [C, currency, openAction, hideBalance])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'income', label: '↑ Entrées' },
    { key: 'expense', label: '↓ Sorties' },
  ]

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>

      {/* Résumé global */}
      {transactions.length > 0 && (
        <View style={[st.summary, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={st.summaryItem}>
            <Text style={[st.summaryLabel, { color: C.text2 }]}>Entrées</Text>
            <AmountText amount={totals.inc} currency={currency} hideBalance={hideBalance} style={[st.summaryVal, { color: C.green }]} />
          </View>
          <View style={[st.summarySep, { backgroundColor: C.border }]} />
          <View style={st.summaryItem}>
            <Text style={[st.summaryLabel, { color: C.text2 }]}>Sorties</Text>
            <AmountText amount={totals.exp} currency={currency} hideBalance={hideBalance} style={[st.summaryVal, { color: C.red }]} />
          </View>
          <View style={[st.summarySep, { backgroundColor: C.border }]} />
          <View style={st.summaryItem}>
            <Text style={[st.summaryLabel, { color: C.text2 }]}>Net</Text>
            <AmountText amount={totals.net} currency={currency} hideBalance={hideBalance} style={[st.summaryVal, { color: totals.net >= 0 ? C.green : C.red }]} />
          </View>
        </View>
      )}

      {/* Barre recherche + filtres */}
      <View style={st.searchRow}>
        <View style={[st.searchWrap, { backgroundColor: C.surface, borderColor: C.border, flex: 1 }]}>
          <Text style={[st.searchIcon, { color: C.text2 }]}>🔍</Text>
          <TextInput
            style={[st.searchInput, { color: C.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={C.text2}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[st.searchClear, { color: C.text2 }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres type */}
      <View style={st.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[st.filterBtn, { backgroundColor: filter === f.key ? C.primary : C.surface, borderColor: filter === f.key ? C.primary : C.border }]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[st.filterText, { color: filter === f.key ? '#fff' : C.text2 }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {filtered.length > 0 && (
          <Text style={[st.countText, { color: C.text2 }]}>{filtered.length} opération{filtered.length > 1 ? 's' : ''}</Text>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={st.empty}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📭</Text>
          <Text style={[st.emptyText, { color: C.text2 }]}>
            {search ? 'Aucun résultat' : 'Aucune opération'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={[st.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Action sheet */}
      <Modal visible={showAction} transparent animationType="none" onRequestClose={() => closeAction()}>
        <View style={st.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAction()} />
          <Animated.View
            onStartShouldSetResponder={() => true}
            style={[st.sheet, { backgroundColor: C.surface, borderColor: C.border, paddingBottom: insets.bottom + 16 }, { transform: [{ translateY: slide }] }]}
          >
            <View style={[st.handle, { backgroundColor: C.border }]} />
            {actionTx && (
              <View style={[st.sheetHeader, { borderBottomColor: C.border }]}>
                <View style={[st.sheetIconWrap, { backgroundColor: actionTx.type === 'income' ? C.greenSoft : C.redSoft }]}>
                  <Text style={{ fontSize: 24 }}>{ICONS[actionTx.category] || (actionTx.type === 'income' ? '💰' : '💸')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.sheetCat, { color: C.text }]}>{actionTx.category}</Text>
                  <Text style={[st.sheetAmt, { color: actionTx.type === 'income' ? C.green : C.red }]}>
                    {actionTx.type === 'income' ? '+' : '−'} <AmountText amount={convert(actionTx.amount, actionTx.currency ?? currency, currency)} currency={currency} hideBalance={hideBalance} />
                  </Text>
                  {actionTx.note ? <Text style={[st.sheetNote, { color: C.text2 }]}>{actionTx.note}</Text> : null}
                </View>
                <View style={[st.badge, { backgroundColor: actionTx.type === 'income' ? C.greenSoft : C.redSoft }]}>
                  <Text style={[st.badgeText, { color: actionTx.type === 'income' ? C.green : C.red }]}>
                    {actionTx.type === 'income' ? 'Entrée' : 'Sortie'}
                  </Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={st.sheetBtn} onPress={handleEdit} activeOpacity={0.7}>
              <Text style={[st.sheetBtnText, { color: C.text }]}>✏️  Modifier</Text>
            </TouchableOpacity>
            <View style={[st.sheetSep, { backgroundColor: C.border }]} />
            <TouchableOpacity style={st.sheetBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Text style={[st.sheetBtnText, { color: C.red }]}>🗑️  Supprimer</Text>
            </TouchableOpacity>
            <View style={[st.sheetSep, { backgroundColor: C.border }]} />
            <TouchableOpacity style={st.sheetBtn} onPress={() => closeAction()} activeOpacity={0.7}>
              <Text style={[st.sheetBtnText, { color: C.text2 }]}>Annuler</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

const st = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  summaryVal: { fontSize: 14, fontWeight: '700' },
  summarySep: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 6 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  searchClear: { fontSize: 13, paddingLeft: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 12, marginLeft: 'auto' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemBody: { flex: 1, marginRight: 8 },
  itemCat: { fontSize: 14, fontWeight: '600' },
  itemNote: { fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmt: { fontSize: 14, fontWeight: '700' },
  itemDate: { fontSize: 11, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyText: { fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetCat: { fontSize: 16, fontWeight: '700' },
  sheetAmt: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  sheetNote: { fontSize: 12, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sheetBtn: { paddingVertical: 16, paddingHorizontal: 20 },
  sheetBtnText: { fontSize: 16 },
  sheetSep: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
})
