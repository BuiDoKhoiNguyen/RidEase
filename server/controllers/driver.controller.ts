require("dotenv").config();
import { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma";
import jwt from "jsonwebtoken";

import { nylas } from "../app";
import { sendToken } from "../utils/sendToken";

// sending otp to driver phone number
export const sendingOtpToPhone = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { phoneNumber } = req.body;
        console.log(phoneNumber);
        
        // Thay thế Twilio bằng mã OTP tự tạo
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Lưu OTP tạm thời vào session hoặc cache
        // Trong môi trường development, chỉ in ra console
        console.log(`Generated OTP for ${phoneNumber}: ${otp}`);
        
        // Lưu OTP vào cache (hoặc có thể lưu vào database với expiry time)
        try {
            // Giả lập gửi SMS thành công
            res.status(201).json({
                success: true,
                // Trong môi trường development, gửi luôn OTP để test
                otp: process.env.NODE_ENV === 'development' ? otp : undefined
            });
        } catch (error) {
            console.log(error);
            res.status(400).json({
                success: false,
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
        });
    }
};

// verifying otp for login
export const verifyPhoneOtpForLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { phoneNumber, otp } = req.body;
        console.log(phoneNumber, otp);

        const driver = await prisma.driver.findUnique({
            where: {
                phoneNumber: phoneNumber
            }
        });

        if (!driver) {
            res.status(404).json({
                success: false,
                message: "account not found",
            });
            return;
        }

        try {
            // Thay thế Twilio verification bằng việc kiểm tra OTP
            // Trong môi trường phát triển, chấp nhận mọi OTP có 4 số
            const isValidOtp = process.env.NODE_ENV === 'development' ? otp.length === 4 : otp === '1234';
            
            if (isValidOtp) {
                sendToken(driver, res);
            } else {
                res.status(400).json({
                    success: false,
                    message: "Invalid OTP!",
                });
            }
        } catch (error) {
            console.log(error);
            res.status(400).json({
                success: false,
                message: "Something went wrong!",
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
        });
    }
};

// verifying phone otp for registration
export const verifyPhoneOtpForRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { phoneNumber, otp } = req.body;

        try {
            // Thay thế Twilio verification bằng việc kiểm tra OTP 
            // Trong môi trường phát triển, chấp nhận mọi OTP có 4 số
            const isValidOtp = process.env.NODE_ENV === 'development' ? otp.length === 4 : otp === '1234';
            
            if (isValidOtp) {
                await sendingOtpToEmail(req, res);
            } else {
                res.status(400).json({
                    success: false,
                    message: "Invalid OTP!",
                });
            }
        } catch (error) {
            console.log(error);
            res.status(400).json({
                success: false,
                message: "Something went wrong!",
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
        });
    }
};

// sending otp to email
export const sendingOtpToEmail = async (req: Request, res: Response) => {
    try {
        const {
            name,
            country,
            phoneNumber,
            email,
            vehicleType,
            registrationNumber,
            registrationDate,
            drivingLicense,
            vehicleColor,
            rate,
        } = req.body;

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const driver = {
            name,
            country,
            phoneNumber,
            email,
            vehicleType,
            registrationNumber,
            registrationDate,
            drivingLicense,
            vehicleColor,
            rate,
        };
        const token = jwt.sign(
            {
                driver,
                otp,
            },
            process.env.EMAIL_ACTIVATION_SECRET!,
            {
                expiresIn: "5m",
            }
        );
        try {
            await nylas.messages.send({
                identifier: process.env.USER_GRANT_ID!,
                requestBody: {
                    to: [{ name: name, email: email }],
                    subject: "Verify your email address!",
                    body: `
            <p>Hi ${name},</p>
        <p>Your RidEase verification code is ${otp}. If you didn't request for this OTP, please ignore this email!</p>
        <p>Thanks,<br>RidEase Team</p>
            `,
                },
            });
            res.status(201).json({
                success: true,
                token,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
            console.log(error);
        }
    } catch (error) {
        console.log(error);
    }
};

// verifying email otp and creating driver account
export const verifyingEmailOtp = async (req: Request, res: Response): Promise<any> => {
    try {
        const { otp, token } = req.body;

        const newDriver: any = jwt.verify(
            token,
            process.env.EMAIL_ACTIVATION_SECRET!
        );

        if (newDriver.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is not correct or expired!",
            });
        }

        const {
            name,
            country,
            phoneNumber,
            email,
            vehicleType,
            registrationNumber,
            registrationDate,
            drivingLicense,
            vehicleColor,
            rate,
        } = newDriver.driver;

        const driver = await prisma.driver.create({
            data: {
                name,
                country,
                phoneNumber,
                email,
                vehicleType,
                registrationNumber,
                registrationDate,
                drivingLicense,
                vehicleColor,
                rate,
            },
        });
        sendToken(driver, res);
    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
            message: "Your otp is expired!",
        });
    }
};

// get logged in driver data
export const getLoggedInDriverData = async (req: any, res: Response) => {
    try {
        const driver = req.driver;

        res.status(201).json({
            success: true,
            driver,
        });
    } catch (error) {
        console.log(error);
    }
};

// updating driver status
export const updateDriverStatus = async (req: any, res: Response) => {
    try {
        const { status } = req.body;

        const driver = await prisma.driver.update({
            where: {
                id: req.driver.id!,
            },
            data: {
                status,
            },
        });
        res.status(201).json({
            success: true,
            driver,
        });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// get drivers data with id
export const getDriversById = async (req: Request, res: Response): Promise<any> => {
    try {
        const { ids } = req.query as any;
        console.log(ids, 'ids')
        if (!ids) {
            return res.status(400).json({ message: "No driver IDs provided" });
        }

        const driverIds = ids.split(",");

        // Fetch drivers from database
        const drivers = await prisma.driver.findMany({
            where: {
                id: { in: driverIds },
            },
        });

        res.json(drivers);
    } catch (error) {
        console.error("Error fetching driver data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// creating new ride
export const newRide = async (req: any, res: Response) => {
    try {
        const {
            userId,
            charge,
            status,
            currentLocationName,
            destinationLocationName,
            distance,
        } = req.body;

        const newRide = await prisma.rides.create({
            data: {
                userId,
                driverId: req.driver.id,
                charge: parseFloat(charge),
                status,
                currentLocationName,
                destinationLocationName,
                distance,
            },
        });
        res.status(201).json({ success: true, newRide });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// updating ride status
export const updatingRideStatus = async (req: any, res: Response): Promise<any> => {
    try {
        const { rideId, rideStatus } = req.body;

        // Validate input
        if (!rideId || !rideStatus) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid input data" });
        }

        const driverId = req.driver?.id;
        if (!driverId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Fetch the ride data to get the rideCharge
        const ride = await prisma.rides.findUnique({
            where: {
                id: rideId,
            },
        });

        if (!ride) {
            return res
                .status(404)
                .json({ success: false, message: "Ride not found" });
        }

        const rideCharge = ride.charge;

        // Update ride status
        const updatedRide = await prisma.rides.update({
            where: {
                id: rideId,
                driverId,
            },
            data: {
                status: rideStatus,
            },
        });

        if (rideStatus === "Completed") {
            // Update driver stats if the ride is completed
            await prisma.driver.update({
                where: {
                    id: driverId,
                },
                data: {
                    totalEarning: {
                        increment: rideCharge,
                    },
                    totalRides: {
                        increment: 1,
                    },
                },
            });
        }

        res.status(201).json({
            success: true,
            updatedRide,
        });
    } catch (error: any) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// getting drivers rides
export const getAllRides = async (req: any, res: Response) => {
    const rides = await prisma.rides.findMany({
        where: {
            driverId: req.driver?.id,
        },
        include: {
            driver: true,
            user: true,
        },
    });
    res.status(201).json({
        rides,
    });
};

// saving and retrieving driver's push token
export const savePushToken = async (req: any, res: Response) => {
    try {
        const { pushToken } = req.body;

        const driver = await prisma.driver.update({
            where: {
                id: req.driver.id!,
            },
            data: {
                pushToken: pushToken,
            },
        });

        res.status(200).json({
            success: true,
            message: "Push token saved successfully",
        });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// get driver push token by id
export const getDriverPushToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        console.log(`Retrieving push token for driver ID: ${id}`);

        const driver = await prisma.driver.findUnique({
            where: {
                id,
            },
            select: {
                pushToken: true,
            },
        });

        if (!driver) {
            console.log(`Driver with ID ${id} not found`);
            return res.status(404).json({
                success: false,
                message: "Driver not found",
            });
        }

        console.log(`Driver found,push token: ${driver.pushToken || 'undefined'}`);

        res.status(200).json({
            success: true,
            pushToken: driver.pushToken,
        });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Manually set notification token for a driver by ID
export const setDriverNotificationToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const { driverId, pushToken } = req.body;
        
        if (!driverId || !pushToken) {
            return res.status(400).json({
                success: false,
                message: "Driver ID and push token are required"
            });
        }
        
        console.log(`Manually setting push token for driver ID: ${driverId}`);
        console.log(`Token: ${pushToken}`);
        
        const driver = await prisma.driver.update({
            where: {
                id: driverId
            },
            data: {
                pushToken
            }
        });
        
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }
        
        console.log(`Driver push token updated successfully`);
        
        res.status(200).json({
            success: true,
            message: "Driver push token updated successfully"
        });
    } catch (error: any) {
        console.error("Error setting driver push token:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
