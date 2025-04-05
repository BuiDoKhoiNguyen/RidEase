import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

export const isAuthenticated = (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const token = authHeader.split(" ")[1];
        if(!token) {
            return res.status(401).json({
                success: false,
                message: "Token missing",
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET as string,
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
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const token = authHeader.split(" ")[1];
        if(!token) {
            return res.status(401).json({
                success: false,
                message: "Token missing",
            });
        }

        jwt.verify(
            token,
            process.env.JWT_SECRET as string,
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

