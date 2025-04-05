import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { fontSizes, SCREEN_HEIGHT, windowHeight, windowWidth } from "@/themes/app.constant";
import { commonStyles } from "@/styles/common.style";
import { external } from "@/styles/external.style";
import color from "@/themes/app.colors";
import { Toast } from "react-native-toast-notifications";
import OTPTextInput from "react-native-otp-textinput";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthContainer from "@/utils/container/authContainer";
import fonts from "@/themes/AppFonts";

export default function EmailVerificationScreen() {
    const [otp, setOtp] = useState("");
    const [loader, setLoader] = useState(false);
    const { user } = useLocalSearchParams() as any;
    const parsedUser = JSON.parse(user);

    const handleSubmit = async () => {
        setLoader(true);
        const otpNumbers = `${otp}`;
        await axios
            .put(`${process.env.EXPO_PUBLIC_SERVER_URI}/email-otp-verify`, {
                token: parsedUser.token,
                otp: otpNumbers,
            })
            .then(async (res: any) => {
                setLoader(false);
                await AsyncStorage.setItem("accessToken", res.data.accessToken);
                router.push("/(tabs)/home");
            })
            .catch((error) => {
                setLoader(false);
                Toast.show(error.message, {
                    placement: "bottom",
                    type: "danger",
                });
            });
    };

    return (
        <AuthContainer
            topSpace={windowHeight(240)}
            imageShow={true}
            container={
                <View style={{ height: SCREEN_HEIGHT - windowHeight(240 + 175), paddingHorizontal: windowWidth(16) }}>
                    <View>
                        <Text style={{
                            fontSize: fontSizes.FONT30,
                            fontFamily: fonts.medium,
                            marginTop: windowHeight(2),
                            color: color.primaryText
                        }}>Email Verification</Text>
                        <Text style={{
                            color: color.secondaryFont || '#666',
                            marginTop: windowHeight(0.6),
                            fontSize: fontSizes.FONT20,
                            fontFamily: fonts.medium,
                            marginBottom: windowHeight(2),
                        }}>Check your email address for the otp!</Text>
                    </View>
                    <OTPTextInput
                        handleTextChange={(code) => setOtp(code)}
                        inputCount={4}
                        textInputStyle={styles.otpTextInput}
                        tintColor={color.subtitle}
                        autoFocus={false}
                    />

                    <View style={{ marginTop: 30 }}>
                        <TouchableOpacity
                            style={styles.verifyButton}
                            onPress={() => handleSubmit()}
                            disabled={loader}
                        >
                            <Text style={styles.verifyText}>Verify</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginBottom: 15 }}>
                        <View
                            style={[
                                { paddingBottom: 10, paddingTop: 10, flexDirection: "row", gap: 5, justifyContent: "center" },
                            ]}
                        >
                            <Text style={[commonStyles.regularText]}>Not Received yet?</Text>
                            <TouchableOpacity>
                                <Text style={[styles.signUpText, { color: "#000" }]}>
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
    signUpText: {
        ...commonStyles.mediumTextBlack12,
        fontFamily: fonts.bold,
        paddingHorizontal: 5,
    },
    verifyButton: {
        backgroundColor: color.buttonBg,
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        marginBottom: 10
    },
    verifyText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
    }
});