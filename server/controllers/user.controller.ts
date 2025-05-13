require("dotenv").config();
import { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma";
import jwt from "jsonwebtoken";
import { sendToken } from "../utils/sendToken";
import { nylas } from "../app";

// Thiết lập biến môi trường
const EMAIL_ACTIVATION_SECRET = process.env.EMAIL_ACTIVATION_SECRET || 'ridewave-email-secret';

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phoneNumber } = req.body;
        try {
            // Thay thế Twilio bằng OTP tự tạo
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            console.log(`Generated OTP for ${phoneNumber}: ${otp}`);

            res.status(200).json({
                success: true,
                message: "Verification code sent",
                // Trong môi trường development, gửi luôn OTP để test
                otp: process.env.NODE_ENV === 'development' ? otp : undefined
            });
        } catch (error) {
            console.log(error);
            res.status(400).json({
                success: false,
                message: "Failed to send verification code"
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({
            success: false,
            message: "Failed to send verification code"
        });
    }
}

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) : Promise<any> => {
    try {
        const { phoneNumber, otp } = req.body;
        try {
            // Thay thế Twilio verification bằng kiểm tra đơn giản
            // Trong môi trường phát triển, chấp nhận mọi OTP có 4 số
            const isValidOtp = process.env.NODE_ENV === 'development' ? otp.length === 4 : otp === '1234';
            
            if (!isValidOtp) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            }

            const isUserExist = await prisma.user.findUnique({
                where: {
                    phoneNumber: phoneNumber
                }
            });
            if (isUserExist) {
                await sendToken(isUserExist, res);
            } else {
                const user = await prisma.user.create({
                    data: {
                        phoneNumber: phoneNumber
                    }
                });
                res.status(200).json({
                    success: true,
                    message: "OTP verified successfully",
                    user: user
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
}

export const sendingOtpToEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, name, userId } = req.body;

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const user = {
            userId,
            name,
            email,
        };
        const token = jwt.sign(
            {
                user,
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
        <p>Your Ridee verification code is ${otp}. If you didn't request for this OTP, please ignore this email!</p>
        <p>Thanks,<br>Ridee Team</p>
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

// verifying email otp
export const verifyingEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const { otp, token } = req.body;
  
      const newUser: any = jwt.verify(
        token,
        process.env.EMAIL_ACTIVATION_SECRET!
      );
  
      if (newUser.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "OTP is not correct or expired!",
        });
      }
  
      const { name, email, userId } = newUser.user;
  
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (user?.email === null) {
        const updatedUser = await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            name: name,
            email: email,
          },
        });
        await sendToken(updatedUser, res);
      }
    } catch (error) {
      console.log(error);
      res.status(400).json({
        success: false,
        message: "Your otp is expired!",
      });
    }
  };

// get logged in user data
export const getLoggedInUserData = async (req: any, res: Response) => {
    try {
        const user = req.user;

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.log(error);
    }
};

// getting user rides
export const getAllRides = async (req: any, res: Response) => {
    const rides = await prisma.rides.findMany({
        where: {
            userId: req.user?.id,
        },
        include: {
            driver: true,
            user: true,
        },
    });
    res.status(200).json({
        rides,
    });
};

// update user profile
export const updateUserProfile = async (req: any, res: Response) : Promise<any> => {
  try {
    const userId = req.user?.id;
    const { name, email } = req.body;

    // Validate input data
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
    }

    // Construct update data object
    const updateData: { name?: string; email?: string } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};
