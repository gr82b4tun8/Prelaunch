import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  // Image, // Image component is not used if you are only using placeholders
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar, // Make sure StatusBar is imported
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Assuming RootStackParamList is defined in a types file in the parent directory or a shared types folder
// Adjust the import path as per your project structure.
// For example: import type { RootStackParamList } from '../App'; or import type { RootStackParamList } from '../navigationTypes';
import type { RootStackParamList } from '../types/navigation'; // ** IMPORTANT: Adjust this import path **

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the structure for each welcome slide
interface WelcomeSlide {
  key: string;
  title: string;
  description: string;
  imagePlaceholder: {
    text: string;
    width: number;
    height: number;
    backgroundColor: string;
  };
}

// Content for the welcome slides
const APP_NAME = "VenueVibe"; // You can change this

const slides: WelcomeSlide[] = [
  {
    key: '1',
    title: `Welcome to ${APP_NAME}!`,
    description:
      "Tired of endless swiping? Discover genuine connections with people heading to the same events, bars, and venues as you!",
    imagePlaceholder: {
      text: 'Vibrant Event Scene',
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_HEIGHT * 0.3,
      backgroundColor: '#FFDAB9', // Light Peach
    },
  },
  {
    key: '2',
    title: 'Find Your Vibe, Find Your People',
    description:
      `Swipe through exciting local venues and events in ${APP_NAME}. Mark your interest, then discover other awesome people planning to be there!`,
    imagePlaceholder: {
      text: 'Venue Discovery UI',
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_HEIGHT * 0.3,
      backgroundColor: '#ADD8E6', // Light Blue
    },
  },
  {
    key: '3',
    title: 'Instant Connections, Real Potential',
    description:
      "See someone interesting? Double-tap to send a 'Like'. The best part? You'll always see who's liked you – no more guessing games or paywalls!",
    imagePlaceholder: {
      text: 'Match Notification / Like UI',
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_HEIGHT * 0.3,
      backgroundColor: '#90EE90', // Light Green
    },
  },
  {
    key: '4',
    title: "Take it Offline with IRL Mode!",
    description:
      `Once you're at the venue, confirm your arrival to activate 'IRL Mode' on ${APP_NAME}. Focus on real-world interactions, knowing who's open to connecting right there, right now. (Location sharing is always your choice!)`,
    imagePlaceholder: {
      text: 'IRL Mode Active UI',
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_HEIGHT * 0.3,
      backgroundColor: '#FFB6C1', // Light Pink
    },
  },
  {
    key: '5',
    title: 'Meet Smarter, Meet Safer',
    description:
      `Connect with confidence. ${APP_NAME} champions meeting in public spaces, making those first encounters more comfortable and secure than typical one-on-one dates. Say goodbye to sketchy DMs!`,
    imagePlaceholder: {
      text: 'Safe Public Meeting',
      width: SCREEN_WIDTH * 0.8,
      height: SCREEN_HEIGHT * 0.3,
      backgroundColor: '#E6E6FA', // Lavender
    },
  },
  {
    key: '6',
    title: 'Ready for Real Connections?',
    description:
      `Stop the endless chat cycles that go nowhere. ${APP_NAME} is built for genuine, real-world interactions. Create your prelaunch profile today and be the first to experience the future of social connection!`,
    imagePlaceholder: {
      text: `${APP_NAME} Logo`,
      width: SCREEN_WIDTH * 0.5,
      height: SCREEN_HEIGHT * 0.2,
      backgroundColor: '#F0E68C', // Khaki
    },
  },
];

// Props for the WelcomeScreen component
interface WelcomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WelcomeScreen'>;
  onWelcomeComplete: () => Promise<void>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation, onWelcomeComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
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
    await onWelcomeComplete();
    if (navigation && navigation.navigate) {
      navigation.navigate('CreateAccount');
    } else {
      console.warn('WelcomeScreen: Navigation prop is not available or navigate function is missing.');
    }
  };

  return (
    <View style={styles.fullScreenGradientContainer}>
      <LinearGradient
        colors={['#fe9494', '#00008b']} // Red to Dark Midnight Blue (e.g., #00004d)
        start={{ x: 0, y: 0.5 }} // Gradient from left
        end={{ x: 1, y: 0.5 }}   // Gradient to right
        style={StyleSheet.absoluteFillObject} // Fills the container
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content" // For dark backgrounds
          backgroundColor="transparent" // Make status bar transparent
          translucent={true} // Allow content (gradient) to draw behind status bar on Android
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
          {slides.map((slide) => (
            <View key={slide.key} style={styles.slide}>
              <View style={styles.imageContainer}>
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
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={handleSignUp}>
              <Text style={styles.buttonText}>Create My Profile & Get Early Access!</Text>
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
    backgroundColor: 'transparent', // Changed from '#FFFFFF'
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    // backgroundColor: 'transparent' // ScrollView is transparent by default
  },
  scrollViewContent: {
    // No changes needed here for the gradient
  },
  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60, // Ensure this doesn't hide content behind bottomControls
    // backgroundColor: 'transparent' // Slides are transparent by default
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: SCREEN_HEIGHT * 0.35,
    marginBottom: 20,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDDDDD', // This light border will be against the gradient
  },
  placeholderText: {
    fontSize: 16,
    color: '#FFFFF0', // Preserved: Note that this dark color might be hard to read
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFF0', // Preserved: Note that this dark color might be hard to read
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#FFFFF0', // Preserved: Note that this dark color might be hard to read
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
    backgroundColor: 'transparent', // Changed from '#FFFFFF'
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE', // This light border will be against the gradient
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
    backgroundColor: '#007AFF', // This should still be visible
  },
  dotInactive: {
    backgroundColor: '#C7C7CC', // This light grey might need adjustment for better visibility
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 25,
    minWidth: SCREEN_WIDTH * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  signUpButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#FFFFFF', // White text will be fine on buttons
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;