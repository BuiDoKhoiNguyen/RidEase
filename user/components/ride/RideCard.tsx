import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import React from "react";
import {  windowWidth } from "@/themes/AppConstants";
import color from "@/themes/AppColors";
import Images from "@/utils/images";
import { LocationIcon, Star } from "@/utils/icons";
import { router } from "expo-router";

export function RideCard({ item }: { item: any }) {
  
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
        { backgroundColor: color.whiteColor },
      ]}
      onPress={handleViewDetails}
    >
      <View style={styles.rideItem}>
        <View style={styles.rideHeader}>
          <Text style={styles.rideDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.ridePrice}>{formatCurrency(item.charge)}</Text>
        </View>
        <View style={styles.rideRoute}>
          <View style={styles.routeDot} />
          <Text style={styles.routeText}>{item.currentLocationName}</Text>
        </View>
        <View style={styles.rideRoute}>
          <View style={[styles.routeDot, { backgroundColor: color.primary }]} />
          <Text style={styles.routeText}>{item.destinationLocationName}</Text>
        </View>
        
        <View style={styles.rideFooter}>
          <View style={styles.userContainer}>
            <Image source={Images.user} style={styles.userImage} />
            <Text style={styles.userName}>
              {item?.driver?.name || "Driver"}
            </Text>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.distanceContainer}>
              <LocationIcon color="#333" />
              <Text style={styles.distance}>
                {item.distance}
              </Text>
            </View>
            
            <View style={styles.ratingContainer}>
              <Star />
              <Text style={styles.rating}>
                {item.rating || "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  main: {
    width: "100%",
    // borderWidth: 1,
    borderRadius: 5,
    padding: windowWidth(5),
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
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 14,
    color: '#333',
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  distance: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
});
