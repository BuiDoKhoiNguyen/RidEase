import { Request, Response } from "express";
import prisma from "../utils/prisma";

// Thêm đánh giá cho tài xế
export const rateDriver = async (req: any, res: Response): Promise<any> => {
  try {
    const { rideId, driverId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!rideId || !driverId || !rating || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required information"
      });
    }

    // Kiểm tra chuyến đi có tồn tại không và thuộc về người dùng hiện tại
    const ride = await prisma.rides.findFirst({
      where: {
        id: rideId,
        userId: userId,
        driverId: driverId,
      },
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or you don't have permission to rate this ride"
      });
    }

    // Kiểm tra nếu chuyến đi đã có đánh giá
    if (ride.isRated) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this ride"
      });
    }

    // Cập nhật đánh giá cho chuyến đi
    const updatedRide = await prisma.rides.update({
      where: {
        id: rideId
      },
      data: {
        rating: parseFloat(rating.toString()),

        isRated: true
      },
    });

    // Tìm tất cả các chuyến đi đã được đánh giá của tài xế này
    const allDriverRatings = await prisma.rides.findMany({
      where: {
        driverId: driverId,
        isRated: true,
      },
      select: {
        rating: true,
      },
    });

    // Tính toán điểm đánh giá trung bình của tài xế
    const ratedRides = allDriverRatings.filter(ride => ride.rating !== null);
    const totalRatings = ratedRides.length;
    const ratingSum = ratedRides.reduce((sum, item) => sum + (item.rating || 0), 0);
    const averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

    // Cập nhật thông tin rating của tài xế
    await prisma.driver.update({
      where: {
        id: driverId,
      },
      data: {
        ratings: averageRating,
      },
    });

    res.status(201).json({
      success: true,
      rating: parseFloat(rating.toString()),
      averageRating,
    });
  } catch (error: any) {
    console.error("Error adding rating:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add rating",
    });
  }
};

// Lấy đánh giá của một tài xế
export const getDriverRatings = async (req: Request, res: Response): Promise<any> => {
  try {
    const { driverId } = req.params;

    // Lấy các chuyến đi đã đánh giá của tài xế
    const ratedRides = await prisma.rides.findMany({
      where: {
        driverId: driverId,
        isRated: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Tính số lượng đánh giá theo sao
    type RatingCountsType = {
      [key: string]: number;
    };
    
    const ratingCounts: RatingCountsType = {
      "1": 0,
      "2": 0, 
      "3": 0,
      "4": 0,
      "5": 0,
    };

    ratedRides.forEach((ride) => {
      if (ride.rating) {
        const ratingValue = Math.floor(ride.rating);
        if (ratingValue >= 1 && ratingValue <= 5) {
          ratingCounts[ratingValue.toString()]++;
        }
      }
    });

    // Lấy thông tin tài xế
    const driver = await prisma.driver.findUnique({
      where: {
        id: driverId,
      },
      select: {
        ratings: true,
      },
    });

    res.status(200).json({
      success: true,
      ratings: ratedRides,
      averageRating: driver?.ratings || 0,
      ratingCounts,
      totalRatings: ratedRides.length,
    });
  } catch (error: any) {
    console.error("Error fetching driver ratings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ratings",
    });
  }
};
