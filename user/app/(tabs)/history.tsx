import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useGetUserData } from '@/hooks/useGetUserData'
import { SafeAreaView } from 'react-native-safe-area-context'
import color from '@/themes/AppColors'
import { RideCard } from '@/components/ride/RideCard'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function HistoryScreen() {
  const { loading: userLoading } = useGetUserData()
  interface Ride {
    id: string
    // Add other properties of a ride here if needed
  }

  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  useEffect(() => {
    fetchRideHistory()
  }, [])
  
  const fetchRideHistory = async () => {
    try {
      setLoading(true)
      const accessToken = await AsyncStorage.getItem("accessToken");
     
      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_URI}/get-rides`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      setRides(response.data.rides)
    } catch (error) {
      console.error('Error fetching ride history:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchRideHistory()
    setRefreshing(false)
  }

  if (userLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Rides history</Text>
      </View>
      
      {rides && rides.length > 0 ? (
        <FlatList
          data={[...rides].reverse()}
          renderItem={({ item }) => <RideCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[color.primary]}
            />
          }
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
})