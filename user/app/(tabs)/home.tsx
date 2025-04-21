import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationSearchBar from '@/components/location/LocationSearchBar';
import { commonStyles } from '@/styles/common.style';
import { external } from '@/styles/external.style';
import color from '@/themes/AppColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import RideCard from '@/components/ride/RideCard';
import { fontSizes, windowHeight, windowWidth } from '@/themes/AppConstants';
import fonts from '@/themes/AppFonts';
import { useRouter } from 'expo-router';
import { Person } from '@/assets/icons/person';
import { Notification } from '@/utils/icons';

export default function HomeScreen() {
  const [recentRides, setRecentRides] = useState([]);
  const router = useRouter();

  const getRecentRides = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    try {
      const res = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/get-rides`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setRecentRides(res.data.rides);
    } catch (error) {
      console.log('Error fetching rides:', error);
    }
  };

  useEffect(() => {
    getRecentRides();
  }, []);

  const promotions = [
    {
      id: '1',
      title: 'Ưu đãi 20% cho chuyến đi đầu tiên',
      color: '#4CAF50',
      icon: '🎁'
    },
    {
      id: '2',
      title: 'Giảm 15% cho chuyến đi cuối tuần',
      color: '#2196F3',
      icon: '🔥'
    }
  ];

  const services = [
    { id: '1', name: 'Bike', icon: '🛵' },
    { id: '2', name: '4-seat car', icon: '🚗' },
    { id: '3', name: '7-seat car', icon: '🚐' },
    { id: '4', name: 'Delivery', icon: '📦' }
  ];

  return (
    <View style={[commonStyles.flexContainer, { backgroundColor: "#FFFFFF" }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.appName}>RidEase</Text>
              <TouchableOpacity style={styles.notificationIcon} activeOpacity={0.5}>
                <Notification colors={color.whiteColor} />
              </TouchableOpacity>
            </View>

            <Text style={styles.greeting}>Hello, where do you want to go?</Text>

            <View style={styles.searchBarContainer}>
              <LocationSearchBar />
            </View>
          </View>

          {/* Khung phương tiện */}
          <View style={styles.servicesContainer}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <View style={styles.servicesList}>
              {services.map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceItem}
                  onPress={() => router.push('/RidePlan')}
                >
                  <View style={styles.serviceIconContainer}>
                    <Text style={styles.serviceIcon}>{service.icon}</Text>
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Khung khuyến mãi */}
          <View style={styles.promotionsContainer}>
            <Text style={styles.sectionTitle}>Offer for you</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promotionsList}
            >
              {promotions.map(promo => (
                <TouchableOpacity
                  key={promo.id}
                  style={[styles.promotionCard, { backgroundColor: promo.color }]}
                >
                  <Text style={styles.promoIcon}>{promo.icon}</Text>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Khung chuyến đi gần đây */}
          <View style={styles.recentRidesContainer}>
            <View style={styles.recentRidesHeader}>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.emptyRidesContainer}>
              <Text style={styles.emptyText}>
                You have not taken any trips yet.
              </Text>
              <Text style={styles.emptySubText}>
                Book your first trip today!
              </Text>
              <TouchableOpacity
                style={styles.bookRideButton}
                onPress={() => router.push('/RidePlan')}
              >
                <Text style={styles.bookRideButtonText}>Book now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: windowHeight(40),
    paddingBottom: 25,
    backgroundColor: color.primary,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontFamily: "TT-Octosquares-Medium",
    fontSize: 25,
    color: '#FFFFFF',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  greeting: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: fonts.regular,
  },
  searchBarContainer: {
    marginBottom: 10,
  },
  servicesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: fontSizes.FONT18,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginBottom: 15,
  },
  servicesList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  serviceItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 28,
  },
  serviceName: {
    fontSize: 12,
    color: color.regularText,
    textAlign: 'center',
    fontFamily: fonts.regular,
  },
  promotionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  promotionsList: {
    paddingRight: 20,
  },
  promotionCard: {
    width: 280,
    height: 100,
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    fontFamily: fonts.regular,
  },
  recentRidesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  recentRidesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    color: color.primary,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  emptyRidesContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: color.regularText,
    fontFamily: fonts.medium,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fonts.regular,
  },
  bookRideButton: {
    backgroundColor: color.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  bookRideButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  notificationIcon: {
    height: windowHeight(15),
    width: windowWidth(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "#675fd800",
    borderColor: color.buttonBg,
  }
});
