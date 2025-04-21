import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

export const isAuthenticated = (
    req: any,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        if(!token) {
            res.status(401).json({
                success: false,
                message: "Token missing",
            });
            return;
        }

        jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!,
            async (err: any, decoded: any) => {
                if(err) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid token",
                    });
                }

                const userData = await prisma.user.findUnique({
                    where: {
                        id: decoded.id,
                    }
                })

                if (!userData) {
                    return res.status(401).json({
                      success: false,
                      message: "User not found",
                    });
                }

                req.user = userData;
                next()
            }
        )

    } catch (error) {
        console.log(error)
    }
}

export const isAuthenticatedDriver = (
    req: any,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }

        const token = authHeader.split(" ")[1];
        if(!token) {
            res.status(401).json({
                success: false,
                message: "Token missing",
            });
            return;
        }

        jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string,
            async (err: any, decoded: any) => {
                if(err) {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid token",
                    });
                }

                const driverData = await prisma.driver.findUnique({
                    where: {
                        id: decoded.id,
                    }
                })

                req.driver = driverData;
                next()
            }
        )

    } catch (error) {
        console.log(error)
    }
}

