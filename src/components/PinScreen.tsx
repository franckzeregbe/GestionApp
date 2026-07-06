import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native'
import { COLORS } from '../theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const C = COLORS.dark
const { width: W } = Dimensions.get('window')

interface Props {
  mode: 'setup' | 'lock'
  storedPinHash: string | null
  onSuccess: (pin?: string) => void
  onCancel?: () => void
}

function hashPin(pin: string): string {
  let h = 0
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) - h) + pin.charCodeAt(i)
    h |= 0
  }
  return 'pin_' + Math.abs(h).toString(36)
}

const KEY_SIZE = (W - 80) / 3

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
]

export default function PinScreen({ mode, storedPinHash, onSuccess, onCancel }: Props) {
  const insets = useSafeAreaInsets()
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [savedPin, setSavedPin] = useState('')
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  useEffect(() => {
    if (pin.length !== 4) return
    if (mode === 'lock') {
      if (hashPin(pin) === storedPinHash) {
        onSuccess()
      } else {
        setError('Code incorrect')
        shake()
        setPin('')
      }
    } else {
      if (step === 1) {
        setSavedPin(pin)
        setStep(2)
        setPin('')
      } else {
        if (pin === savedPin) {
          onSuccess(pin)
        } else {
          setError('Les codes ne correspondent pas')
          shake()
          setStep(1)
          setPin('')
          setSavedPin('')
        }
      }
    }
  }, [pin])

  const handleKey = (key: string) => {
    setError('')
    if (key === 'C') {
      setPin('')
      if (mode === 'setup') { setStep(1); setSavedPin('') }
      return
    }
    if (key === '⌫') {
      setPin(p => p.slice(0, -1))
      return
    }
    setPin(prev => prev.length < 4 ? prev + key : prev)
  }

  const title = mode === 'lock'
    ? 'Code PIN'
    : step === 1 ? 'Choisissez un code PIN' : 'Confirmez le code PIN'

  return (
    <View style={s.container}>
      {mode === 'setup' && onCancel && (
        <TouchableOpacity
          style={[s.cancelBtn, { top: insets.top + 8 }]}
          activeOpacity={0.7}
          onPress={onCancel}
        >
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[s.body, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={s.title}>{title}</Text>

        <View style={s.dots}>
          {[0, 1, 2, 3].map(i => (
            <Text key={i} style={[s.dot, { color: i < pin.length ? C.primary : C.text2 }]}>
              {i < pin.length ? '●' : '○'}
            </Text>
          ))}
        </View>

        {error !== '' && (
          <Text style={s.error}>{error}</Text>
        )}
      </Animated.View>

      <View style={s.numpad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map(key => (
              <TouchableOpacity
                key={key}
                style={s.key}
                activeOpacity={0.6}
                onPress={() => handleKey(key)}
              >
                <Text style={[
                  s.keyText,
                  { color: key === 'C' ? C.red : key === '⌫' ? C.text2 : C.text },
                ]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: { position: 'absolute', left: 20 },
  cancelText: { color: C.primary, fontSize: 16, fontWeight: '600' },
  body: { alignItems: 'center', marginBottom: 8 },
  title: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  dot: { fontSize: 28, lineHeight: 34 },
  error: { color: C.red, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  numpad: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  key: {
    width: KEY_SIZE, height: KEY_SIZE,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 24, fontWeight: '600' },
})
