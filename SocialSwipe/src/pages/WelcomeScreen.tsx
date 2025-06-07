import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image, // Image component is needed
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Adjust the import path as per your project structure.
import type { RootStackParamList } from '../types/navigation'; // ** IMPORTANT: Adjust this import path **
import navImage from '../assets/nav.png'; // Assuming this path is correct relative to this file
import logoImage from '../assets/logo.png'; // ** ADDED: Import for the logo image **
import eventSceneImage from '../assets/eventScene.png'; // ** ADDED: Import for the event scene image **
import locationRequestImage from '../assets/locationrequest.png'; // ** ADDED: Import for the location request image **
import venueImage from '../assets/venue.png'; // ** ADDED: Import for the venue image **
import profileImage from '../assets/profile.png'; // ** ADDED: Import for the profile image **

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the structure for each welcome slide using a discriminated union
interface BaseSlide {
  key: string;
  title: string;
  description: string;
}

interface PlaceholderSlide extends BaseSlide {
  imagePlaceholder: {
    text: string;
    width: number;
    height: number;
    backgroundColor: string;
  };
  image?: undefined; // Explicitly state that image is not on this type
  width?: undefined; // Explicitly state that root width is not for this type
  height?: undefined; // Explicitly state that root height is not for this type
}

interface ImageSlide extends BaseSlide {
  image: any; // In React Native, this is typically ImageSourcePropType, using 'any' for simplicity
  width: number; // Width for the actual image
  height: number; // Height for the actual image
  imagePlaceholder?: undefined; // Explicitly state that imagePlaceholder is not on this type
}

type WelcomeSlideType = PlaceholderSlide | ImageSlide;

// Content for the welcome slides
const APP_NAME = "Sphere"; // You can change this

const slides: WelcomeSlideType[] = [
  { // ** MODIFIED: This slide now uses the eventSceneImage **
    key: '1',
    title: `Welcome to ${APP_NAME}!`,
    description:
      "Tired of endless swiping? Discover genuine connections with people heading to the same events, bars, and venues as you!",
    image: eventSceneImage, // Use the imported event scene image
    width: SCREEN_WIDTH * 0.87, // Width for the event scene image
    height: SCREEN_HEIGHT * 0.4, // Height for the event scene image
  },
  { // ** MODIFIED: This slide now uses the venueImage **
    key: '2',
    title: 'Find Your Vibe, Find Your People',
    description:
      `Swipe through exciting local venues and events in ${APP_NAME}. Mark your interest, then discover other awesome people planning to be there!`,
    image: venueImage, // Use the imported venue image
    width: SCREEN_WIDTH * .811, // Width from the original placeholder
    height: SCREEN_HEIGHT * 0.63, // Height from the original placeholder
  },
  { // ** MODIFIED: This slide now uses the profileImage **
    key: '3',
    title: 'Real Connections, Real Potential',
    description:
      "See someone interesting? Double-tap to send a 'Like'. The best part? You'll always see who's liked you – no more guessing games or paywalls!",
    image: profileImage, // Use the imported profile image
    width: SCREEN_WIDTH * 0.71, // Width from the original placeholder
    height: SCREEN_HEIGHT * 0.579, // Height from the original placeholder
  },
  { // This slide uses an actual image
    key: '4',
    title: "Take it Offline with IRL Mode!",
    description:
      `Once you're at the venue, confirm your arrival to activate 'IRL Mode' on ${APP_NAME}. Focus on real-world interactions, knowing who's open to connecting right there, right now. (Location sharing is always your choice!)`,
    image: navImage, // Use the imported image
    width: SCREEN_WIDTH * 0.8, // ** REVERTED: Width for the actual image **
    height: SCREEN_HEIGHT * .551, // ** REVERTED: Height for the actual image **
  },
  { // ** MODIFIED: This slide now uses the locationRequestImage **
    key: '5',
    title: 'Meet Smarter, Meet Safer',
    description:
      `Connect with confidence. ${APP_NAME} champions meeting in public spaces, making those first encounters more comfortable and secure than typical one-on-one dates. Say goodbye to sketchy DMs!`,
    image: locationRequestImage, // Use the imported location request image
    width: SCREEN_WIDTH * 0.8, // Width for the location request image
    height: SCREEN_HEIGHT * 0.551, // Height for the location request image
  },
  { // ** MODIFIED: This slide now uses the logo image **
    key: '6',
    title: 'Ready for Real Connections?',
    description:
      `Stop the endless chat cycles that go nowhere. ${APP_NAME} is built for genuine, real-world interactions. Create your prelaunch profile today and be the first to experience the future of social connection!`,
    image: logoImage, // Use the imported logo image
    width: SCREEN_WIDTH * 1, // Width for the logo image (taken from previous placeholder)
    height: SCREEN_HEIGHT * 0.3, // Height for the logo image (taken from previous placeholder)
  },
];

// Props for the WelcomeScreen component
interface WelcomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WelcomeScreen'>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const onScroll = (event: any) => {
    const slideSize = SCREEN_WIDTH;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / slideSize);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const goToNextSlide = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: SCREEN_WIDTH * nextIndex,
        animated: true,
      });
    }
  };

  const handleSignUp = async () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('CreateAccount');
    } else {
      console.warn('WelcomeScreen: Navigation prop is not available or navigate function is missing.');
    }
  };

  const backgroundGradientColors = ['#fe9494', '#00008b'];
  const buttonGradientColors = [...backgroundGradientColors].reverse();

  return (
    <View style={styles.fullScreenGradientContainer}>
      <LinearGradient
        colors={backgroundGradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          {slides.map((slide: WelcomeSlideType) => (
            <View key={slide.key} style={styles.slide}>
              <View style={styles.imageContainer}>
                {slide.imagePlaceholder ? (
                  <View
                    style={[
                      styles.placeholderImage,
                      {
                        width: slide.imagePlaceholder.width,
                        height: slide.imagePlaceholder.height,
                        backgroundColor: slide.imagePlaceholder.backgroundColor,
                      },
                    ]}
                  >
                    <Text style={styles.placeholderText}>{slide.imagePlaceholder.text}</Text>
                  </View>
                ) : slide.image ? (
                  // SECTION FOR ACTUAL IMAGE RENDERING
                  <View style={[
                    styles.roundedImageWrapper, // Apply wrapper style for rounding and overflow
                    {
                      width: slide.width, // Dynamic width for the wrapper
                      height: slide.height, // Dynamic height for the wrapper
                    }
                  ]}>
                    <Image
                      source={slide.image}
                      style={styles.actualImage} // Image fills the rounded wrapper
                      resizeMode="contain" // Changed to contain to ensure logo/image visibility
                    />
                  </View>
                ) : null}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomControls}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  currentIndex === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity style={styles.button} onPress={goToNextSlide}>
              <LinearGradient
                colors={buttonGradientColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.buttonGradientWrapper}
              >
                <Text style={styles.buttonText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={handleSignUp}>
              <LinearGradient
                colors={buttonGradientColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.buttonGradientWrapper}
              >
                <Text style={styles.buttonText}>Create My Profile & Get Early Access!</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenGradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    // No specific changes needed here
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 120, // Space for bottom controls
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: SCREEN_HEIGHT * 0.25, // Adjust as needed, helps prevent text overlap
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  placeholderText: {
    fontSize: 16,
    color: '#FFFFF0',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  roundedImageWrapper: {
    borderRadius: 15,
    overflow: 'hidden',
    // width and height will be applied dynamically inline to this wrapper
    // ** REMOVED BORDER STYLES THAT CAUSED THE FAINT BOXES **
    // borderWidth: 1, // Removed
    // borderColor: 'rgba(255, 255, 255, 0.2)', // Removed
  },
  actualImage: {
    width: '100%',
    height: '100%',
    // resizeMode is applied directly on the Image component
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFF0',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#FFFFF0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: 'transparent',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  button: {
    borderRadius: 25,
    minWidth: SCREEN_WIDTH * 0.7,
    maxWidth: SCREEN_WIDTH * 0.9,
    height: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButton: {
    minWidth: SCREEN_WIDTH * 0.85,
  },
  buttonGradientWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default WelcomeScreen;