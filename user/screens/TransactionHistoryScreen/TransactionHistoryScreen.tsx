import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import color from '@/themes/AppColors'
import { useRouter } from 'expo-router'
import { useGetUserData } from '@/hooks/useGetUserData'
import AsyncStorage from '@react-native-async-storage/async-storage'
import fonts from '@/themes/AppFonts'

// Định nghĩa kiểu dữ liệu giao dịch
type Transaction = {
  id: string
  date: string
  amount: string
  status: 'completed' | 'pending' | 'failed'
  type: 'ride' | 'topup' | 'refund'
  description: string
}

export default function TransactionHistoryScreen() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ride' | 'topup' | 'refund'>('all')

  // Giả lập việc lấy dữ liệu lịch sử giao dịch - trong thực tế sẽ lấy từ API
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        // Đối với demo, sẽ lấy dữ liệu giả từ AsyncStorage nếu có, nếu không thì tạo dữ liệu mẫu
        const storedTransactions = await AsyncStorage.getItem('transactions')
        
        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions))
        } else {
          // Dữ liệu mẫu lịch sử giao dịch
          const sampleTransactions: Transaction[] = [
            {
              id: '1',
              date: '17/04/2025',
              amount: '75.000 VND',
              status: 'completed',
              type: 'ride',
              description: 'Chuyến đi từ Quận 1 đến Quận 7'
            },
            {
              id: '2',
              date: '15/04/2025',
              amount: '200.000 VND',
              status: 'completed',
              type: 'topup',
              description: 'Nạp tiền vào tài khoản'
            },
            {
              id: '3',
              date: '12/04/2025',
              amount: '65.000 VND',
              status: 'completed',
              type: 'ride',
              description: 'Chuyến đi từ Quận 3 đến Quận 1'
            },
            {
              id: '4',
              date: '10/04/2025',
              amount: '30.000 VND',
              status: 'failed',
              type: 'ride',
              description: 'Chuyến đi từ Quận 7 đến Quận 5'
            },
            {
              id: '5',
              date: '08/04/2025',
              amount: '45.000 VND',
              status: 'failed',
              type: 'refund',
              description: 'Hoàn tiền từ chuyến đi bị hủy'
            },
            {
              id: '6',
              date: '05/04/2025',
              amount: '100.000 VND',
              status: 'completed',
              type: 'topup',
              description: 'Nạp tiền vào tài khoản'
            },
            {
              id: '7',
              date: '01/04/2025',
              amount: '85.000 VND',
              status: 'completed',
              type: 'ride',
              description: 'Chuyến đi từ Quận 2 đến Quận 10'
            }
          ]
          
          setTransactions(sampleTransactions)
          // Lưu vào AsyncStorage để demo
          await AsyncStorage.setItem('transactions', JSON.stringify(sampleTransactions))
        }
      } catch (error) {
        console.error('Lỗi khi tải lịch sử giao dịch:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  // Lọc giao dịch theo loại
  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(transaction => transaction.type === filter)

  // Render item cho FlatList
  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    // Xác định icon và màu sắc dựa trên loại giao dịch
    let icon, backgroundColor, textColor
    
    if (item.type === 'ride') {
      icon = '🚗'
      backgroundColor = '#E8F4FD'
      textColor = '#2196F3'
    } else if (item.type === 'topup') {
      icon = '💳'
      backgroundColor = '#E6F7ED'
      textColor = '#4CAF50'
    } else { // refund
      icon = '↩️'
      backgroundColor = '#FFF8E1'
      textColor = '#FFA000'
    }

    // Xác định màu trạng thái
    let statusColor
    switch (item.status) {
      case 'completed':
        statusColor = '#4CAF50'
        break
      case 'pending':
        statusColor = '#FFA000'
        break
      case 'failed':
        statusColor = '#F44336'
        break
      default:
        statusColor = '#757575'
    }

    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => {
          // Điều hướng đến chi tiết giao dịch (nếu có)
          // router.push({ pathname: '/TransactionDetail', params: { id: item.id } })
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
        
        <View style={styles.transactionAmount}>
          <Text style={[styles.amountText, { color: textColor }]}>
            {item.type === 'topup' ? '+' : item.type === 'refund' ? '+' : '-'}{item.amount}
          </Text>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.status === 'completed' ? 'Hoàn tất' : 
              item.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Header với các filter
  const renderHeader = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>Tất cả</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'ride' && styles.activeFilter]}
        onPress={() => setFilter('ride')}
      >
        <Text style={[styles.filterText, filter === 'ride' && styles.activeFilterText]}>Chuyến đi</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'topup' && styles.activeFilter]}
        onPress={() => setFilter('topup')}
      >
        <Text style={[styles.filterText, filter === 'topup' && styles.activeFilterText]}>Nạp tiền</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'refund' && styles.activeFilter]}
        onPress={() => setFilter('refund')}
      >
        <Text style={[styles.filterText, filter === 'refund' && styles.activeFilterText]}>Hoàn tiền</Text>
      </TouchableOpacity>
    </View>
  )

  // Render khi không có giao dịch nào
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Không có giao dịch nào</Text>
      <Text style={styles.emptySubText}>
        Các giao dịch của bạn sẽ hiển thị ở đây
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Lịch sử giao dịch</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
        <Text style={styles.balanceAmount}>320.000 VND</Text>
      </View>

      {renderHeader()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: fonts.medium,
  },
  balanceCard: {
    backgroundColor: color.primary,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeFilter: {
    backgroundColor: color.primary,
  },
  filterText: {
    fontSize: 14,
    color: '#555',
    fontFamily: fonts.regular,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  transactionDate: {
    fontSize: 13,
    color: '#888',
    fontFamily: fonts.regular,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    fontFamily: fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: fonts.medium,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 30,
    fontFamily: fonts.regular,
  }
})