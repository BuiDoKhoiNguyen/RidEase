import React from "react";
import { View, Text, StyleSheet, KeyboardTypeOptions, TextInput,  } from "react-native";
import { useTheme } from "@react-navigation/native";
import { windowHeight, windowWidth } from "@/themes/AppConstants";
import color from "@/themes/AppColors";
import fonts from "@/themes/AppFonts";

interface InputProps {
  title: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  value?: string;
  warning?: string;
  onChangeText?: (text: string) => void;
  showWarning?: boolean;
  emailFormatWarning?: string;
  disabled?: boolean;
}

export default function Input({
  title,
  placeholder,
  keyboardType,
  value,
  warning,
  onChangeText,
  showWarning,
  emailFormatWarning,
  disabled,
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: color.lightGray,
            borderColor: colors.border,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={color.regularText}
        keyboardType={keyboardType}
        value={value}
        aria-disabled={disabled}
        onChangeText={onChangeText}
      />
      {showWarning && <Text style={[styles.warning]}>{warning}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.medium,
    fontSize: windowWidth(20),
    marginVertical: windowHeight(8),
  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 5,
    height: windowHeight(30),
    color: color.regularText,
    paddingHorizontal: 10,
  },
  warning: {
    color: color.red,
    marginTop: 3,
  },
});
