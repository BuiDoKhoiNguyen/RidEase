import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useGetDriverData } from '@/hooks/useGetDriverData';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSizes, windowHeight, windowWidth } from '@/themes/AppConstants';
import color from '@/themes/AppColors';
import fonts from '@/themes/AppFonts';
import { AntDesign } from '@expo/vector-icons';

type RatingType = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
};

type RatingStats = {
  averageRating: number;
  totalRatings: number;
  ratingCounts: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
};

export default function RatingsScreen() {
  const { driver } = useGetDriverData();
  const [ratings, setRatings] = useState<RatingType[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    averageRating: 0,
    totalRatings: 0,
    ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);
        const accessToken = await AsyncStorage.getItem("accessToken");
        
        if (!driver?.id) {
          throw new Error("Driver ID not available");
        }
        
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_SERVER_URI}/ratings/driver/${driver.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.data.success) {
          setRatings(response.data.ratings);
          setStats({
            averageRating: response.data.averageRating,
            totalRatings: response.data.totalRatings,
            ratingCounts: response.data.ratingCounts
          });
        } else {
          setError("Failed to load ratings");
        }
      } catch (err) {
        console.error("Error fetching ratings:", err);
        setError("An error occurred while fetching ratings");
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [driver?.id]);

  const renderRatingItem = ({ item }: { item: RatingType }) => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    
    return (
      <View style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{item.user?.name?.[0] || '?'}</Text>
            </View>
            <Text style={styles.userName}>{item.user?.name || 'Anonymous'}</Text>
          </View>
          <Text style={styles.ratingDate}>{formattedDate}</Text>
        </View>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <AntDesign
              key={star}
              name="star"
              size={16}
              color={star <= item.rating ? '#FFD700' : '#E0E0E0'}
              style={{ marginRight: 2 }}
            />
          ))}
          <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
        </View>
        
        {item.comment && (
          <Text style={styles.comment}>{item.comment}</Text>
        )}
      </View>
    );
  };

  const renderRatingBar = (starCount: number) => {
    const percentage = stats.totalRatings > 0 
      ? (stats.ratingCounts[starCount.toString() as "1" | "2" | "3" | "4" | "5"] / stats.totalRatings) * 100
      : 0;
      
    return (
      <View style={styles.ratingBarContainer}>
        <Text style={styles.ratingBarLabel}>{starCount}</Text>
        <View style={styles.ratingBarBackground}>
          <View 
            style={[
              styles.ratingBarFill,
              { width: `${percentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.ratingBarCount}>{stats.ratingCounts[starCount.toString() as "1" | "2" | "3" | "4" | "5"]}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá của tôi</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace("/(tabs)/profile")}
          >
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={ratings}
          renderItem={renderRatingItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <View style={styles.statsContainer}>
              <View style={styles.averageRatingContainer}>
                <Text style={styles.averageRating}>
                  {stats.averageRating.toFixed(1)}
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <AntDesign
                      key={star}
                      name="star"
                      size={20}
                      color={star <= Math.round(stats.averageRating) ? '#FFD700' : '#E0E0E0'}
                      style={{ marginRight: 3 }}
                    />
                  ))}
                </View>
                <Text style={styles.totalRatings}>
                  {stats.totalRatings} đánh giá
                </Text>
              </View>
              
              <View style={styles.ratingBarsContainer}>
                {[5, 4, 3, 2, 1].map(starCount => renderRatingBar(starCount))}
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <AntDesign name="staro" size={60} color="#CCCCCC" />
              <Text style={styles.emptyText}>Bạn chưa có đánh giá nào</Text>
              <Text style={styles.emptySubtext}>
                Đánh giá từ khách hàng sẽ hiển thị ở đây sau khi hoàn thành chuyến đi
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: fontSizes.FONT20,
    fontFamily: fonts.medium,
    color: '#333333',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: fontSizes.FONT16,
    color: '#666',
    fontFamily: fonts.regular,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: fontSizes.FONT16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fonts.regular,
  },
  retryButton: {
    backgroundColor: color.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  averageRatingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: '#333333',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalRatings: {
    fontSize: fontSizes.FONT14,
    color: '#666666',
    fontFamily: fonts.regular,
  },
  ratingBarsContainer: {
    marginTop: 10,
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBarLabel: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.medium,
    color: '#333333',
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: '#666666',
    marginLeft: 10,
    width: 30,
    textAlign: 'right',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userInitial: {
    color: '#FFFFFF',
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
  },
  userName: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: '#333333',
  },
  ratingDate: {
    fontSize: fontSizes.FONT12,
    fontFamily: fonts.regular,
    color: '#999999',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingValue: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.medium,
    color: '#666666',
    marginLeft: 5,
  },
  comment: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: '#333333',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: fontSizes.FONT18,
    fontFamily: fonts.medium,
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
