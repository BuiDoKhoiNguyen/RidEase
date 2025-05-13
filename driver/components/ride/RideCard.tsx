import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import React from "react";
import { useTheme } from "@react-navigation/native";
import Images from "@/utils/images";
import { LocationIcon, Star } from "@/utils/icons";
import color from "@/themes/AppColors";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import fonts from "@/themes/AppFonts";
import { router } from "expo-router";

export default function RideCard({ item }: { item: any }) {
  const { colors } = useTheme();

  // Hàm định dạng lại ngày tháng
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Xử lý khi nhấn vào card để xem chi tiết
  const handleViewDetails = () => {
    router.push({
      pathname: "/RideDetails",
      params: { rideId: item.id }
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.main,
        { backgroundColor: colors.card, shadowColor: colors.text },
      ]}
      onPress={handleViewDetails}
    >
      <View style={styles.rideHeader}>
        <Text style={styles.timing}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.price}>{formatCurrency(item.charge)}</Text>
      </View>
      
      <View style={styles.rideRoute}>
        <View style={styles.routeDot} />
        <Text style={[styles.routeText, { color: colors.text }]}>
          {item.currentLocationName}
        </Text>
      </View>
      
      <View style={styles.rideRoute}>
        <View style={[styles.routeDot, { backgroundColor: color.primary }]} />
        <Text style={[styles.routeText, { color: colors.text }]}>
          {item.destinationLocationName}
        </Text>
      </View>
      
      <View style={styles.rideFooter}>
        <View style={styles.userContainer}>
          <Image source={Images.user} style={styles.userImage} />
          <Text style={[styles.userName, { color: colors.text }]}>
            {item?.user?.name || "Passenger"}
          </Text>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.distanceContainer}>
            <LocationIcon color={colors.text} />
            <Text style={[styles.distance, { color: colors.text }]}>
              {item.distance}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <Star />
            <Text style={[styles.rating, { color: colors.text }]}>
              {item.rating || "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  main: {
    backgroundColor: '#FFFFFF',
    padding: windowWidth(16),
    marginBottom: windowHeight(12),
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: windowHeight(12),
    paddingBottom: windowHeight(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timing: {
    fontSize: fontSizes.FONT14,
    color: color.secondaryFont,
    fontFamily: fonts.medium,
  },
  price: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.bold,
    color: color.primary,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: windowHeight(6),
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8F8F8F',
    marginRight: windowWidth(10),
  },
  routeText: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.medium,
    flex: 1,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: windowHeight(12),
    paddingTop: windowHeight(10),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    height: windowHeight(24),
    width: windowHeight(24),
    borderRadius: windowHeight(12),
    marginRight: windowWidth(6),
  },
  userName: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT14,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: windowWidth(12),
  },
  distance: {
    marginLeft: windowWidth(4),
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: windowWidth(4),
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT12,
  },
});
