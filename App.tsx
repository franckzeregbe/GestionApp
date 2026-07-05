import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DashboardScreen from './src/screens/DashboardScreen'
import ChartsScreen from './src/screens/ChartsScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import BudgetsScreen from './src/screens/BudgetsScreen'
import TransactionForm from './src/components/TransactionForm'
import { COLORS } from './src/theme'
import { MONTHS_FR } from './src/utils/constants'
import type { Transaction, Budgets, CurrencyId } from './src/types'
import { loadTransactions, saveTransactions, loadBudgets, saveBudgets } from './src/storage'

const Tab = createBottomTabNavigator()

const CURRENCY_LABELS: Record<CurrencyId, string> = {
  cad: 'CAD', usd: 'USD', eur: 'EUR', fcfa: 'XOF',
}

function AppContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budgets>({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currency, setCurrency] = useState<CurrencyId>('cad')
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const C = COLORS[theme]
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      const [txs, bgs, savedTheme, savedCurrency] = await Promise.all([
        loadTransactions(),
        loadBudgets(),
        AsyncStorage.getItem('gestion_theme'),
        AsyncStorage.getItem('gestion_currency'),
      ])
      setTransactions(txs)
      setBudgets(bgs)
      if (savedTheme === 'light') setTheme('light')
      if (savedCurrency && ['cad', 'usd', 'fcfa', 'eur'].includes(savedCurrency))
        setCurrency(savedCurrency as CurrencyId)
    })()
  }, [])

  const handleNavState = useCallback((state: any) => {
    const route = state?.routes?.[state.index]
    if (route && route.name !== 'Add') setActiveTab(route.name)
  }, [])

  const handleAddTx = useCallback((tx: Omit<Transaction, 'id'>) => {
    const newTx = { ...tx, id: Date.now() + Math.random() }
    setTransactions(prev => {
      const next = [...prev, newTx]
      saveTransactions(next)
      return next
    })
  }, [])

  const handleEditTx = useCallback((id: number, tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => {
      const next = prev.map(t => t.id === id ? { ...tx, id } : t)
      saveTransactions(next)
      return next
    })
  }, [])

  const handleDeleteTx = useCallback((id: number) => {
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== id)
      saveTransactions(next)
      return next
    })
  }, [])

  const handleSaveBudget = useCallback((cat: string, amt: number) => {
    setBudgets(prev => {
      const next = { ...prev, [cat]: amt }
      saveBudgets(next)
      return next
    })
  }, [])

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    await AsyncStorage.setItem('gestion_theme', next)
  }, [theme])

  const toggleCurrency = useCallback(async () => {
    const order: CurrencyId[] = ['cad', 'usd', 'fcfa', 'eur']
    const next = order[(order.indexOf(currency) + 1) % order.length]
    setCurrency(next)
    await AsyncStorage.setItem('gestion_currency', next)
  }, [currency])

  const handleMonthChange = useCallback((delta: number) => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      if (viewMode === 'year') d.setFullYear(d.getFullYear() + delta)
      else d.setMonth(d.getMonth() + delta)
      return d
    })
  }, [viewMode])

  const handleOpenForm = useCallback((tx?: Transaction) => {
    setEditingTx(tx ?? null)
    setShowForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingTx(null)
  }, [])

  const isDash = activeTab === 'Dashboard'
  const monthLabel = viewMode === 'year'
    ? `${currentMonth.getFullYear()}`
    : `${MONTHS_FR[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  const renderDashboard = useCallback(() => (
    <DashboardScreen
      transactions={transactions} budgets={budgets} onDeleteTx={handleDeleteTx}
      currentMonth={currentMonth} viewMode={viewMode} onViewModeChange={setViewMode}
      theme={theme} currency={currency}
    />
  ), [transactions, budgets, handleDeleteTx, currentMonth, viewMode, theme, currency])

  const renderCharts = useCallback(() => (
    <ChartsScreen transactions={transactions} theme={theme} currentMonth={currentMonth} currency={currency} />
  ), [transactions, currentMonth, theme, currency])

  const renderTransactions = useCallback(() => (
    <TransactionsScreen
      transactions={transactions} onDeleteTx={handleDeleteTx}
      onEditTransaction={handleOpenForm} theme={theme} currency={currency}
    />
  ), [transactions, handleDeleteTx, handleOpenForm, theme, currency])

  const renderBudgets = useCallback(() => (
    <BudgetsScreen
      transactions={transactions} budgets={budgets} onSaveBudget={handleSaveBudget}
      currentMonth={currentMonth} theme={theme} currency={currency}
    />
  ), [transactions, budgets, handleSaveBudget, currentMonth, theme, currency])

  const TAB_H = 60
  const tabBarStyle = {
    backgroundColor: C.surface,
    borderTopColor: C.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: TAB_H + insets.bottom,
    paddingBottom: insets.bottom || 8,
    paddingTop: 6,
    elevation: 0,
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow1}>
          <Text style={[styles.appTitle, { color: C.primary }]}>💰 Gestion</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity onPress={toggleCurrency} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pillText, { color: C.text2 }]}>{CURRENCY_LABELS[currency]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>{theme === 'dark' ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRow2}>
          <TouchableOpacity onPress={() => handleMonthChange(-1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: C.text2 }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: C.text }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => handleMonthChange(1)} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: C.text2 }]}>›</Text>
          </TouchableOpacity>
          {isDash && (
            <View style={[styles.segmented, { backgroundColor: C.surface2 }]}>
              <TouchableOpacity
                style={[styles.segment, viewMode === 'month' && { backgroundColor: C.primary }]}
                onPress={() => setViewMode('month')}
              >
                <Text style={[styles.segmentText, { color: viewMode === 'month' ? '#fff' : C.text2 }]}>Mois</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, viewMode === 'year' && { backgroundColor: C.primary }]}
                onPress={() => setViewMode('year')}
              >
                <Text style={[styles.segmentText, { color: viewMode === 'year' ? '#fff' : C.text2 }]}>Année</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Navigation */}
      <View style={{ flex: 1 }}>
        <NavigationContainer
          onStateChange={handleNavState}
          theme={{
            dark: theme === 'dark',
            colors: {
              primary: C.primary,
              background: C.bg,
              card: C.surface,
              text: C.text,
              border: C.border,
              notification: C.red,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '800' },
            },
          }}
        >
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle,
              tabBarActiveTintColor: C.primary,
              tabBarInactiveTintColor: C.text2,
              tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
              tabBarIconStyle: { marginBottom: 0 },
            }}
          >
            <Tab.Screen name="Dashboard" children={renderDashboard} options={{
              tabBarLabel: 'Tableau',
              tabBarIcon: ({ focused }) => (
                <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📊</Text>
              ),
            }} />
            <Tab.Screen name="Charts" children={renderCharts} options={{
              tabBarLabel: 'Graphiques',
              tabBarIcon: ({ focused }) => (
                <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📈</Text>
              ),
            }} />
            <Tab.Screen name="Add" children={() => <View />} options={{
              tabBarLabel: '',
              tabBarButton: () => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={tabStyles.fabWrap}
                  onPress={() => handleOpenForm()}
                >
                  <View style={[tabStyles.fab, { backgroundColor: C.primary }]}>
                    <Text style={tabStyles.fabText}>＋</Text>
                  </View>
                </TouchableOpacity>
              ),
            }} />
            <Tab.Screen name="Transactions" children={renderTransactions} options={{
              tabBarLabel: 'Historique',
              tabBarIcon: ({ focused }) => (
                <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📋</Text>
              ),
            }} />
            <Tab.Screen name="Budgets" children={renderBudgets} options={{
              tabBarLabel: 'Budgets',
              tabBarIcon: ({ focused }) => (
                <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🎯</Text>
              ),
            }} />
          </Tab.Navigator>
        </NavigationContainer>
      </View>

      <TransactionForm
        visible={showForm}
        editTx={editingTx}
        theme={theme}
        currency={currency}
        onSave={handleAddTx}
        onEdit={handleEditTx}
        onClose={handleCloseForm}
      />
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '600' },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
  monthLabel: { fontSize: 15, fontWeight: '700', minWidth: 140, textAlign: 'center' },
  segmented: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  segment: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  segmentText: { fontSize: 11, fontWeight: '600' },
})

const tabStyles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', top: -10 },
  fab: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 26, fontWeight: '300', lineHeight: 30 },
})
