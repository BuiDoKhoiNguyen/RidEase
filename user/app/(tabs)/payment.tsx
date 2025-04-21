import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native'
import React, { useState } from 'react'
import { useGetUserData } from '@/hooks/useGetUserData'
import { SafeAreaView } from 'react-native-safe-area-context'
import color from '@/themes/AppColors'
import { router } from 'expo-router'

export default function PaymentScreen() {
  const [selectedMethod, setSelectedMethod] = useState('card-1')

  const paymentMethods = [
    { id: 'card-1', type: 'VISA', last4: '4242', expiry: '04/26' },
    { id: 'card-2', type: 'MASTERCARD', last4: '8765', expiry: '09/25' },
  ]

  const renderPaymentCard = (method) => {
    const isSelected = selectedMethod === method.id
    return (
      <TouchableOpacity 
        key={method.id}
        style={[styles.paymentCard, isSelected && styles.selectedCard]}
        onPress={() => setSelectedMethod(method.id)}
      >
        <View style={styles.cardDetails}>
          <View style={styles.cardTypeContainer}>
            {method.type === 'VISA' ? (
              <View style={styles.cardLogo}>
                <Text style={styles.cardLogoText}>VISA</Text>
              </View>
            ) : (
              <View style={[styles.cardLogo, {backgroundColor: '#EB001B'}]}>
                <Text style={styles.cardLogoText}>MC</Text>
              </View>
            )}
            <Text style={styles.cardType}>{method.type}</Text>
          </View>
          <Text style={styles.cardNumber}>•••• •••• •••• {method.last4}</Text>
          <Text style={styles.cardExpiry}>Hết hạn: {method.expiry}</Text>
        </View>
        <View style={styles.radioButton}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    )
  }

  const recentTransactions = [
    { id: '1', date: '16/04/2025', amount: '85.000 VND', status: 'Thành công' },
    { id: '2', date: '10/04/2025', amount: '65.000 VND', status: 'Thành công' },
    { id: '3', date: '02/04/2025', amount: '120.000 VND', status: 'Thành công' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Thanh Toán</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          <Text style={styles.balanceAmount}>175.000 VND</Text>
          <TouchableOpacity style={styles.topupButton}>
            <Text style={styles.topupButtonText}>Nạp tiền</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
            <TouchableOpacity>
              <Text style={styles.addButton}>+ Thêm mới</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map(method => renderPaymentCard(method))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/TransactionHistory')}>
              <Text style={styles.viewAllButton}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.map(transaction => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                <Text style={styles.transactionIconText}>💳</Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
                <Text style={styles.transactionStatus}>{transaction.status}</Text>
              </View>
              <Text style={styles.transactionAmount}>{transaction.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceCard: {
    margin: 16,
    padding: 20,
    backgroundColor: color.primary,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  topupButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  topupButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    color: color.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllButton: {
    color: '#888',
    fontSize: 14,
  },
  paymentMethodsContainer: {
    paddingHorizontal: 16,
  },
  paymentCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  selectedCard: {
    borderColor: color.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  cardDetails: {
    flex: 1,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLogo: {
    width: 40,
    height: 24,
    backgroundColor: '#1A1F71',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardLogoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardNumber: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: 12,
    color: '#888',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: color.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.primary,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    color: '#333',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  }
})