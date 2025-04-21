import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { Toast } from "react-native-toast-notifications";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import ProgressBar from "@/components/common/ProgressBar";
import fonts from "@/themes/AppFonts";
import color from "@/themes/AppColors";
import { Dropdown } from 'react-native-element-dropdown';
import { useTheme } from "@react-navigation/native";

export default function DocumentVerificationScreen() {
    const driverData = useLocalSearchParams();
    const { colors } = useTheme();
    const [showWarning, setShowWarning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        vehicleType: "Car",
        registrationNumber: "",
        registrationDate: "",
        drivingLicenseNumber: "",
        color: "",
        rate: "",
    });

    const vehicleTypes = [
        { label: 'Car', value: 'Car' },
        { label: 'Motorcycle', value: 'Motorcycle' },
        { label: 'CNG', value: 'cng' },
    ];

    const handleChange = (key: string, value: string) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        const driver = {
            ...driverData,
            vehicleType: formData.vehicleType,
            registrationNumber: formData.registrationNumber,
            registrationDate: formData.registrationDate,
            drivingLicense: formData.drivingLicenseNumber,
            vehicleColor: formData.color,
            rate: formData.rate,
        };

        await axios
            .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/send-otp`, {
                phoneNumber: `+${driverData.phoneNumber}`,
            })
            .then((res) => {
                router.push({
                    pathname: "/(routes)/PhoneVerification",
                    params: driver,
                });
                setLoading(false);
            })
            .catch((error) => {
                setLoading(false);
                Toast.show(error.message, {
                    placement: "bottom",
                    type: "danger",
                });
            });
    };

    return (
        <ScrollView>
            <View>
                {/* logo */}
                <Text
                    style={{
                        fontFamily: "TT-Octosquares-Medium",
                        fontSize: windowHeight(22),
                        paddingTop: windowHeight(50),
                        textAlign: "center",
                    }}
                >
                    RidEase
                </Text>
                <View style={{ padding: windowWidth(20) }}>
                    <ProgressBar fill={2} />
                    <View
                        style={[styles.subView, { backgroundColor: colors.background }]}
                    >
                        <View style={styles.space}>
                            <View style={{ marginBottom: windowHeight(20) }}>
                                <Text style={[styles.main, { color: colors.text }]}>Vehicle Registration</Text>
                                <Text style={[styles.sub]}>Explore your life by joining RidEase</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Vehicle Type</Text>
                                <Dropdown
                                    style={styles.dropdown}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    data={vehicleTypes}
                                    maxHeight={300}
                                    labelField="label"
                                    valueField="value"
                                    placeholder="Select vehicle type"
                                    value={formData.vehicleType}
                                    onChange={item => handleChange("vehicleType", item.value)}
                                />
                                {(showWarning && formData.vehicleType === "") && (
                                    <Text style={styles.warningText}>Please choose your vehicle type!</Text>
                                )}
                            </View>

                            {/* Registration Number */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Registration Number</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your vehicle registration number"
                                    keyboardType="number-pad"
                                    value={formData.registrationNumber}
                                    onChangeText={(text) => handleChange("registrationNumber", text)}
                                />
                                {showWarning && formData.registrationNumber === "" && (
                                    <Text style={styles.warningText}>
                                        Please enter your vehicle registration number!
                                    </Text>
                                )}
                            </View>

                            {/* Vehicle Registration Date */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Vehicle Registration Date</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your vehicle registration date"
                                    value={formData.registrationDate}
                                    onChangeText={(text) => handleChange("registrationDate", text)}
                                />
                                {showWarning && formData.registrationDate === "" && (
                                    <Text style={styles.warningText}>
                                        Please enter your vehicle Registration Date number!
                                    </Text>
                                )}
                            </View>

                            {/* Driving License Number */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Driving License Number</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your driving license number"
                                    keyboardType="number-pad"
                                    value={formData.drivingLicenseNumber}
                                    onChangeText={(text) => handleChange("drivingLicenseNumber", text)}
                                />
                                {showWarning && formData.drivingLicenseNumber === "" && (
                                    <Text style={styles.warningText}>
                                        Please enter your driving license number!
                                    </Text>
                                )}
                            </View>

                            {/* Vehicle Color */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Vehicle Color</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your vehicle color"
                                    value={formData.color}
                                    onChangeText={(text) => handleChange("color", text)}
                                />
                                {showWarning && formData.color === "" && (
                                    <Text style={styles.warningText}>
                                        Please enter your vehicle color!
                                    </Text>
                                )}
                            </View>

                            {/* Rate per km */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Rate per km</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="How much you want to charge per km."
                                    keyboardType="number-pad"
                                    value={formData.rate}
                                    onChangeText={(text) => handleChange("rate", text)}
                                />
                                {showWarning && formData.rate === "" && (
                                    <Text style={styles.warningText}>
                                        Please enter how much you want to charge from your customer per km.
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.margin}>
                            <TouchableOpacity
                                onPress={() => handleSubmit()}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    subView: {
        height: "100%",
    },
    space: {
        marginHorizontal: windowWidth(4),
    },
    margin: {
        marginVertical: windowHeight(12),
    },
    main: {
        fontSize: fontSizes.FONT30,
        fontFamily: fonts.medium,
        marginTop: windowHeight(2),
    },
    sub: {
        color: color.secondaryFont,
        marginTop: windowHeight(0.6),
        fontSize: fontSizes.FONT20,
        fontFamily: fonts.medium,
        marginBottom: windowHeight(2),
    },
    // Styles mới cho TextInput
    inputContainer: {
        marginBottom: windowHeight(16),
    },
    inputLabel: {
        fontFamily: fonts.medium,
        fontSize: windowHeight(12),
        color: color.primaryText,
        marginBottom: windowHeight(5),
    },
    textInput: {
        height: windowHeight(50),
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 8,
        paddingHorizontal: windowWidth(12),
        backgroundColor: color.lightGray,
        fontSize: windowHeight(10),
    },
    warningText: {
        color: 'red',
        fontSize: windowHeight(12),
        marginTop: 5,
    },
    button: {
        height: windowHeight(40),
        backgroundColor: color.buttonBg,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
    },
    buttonText: {
        color: color.whiteColor,
        fontWeight: "bold",
        fontSize: fontSizes.FONT18,
    },
    dropdown: {
        height: windowHeight(50),
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 8,
        paddingHorizontal: windowWidth(12),
        backgroundColor: color.lightGray,
    },
    placeholderStyle: {
        fontSize: windowHeight(12),
        color: 'gray',
    },
    selectedTextStyle: {
        fontSize: windowHeight(12),
    },

})