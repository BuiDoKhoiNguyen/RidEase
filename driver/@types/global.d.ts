type ButtonProps = {
  title?: string;
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  backgroundColor?: string;
  textColor?: string;
  disabled?: boolean;
};

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

type recentRidesTypes = {
  id: string;
  user: any;
  rating: string;
  earning: string;
  pickup: string;
  dropOff: string;
  time: string;
  distance: string;
};
