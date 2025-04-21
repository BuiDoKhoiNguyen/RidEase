import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import { useGetDriverData } from "@/hooks/useGetDriverData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import CountryPicker, { Country, CountryCode, Flag } from "react-native-country-picker-modal";
import color from "@/themes/AppColors";
import fonts from "@/themes/AppFonts";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Images from "@/utils/images";

export default function Profile() {
  const { loading, driver } = useGetDriverData();
  const { colors } = useTheme();
  const [countryCode, setCountryCode] = useState<CountryCode>(
    (driver?.country as CountryCode) || "VN"
  );
  const [country, setCountry] = useState<Country | null>(null);
  const [visible, setVisible] = useState(false);

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCountry(country);
    console.log(country);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Profile</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Image 
            source={Images.profileUser || { uri: 'https://avatar.iran.liara.run/public' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{driver?.name || 'Driver Name'}</Text>
          <Text style={styles.userPhone}>{driver?.phoneNumber || '+84 *** *** ***'}</Text>
          
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{driver?.email || 'example@email.com'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{driver?.phoneNumber || '+84 *** *** ***'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => setVisible(true)}
          >
            <Text style={styles.infoLabel}>Country</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CountryPicker
                withFilter
                withFlag
                withCountryNameButton
                withAlphaFilter
                withCallingCode
                withEmoji
                onSelect={onSelect}
                visible={visible}
                renderFlagButton={() => null}
                onClose={() => setVisible(false)}
                countryCode={countryCode}
              />
              {countryCode ? (
                <Flag countryCode={countryCode} flagSize={16} />
              ) : null}
              <Text style={[styles.infoValue, {marginLeft: 8}]}>
                {typeof country?.name === "string" ? country.name : driver?.country || "Vietnam"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle Type</Text>
            <Text style={styles.infoValue}>{driver?.vehicleType || 'Not specified'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Registration Number</Text>
            <Text style={styles.infoValue}>{driver?.registrationNumber || 'Not specified'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle Color</Text>
            <Text style={styles.infoValue}>{driver?.vehicleColor || 'Not specified'}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Payment method</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Ride history</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Earnings</Text>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver?.totalRides || 0}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver?.ratings?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{driver?.totalEarning ? `${driver.totalEarning}` : '0'}</Text>
            <Text style={styles.statLabel}>VND</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem("accessToken");
            router.push("/(routes)/Login");
          }}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
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
    fontFamily: fonts.bold,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: fonts.bold,
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#777',
    fontFamily: fonts.regular,
    marginBottom: 20,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  editProfileText: {
    fontSize: 14,
    color: '#555',
    fontFamily: fonts.medium,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoItem: {
    padding: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontFamily: fonts.medium,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 5,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontFamily: fonts.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: fonts.bold,
    color: color.primary,
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 30,
    backgroundColor: color.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
});
