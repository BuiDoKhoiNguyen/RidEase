import { View, Text, StyleSheet, FlatList } from 'react-native'
import React from 'react'
import { useGetUserData } from '@/hooks/useGetUserData'
import { SafeAreaView } from 'react-native-safe-area-context'
import color from '@/themes/AppColors'

export default function HistoryScreen() {
  // const { userData, loading } = useGetUserData()
  
  // Dữ liệu mẫu cho lịch sử chuyến đi
  const rideHistory = [
    { id: '1', date: '15/04/2025', from: 'Quận 1, TP.HCM', to: 'Quận 7, TP.HCM', price: '75.000 VND' },
    { id: '2', date: '10/04/2025', from: 'Quận 3, TP.HCM', to: 'Quận 5, TP.HCM', price: '45.000 VND' },
    { id: '3', date: '05/04/2025', from: 'Quận 2, TP.HCM', to: 'Quận 10, TP.HCM', price: '85.000 VND' },
  ]

  const renderRideItem = ({ item }) => (
    <View style={styles.rideItem}>
      <View style={styles.rideHeader}>
        <Text style={styles.rideDate}>{item.date}</Text>
        <Text style={styles.ridePrice}>{item.price}</Text>
      </View>
      <View style={styles.rideRoute}>
        <View style={styles.routeDot} />
        <Text style={styles.routeText}>{item.from}</Text>
      </View>
      <View style={styles.rideRoute}>
        <View style={[styles.routeDot, { backgroundColor: color.primary }]} />
        <Text style={styles.routeText}>{item.to}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Rides history</Text>
      </View>
      
      {rideHistory.length > 0 ? (
        <FlatList
          data={rideHistory}
          renderItem={renderRideItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You have no trips yet</Text>
        </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  rideItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rideDate: {
    fontSize: 14,
    color: '#555',
  },
  ridePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: color.primary,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8F8F8F',
    marginRight: 10,
  },
  routeText: {
    fontSize: 14,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#8F8F8F',
    textAlign: 'center',
  }
})