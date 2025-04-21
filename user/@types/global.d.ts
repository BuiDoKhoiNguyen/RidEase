type ButtonProps = {
  title?: string;
  onPress?: () => void;
  width?: DimensionValue;
  backgroundColor?: string;
  textColor?: string;
  disabled?: boolean;
};

type UserType = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  rating?: Number;
  totalRides?: Number;
  cratedAt: Date;
  updatedAt: Date;
}

type DriverType = {
  id: string;
  name: string;
  country: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  registrationNumber: string;
  registrationDate: string;
  drivingLicense: string;
  vehicleColor: string;
  rate: string;
  ratings: number;
  totalEarning: number;
  totalRides: number;
  pendingRides: number;
  cancelRides: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};