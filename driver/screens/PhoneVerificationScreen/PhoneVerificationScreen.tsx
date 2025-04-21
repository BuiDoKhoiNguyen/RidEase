import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";
import { external } from "@/styles/external.style";
import { router, useLocalSearchParams } from "expo-router";
import { commonStyles } from "@/styles/common.style";

import OTPTextInput from "react-native-otp-textinput";

import axios from "axios";
import { Toast } from "react-native-toast-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import color from "@/themes/AppColors";
import fonts from "@/themes/AppFonts";
import SignInText from "@/components/login/SignInText";
import AuthContainer from "@/utils/container/AuthContainer";

export default function PhoneNumberVerificationScreen() {
    const driver = useLocalSearchParams();
    const [otp, setOtp] = useState("");
    const [loader, setLoader] = useState(false);

    const handleSubmit = async () => {
        if (otp === "") {
            Toast.show("Please fill the fields!", {
                placement: "bottom",
            });
        } else {
            if (driver.name) {
                setLoader(true);
                const otpNumbers = `${otp}`;
                await axios
                    .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/verify-otp`, {
                        phoneNumber: driver.phoneNumber,
                        otp: otpNumbers,
                        ...driver,
                    })
                    .then((res) => {
                        const driverData = {
                            ...driver,
                            token: res.data.token,
                        };
                        setLoader(false);
                        router.push({
                            pathname: "/(routes)/EmailVerification",
                            params: driverData,
                        });
                    })
                    .catch((error) => {
                        Toast.show("Your otp is incorrect or expired!", {
                            placement: "bottom",
                            type: "danger",
                        });
                        console.log(error);
                    });
            } else {
                setLoader(true);
                const otpNumbers = `${otp}`;
                await axios
                    .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/login`, {
                        phoneNumber: driver.phoneNumber,
                        otp: otpNumbers,
                    })
                    .then(async (res) => {
                        setLoader(false);
                        await AsyncStorage.setItem("accessToken", res.data.accessToken);
                        router.push("/(tabs)/home");
                    })
                    .catch((error) => {
                        Toast.show("Your otp is incorrect or expired!", {
                            placement: "bottom",
                            type: "danger",
                        });
                        console.log(error);
                    });
            }
        }
    };
    return (
        <AuthContainer
            topSpace={windowHeight(210)}
            imageShow={true}
            container={
                <View>
                    <SignInText
                        title={"Phone Number Verification"}
                        subtitle={"Check your phone number for the otp!"}
                    />
                    <OTPTextInput
                        handleTextChange={(code) => setOtp(code)}
                        inputCount={4}
                        textInputStyle={styles.otpTextInput}
                        tintColor={color.subtitle}
                        autoFocus={false}
                    />
                    <View style={{ marginTop: windowHeight(20) }}>
                        <TouchableOpacity
                            style={commonStyles.button}
                            onPress={() => handleSubmit()}
                            disabled={loader}
                        >
                            <Text style={commonStyles.buttonText}>Verify</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginBottom: windowHeight(20) }}>
                        <View
                            style={[
                                {
                                    paddingVertical: windowHeight(10),
                                    flexDirection: "row",
                                    gap: 5,
                                    justifyContent: "center",
                                },
                            ]}
                        >
                            <Text style={[commonStyles.regularText]}>Not Received yet?</Text>
                            <TouchableOpacity>
                                <Text style={[styles.signUpText, { color: color.black }]}>
                                    Resend it
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    otpTextInput: {
        backgroundColor: color.lightGray,
        borderColor: color.lightGray,
        borderWidth: 0.5,
        borderRadius: 6,
        width: windowWidth(60),
        height: windowHeight(40),
        borderBottomWidth: 0.5,
        color: color.subtitle,
        textAlign: "center",
        fontSize: fontSizes.FONT22,
        marginTop: windowHeight(10),
    },
    button: {
        height: windowHeight(40),
        backgroundColor: color.buttonBg,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
    },
    signUpText: {
        ...commonStyles.mediumTextBlack12,
        fontFamily: fonts.bold,
        paddingHorizontal: 5,
    },
});
