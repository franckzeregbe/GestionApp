import React, { useState, useEffect, useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet, TouchableOpacity, Text, Platform, Alert, AppState } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import PinScreen from './src/components/PinScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import ChartsScreen from './src/screens/ChartsScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import BudgetsScreen from './src/screens/BudgetsScreen'
import TransactionForm from './src/components/TransactionForm'
import { COLORS } from './src/theme'
import { MONTHS_FR } from './src/utils/constants'
import type { Transaction, Budgets, CurrencyId } from './src/types'
import { loadTransactions, saveTransactions, loadBudgets, saveBudgets } from './src/storage'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'

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
  const [hideBalance, setHideBalance] = useState(false)
  const [pinHash, setPinHash] = useState<string | null>(null)
  const [lockScreen, setLockScreen] = useState(true)
  const [pinSetupMode, setPinSetupMode] = useState<'none' | 'setup' | 'remove'>('none')
  const [loaded, setLoaded] = useState(false)
  const C = COLORS[theme]
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      const [txs, bgs, savedTheme, savedCurrency, savedPin, savedHide] = await Promise.all([
        loadTransactions(),
        loadBudgets(),
        AsyncStorage.getItem('gestion_theme'),
        AsyncStorage.getItem('gestion_currency'),
        AsyncStorage.getItem('gestion_pin'),
        AsyncStorage.getItem('gestion_hideBalance'),
      ])
      setTransactions(txs)
      setBudgets(bgs)
      if (savedTheme === 'light') setTheme('light')
      if (savedCurrency && ['cad', 'usd', 'fcfa', 'eur'].includes(savedCurrency))
        setCurrency(savedCurrency as CurrencyId)
      setPinHash(savedPin)
      setLockScreen(savedPin !== null)
      setHideBalance(savedHide === 'true')
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' && pinHash) {
        setLockScreen(true)
      }
    })
    return () => sub.remove()
  }, [pinHash])

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

  const handleDeleteBudget = useCallback((cat: string) => {
    setBudgets(prev => {
      const next = { ...prev }
      delete next[cat]
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

  const handleExport = useCallback(async () => {
    try {
      const data = { transactions, budgets, exported: new Date().toISOString() }
      const json = JSON.stringify(data, null, 2)
      const fileName = `gestion_${new Date().toISOString().slice(0, 10)}.json`
      const fileUri = FileSystem.documentDirectory + fileName
      await FileSystem.writeAsStringAsync(fileUri, json)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exporter Gestion' })
      } else {
        await Clipboard.setStringAsync(json)
        Alert.alert('Copié', 'Données copiées dans le presse-papier')
      }
    } catch { Alert.alert('Erreur', "Échec de l'export") }
  }, [transactions, budgets])

  const handleImport = useCallback(async () => {
    try {
      const json = await Clipboard.getStringAsync()
      if (!json || !json.startsWith('{')) {
        Alert.alert('Presse-papier vide', 'Copiez d\'abord un fichier JSON de données')
        return
      }
      const data = JSON.parse(json)
      if (data.transactions) {
        setTransactions(data.transactions)
        saveTransactions(data.transactions)
      }
      if (data.budgets) {
        setBudgets(data.budgets)
        saveBudgets(data.budgets)
      }
      Alert.alert('Importé', 'Données restaurées avec succès')
    } catch {
      Alert.alert('Erreur', 'Format de données invalide')
    }
  }, [])

  const handleReset = useCallback(() => {
    Alert.alert('Tout effacer', 'Supprimer toutes les données ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        setTransactions([])
        setBudgets({})
        saveTransactions([])
        saveBudgets({})
      }},
    ])
  }, [])

  const handleTogglePin = useCallback(() => {
    if (pinHash) {
      setPinSetupMode('remove')
    } else {
      setPinSetupMode('setup')
    }
  }, [pinHash])

  const handlePinSetupSuccess = useCallback(async (pin?: string) => {
    if (pin) {
      const hash = (() => {
        let h = 0
        for (let i = 0; i < pin.length; i++) {
          h = ((h << 5) - h) + pin.charCodeAt(i)
          h |= 0
        }
        return 'pin_' + Math.abs(h).toString(36)
      })()
      await AsyncStorage.setItem('gestion_pin', hash)
      setPinHash(hash)
    } else {
      await AsyncStorage.removeItem('gestion_pin')
      setPinHash(null)
    }
    setPinSetupMode('none')
  }, [])

  const handleToggleHideBalance = useCallback(async () => {
    const next = !hideBalance
    setHideBalance(next)
    await AsyncStorage.setItem('gestion_hideBalance', String(next))
  }, [hideBalance])

  const isDash = activeTab === 'Dashboard'
  const monthLabel = viewMode === 'year'
    ? `${currentMonth.getFullYear()}`
    : `${MONTHS_FR[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  const renderDashboard = useCallback(() => (
    <DashboardScreen
      transactions={transactions} budgets={budgets} onDeleteTx={handleDeleteTx}
      currentMonth={currentMonth} viewMode={viewMode} onViewModeChange={setViewMode}
      theme={theme} currency={currency} hideBalance={hideBalance}
    />
  ), [transactions, budgets, handleDeleteTx, currentMonth, viewMode, theme, currency, hideBalance])

  const renderCharts = useCallback(() => (
    <ChartsScreen transactions={transactions} theme={theme} currentMonth={currentMonth} currency={currency} hideBalance={hideBalance} />
  ), [transactions, currentMonth, theme, currency, hideBalance])

  const renderTransactions = useCallback(() => (
    <TransactionsScreen
      transactions={transactions} onDeleteTx={handleDeleteTx}
      onEditTransaction={handleOpenForm} theme={theme} currency={currency} hideBalance={hideBalance}
    />
  ), [transactions, handleDeleteTx, handleOpenForm, theme, currency, hideBalance])

  const renderBudgets = useCallback(() => (
    <BudgetsScreen
      transactions={transactions} budgets={budgets} onSaveBudget={handleSaveBudget}
      onDeleteBudget={handleDeleteBudget} currentMonth={currentMonth} theme={theme} currency={currency} hideBalance={hideBalance}
    />
  ), [transactions, budgets, handleSaveBudget, handleDeleteBudget, currentMonth, theme, currency, hideBalance])

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

  if (!loaded) return null
  if (lockScreen && pinHash) {
    return (
      <PinScreen
        mode="lock"
        storedPinHash={pinHash}
        onSuccess={() => setLockScreen(false)}
      />
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow1}>
          <Text style={[styles.appTitle, { color: C.primary }]}>💰 Gestion</Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity onPress={handleExport} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleImport} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>📥</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>🗑️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleCurrency} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={[styles.pillText, { color: C.text2 }]}>{CURRENCY_LABELS[currency]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleHideBalance} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>{hideBalance ? '👁️‍🗨️' : '👁️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTogglePin} style={[styles.pill, { backgroundColor: C.surface2 }]}>
              <Text style={styles.pillText}>{pinHash ? '🔒' : '🔓'}</Text>
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

      {pinSetupMode !== 'none' && (
        <PinScreen
          mode={pinSetupMode === 'remove' ? 'lock' : 'setup'}
          storedPinHash={pinHash}
          onSuccess={(pin) => handlePinSetupSuccess(pinSetupMode === 'setup' ? pin : undefined)}
          onCancel={() => setPinSetupMode('none')}
        />
      )}
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
