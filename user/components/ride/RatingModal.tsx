import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import color from '@/themes/AppColors';
import fonts from '@/themes/AppFonts';
import { fontSizes, windowHeight, windowWidth } from '@/themes/AppConstants';
import { AntDesign } from '@expo/vector-icons';
import Images from '@/utils/images';
import { StarFill } from '../../assets/icons/starFill';
import { StarEmpty } from '../../assets/icons/starEmpty';

interface RatingModalProps {
  visible: boolean;
  driverName?: string;
  driverPhoto?: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
  isSubmitting: boolean;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  driverName = "Tài xế",
  driverPhoto,
  onSubmit,
  onSkip,
  isSubmitting
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, comment);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }} // Tăng vùng chạm
          activeOpacity={0.7} // Hiệu ứng khi nhấn
        >
          <View style={styles.starContainer}>
            {i <= rating ? (
              <StarFill />
            ) : (
              <StarEmpty />
            )}
          </View>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onSkip}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Đánh giá tài xế</Text>
          
          <View style={styles.driverInfo}>
            <Image
              source={
                driverPhoto
                  ? { uri: "https://avatar.iran.liara.run/public/15" }
                  : Images.defaultProfile
              }
              style={styles.driverPhoto}
            />
            <Text style={styles.driverName}>{driverName}</Text>
          </View>

          <Text style={styles.rateText}>Bạn đánh giá chuyến đi này như thế nào?</Text>
          
          <View style={styles.starsContainer}>{renderStars()}</View>
          
          <TextInput
            style={styles.commentInput}
            placeholder="Nhập nhận xét của bạn (không bắt buộc)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onSkip}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Bỏ qua</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.buttonText, styles.submitText]}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  title: {
    fontSize: fontSizes.FONT20,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginBottom: windowHeight(15)
  },
  driverInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: windowHeight(20)
  },
  driverPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  driverName: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: color.regularText
  },
  rateText: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.regular,
    color: color.regularText,
    marginBottom: windowHeight(10),
    textAlign: 'center'
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: windowHeight(15)
  },
  starButton: {
    padding: 5
  },
  starContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  commentInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: windowHeight(20),
    fontFamily: fonts.regular,
    fontSize: fontSizes.FONT14
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F0F0F0'
  },
  submitButton: {
    backgroundColor: color.primary
  },
  buttonText: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: '#666'
  },
  submitText: {
    color: 'white'
  }
});

export default RatingModal;
