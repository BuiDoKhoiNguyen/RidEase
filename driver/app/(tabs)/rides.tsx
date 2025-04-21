import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import RideCard from "@/components/ride/RideCard";
import colors from "@/themes/AppColors";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import fonts from "@/themes/AppFonts";
import { Ionicons } from '@expo/vector-icons';

export default function Rides() {
  const [recentRides, setRecentRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'completed', 'canceled'

  const getRecentRides = async () => {
    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("accessToken");
      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/get-rides`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setRecentRides(res.data.rides);
    } catch (error) {
      console.error("Error fetching rides:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getRecentRides();
  };

  useEffect(() => {
    getRecentRides();
  }, []);

  const filterRides = (rides) => {
    if (activeTab === 'all') return rides;
    if (activeTab === 'completed') return rides.filter(ride => ride.status === 'completed');
    if (activeTab === 'canceled') return rides.filter(ride => ride.status === 'canceled');
    return rides;
  };

  const filteredRides = filterRides(recentRides);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Rides</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]} 
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'canceled' && styles.activeTab]} 
            onPress={() => setActiveTab('canceled')}
          >
            <Text style={[styles.tabText, activeTab === 'canceled' && styles.activeTabText]}>Canceled</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={colors.buttonBg} />
            <Text style={styles.loadingText}>Loading rides...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.rideContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredRides && filteredRides.length > 0 ? (
              filteredRides.map((item, index) => (
                <RideCard item={item} key={index} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={60} color={colors.secondaryFont} />
                <Text style={styles.emptyText}>No rides found</Text>
                <Text style={styles.emptySubText}>
                  {activeTab === 'all' 
                    ? "You haven't taken any rides yet" 
                    : `You don't have any ${activeTab} rides`}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  header: {
    backgroundColor: colors.whiteColor,
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 15,
    paddingHorizontal: windowWidth(20),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.FONT25,
    fontFamily: fonts.bold,
    color: colors.primaryText,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.whiteColor,
    paddingHorizontal: windowWidth(20),
    paddingBottom: 10,
  },
  tab: {
    paddingVertical: 8,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.buttonBg,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT14,
    color: colors.secondaryFont,
  },
  activeTabText: {
    color: colors.buttonBg,
    fontFamily: fonts.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: fontSizes.FONT16,
    color: colors.primaryText,
    fontFamily: fonts.regular,
  },
  rideContainer: {
    flex: 1,
    paddingHorizontal: windowWidth(20),
    paddingTop: windowHeight(10),
    paddingBottom: windowHeight(10),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: windowHeight(50),
  },
  emptyText: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: colors.primaryText,
    marginTop: 10,
  },
  emptySubText: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: colors.secondaryFont,
    marginTop: 5,
    textAlign: 'center',
  },
});