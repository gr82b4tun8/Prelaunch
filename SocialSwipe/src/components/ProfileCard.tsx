// components/ProfileCard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Dimensions,
    Platform,
    Pressable, // Added for arrow buttons
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface Profile {
    id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures: string[]; // Expect this to be an array of URLs
    created_at: string;
    updated_at: string;
}

interface ProfileCardProps {
    profile: Profile;
    onLike: (profileId: string) => void;
    onRequestNextProfile: () => void;
    onRequestPrevProfile: () => void;
    isVisible: boolean;
}

const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const interestColors: { [key: string]: string[] } = {
    default: ['#00C6FF', '#0072FF'],
    bars: ['#00C6FF', '#0072FF'],
    gaming: ['#6A11CB', '#2575FC'],
    music: ['#FF9966', '#FF5E62'],
    sports: ['#4CAF50', '#81C784'],
    travel: ['#FFC107', '#FFD54F'],
    foodie: ['#F44336', '#E57373'],
    art: ['#9C27B0', '#BA68C8'],
    reading: ['#3F51B5', '#7986CB'],
};

const ProfileCard: React.FC<ProfileCardProps> = ({
    profile,
    onLike,
    onRequestNextProfile,
    onRequestPrevProfile,
    isVisible,
}) => {
    const age = useMemo(() => calculateAge(profile.date_of_birth), [profile.date_of_birth]);
    
    // State for current image index
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Reset image index when the profile changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [profile.id]);

    const displayedImageUri = profile.profile_pictures?.[currentImageIndex] || null;

    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);
    const doubleTapRef = useRef(null);

    const animatedHeartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
        opacity: heartOpacity.value,
    }));

    const triggerLikeAnimation = useCallback(() => {
        heartScale.value = withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(1.3, { duration: 200 }),
            withTiming(0, { duration: 300 })
        );
        heartOpacity.value = withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 300 })
        );
    }, [heartScale, heartOpacity]);

    const onDoubleTapEvent = useCallback((event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            onLike(profile.id);
            triggerLikeAnimation();
        }
    }, [profile.id, onLike, triggerLikeAnimation]);

    // Handlers for image navigation
    const goToPrevImage = useCallback(() => {
        setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }, []);

    const goToNextImage = useCallback(() => {
        if (profile.profile_pictures) {
            setCurrentImageIndex(prev => Math.min(profile.profile_pictures.length - 1, prev + 1));
        }
    }, [profile.profile_pictures]);


    if (!isVisible) {
        return null;
    }

    // This component renders the main content that overlays the image (gradient, info, etc.)
    // It now also includes the image navigation arrows.
    const CardContents = () => (
        <>
            {/* Gradient overlay from bottom */}
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
            />

            {/* Tap zones for PREV/NEXT PROFILE navigation */}
            <View style={styles.navTapZoneContainer}>
                <TapGestureHandler
                    onHandlerStateChange={({ nativeEvent }) => {
                        if (nativeEvent.state === State.END && nativeEvent.oldState === State.ACTIVE) {
                            onRequestPrevProfile();
                        }
                    }}
                    waitFor={doubleTapRef}
                >
                    <View style={styles.navTapArea} />
                </TapGestureHandler>
                {/* Center area is part of double tap, but also a spacer for profile nav tap zones */}
                <View style={styles.navTapCenterArea} /> 
                <TapGestureHandler
                    onHandlerStateChange={({ nativeEvent }) => {
                        if (nativeEvent.state === State.END && nativeEvent.oldState === State.ACTIVE) {
                            onRequestNextProfile();
                        }
                    }}
                    waitFor={doubleTapRef}
                >
                    <View style={styles.navTapArea} />
                </TapGestureHandler>
            </View>

            {/* Image Navigation Arrows */}
            {profile.profile_pictures && profile.profile_pictures.length > 1 && (
                <View style={styles.imageNavigationContainer}>
                    {/* Left Arrow (Previous Image) */}
                    <View style={styles.imageNavButtonWrapper}>
                        {currentImageIndex > 0 && (
                            <Pressable
                                onPress={goToPrevImage}
                                style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increases tappable area
                            >
                                <Icon name="chevron-back-outline" size={36} color="#FFFFFF" style={styles.navIconShadow} />
                            </Pressable>
                        )}
                    </View>
                    {/* Right Arrow (Next Image) */}
                    <View style={styles.imageNavButtonWrapper}>
                        {currentImageIndex < (profile.profile_pictures?.length ?? 0) - 1 && (
                            <Pressable
                                onPress={goToNextImage}
                                style={[styles.imageNavButton, styles.imageNavButtonRight]}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increases tappable area
                            >
                                <Icon name="chevron-forward-outline" size={36} color="#FFFFFF" style={styles.navIconShadow} />
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* Animated heart for double tap like */}
            <Reanimated.View style={[styles.animatedHeartContainer, animatedHeartStyle]}>
                <Icon name="heart" size={100} color="#FFFFFF" style={styles.heartIcon} />
            </Reanimated.View>

            {/* Profile information at the bottom */}
            <View style={styles.infoContainer}>
                <Text style={styles.nameAgeText}>
                    {profile.first_name}, {age}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Gender: </Text>
                    <Text style={styles.metaValue}>{profile.gender}</Text>
                    <Text style={[styles.metaLabel, { marginLeft: 16 }]}>Location: </Text>
                    <Text style={styles.metaValue}>{profile.location || 'N/A'}</Text>
                </View>
                {profile.interests && profile.interests.length > 0 && (
                    <View style={styles.interestsSection}>
                        <View style={styles.interestsTagsContainer}>
                            {profile.interests.slice(0, 5).map((interest, index) => {
                                const interestKey = interest.toLowerCase().replace(/\s+/g, '');
                                const tagColors = interestColors[interestKey] || interestColors.default;
                                return (
                                    <LinearGradient
                                        key={index}
                                        colors={tagColors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.interestTag}
                                    >
                                        <Text style={styles.interestTagText}>{interest}</Text>
                                    </LinearGradient>
                                );
                            })}
                        </View>
                    </View>
                )}
                {profile.looking_for && (
                    <View style={styles.lookingForSection}>
                        <Text style={styles.sectionLabel}>Looking for</Text>
                        <Text style={styles.lookingForText}>{profile.looking_for}</Text>
                    </View>
                )}
            </View>
        </>
    );

    return (
        <TapGestureHandler
            ref={doubleTapRef}
            onHandlerStateChange={onDoubleTapEvent}
            numberOfTaps={2}
        >
            <Reanimated.View style={styles.fullScreenView} collapsable={false}>
                {displayedImageUri ? (
                    <ImageBackground
                        source={{ uri: displayedImageUri }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        onError={(error) => console.log("Image loading error: ", error.nativeEvent.error)}
                    >
                        <CardContents />
                    </ImageBackground>
                ) : (
                    <View style={[styles.backgroundImage, styles.fallbackBackground]}>
                        {/* Show CardContents even for fallback, so info is visible */}
                        <CardContents /> 
                        {/* Optionally, add a placeholder text if no image and fallback */}
                        <View style={styles.noImageTextContainer}>
                            <Text style={styles.noImageText}>No image available</Text>
                        </View>
                    </View>
                )}
            </Reanimated.View>
        </TapGestureHandler>
    );
};

const styles = StyleSheet.create({
    fullScreenView: {
        flex: 1,
    },
    backgroundImage: { 
        flex: 1,
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'flex-end', // Aligns infoContainer (child of CardContents) to the bottom
    },
    fallbackBackground: {
        backgroundColor: '#001F3F', 
        justifyContent: 'center', // Center "No image" text if needed
        alignItems: 'center',
    },
    noImageTextContainer: { // Styles for "No image available" text on fallback
        position: 'absolute', // Position it over the fallback background
        top: '40%', // Roughly center it vertically before info box
        alignSelf: 'center',
    },
    noImageText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 18,
        fontStyle: 'italic',
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: screenHeight * 0.5, // Adjusted height for a more subtle gradient from bottom
    },
    navTapZoneContainer: { // For PREV/NEXT PROFILE
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0, // Spans the entire card height
        flexDirection: 'row',
        zIndex: 1, // Below image nav arrows, info box, and heart
    },
    navTapArea: { // Takes up 1/3 of the width for profile navigation
        flex: 1, 
        height: '100%',
    },
    navTapCenterArea: { // Middle 1/3, primarily for double tap
        flex: 1,
        height: '100%',
    },
    imageNavigationContainer: { // For PREV/NEXT IMAGE arrows
        position: 'absolute',
        top: screenHeight * 0.45, 
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 8, 
        zIndex: 2, 
    },
    imageNavButtonWrapper: { 
        flex: 1, 
    },
    imageNavButton: {
        padding: 12, 
    },
    imageNavButtonLeft: {
        alignSelf: 'flex-start', 
    },
    imageNavButtonRight: {
        alignSelf: 'flex-end', 
    },
    navIconShadow: { 
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    infoContainer: { // RESTORED ORIGINAL STYLING
        backgroundColor: 'rgba(0, 12, 40, 0.7)',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20, 
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginHorizontal: 20, // RESTORED: Keeps info box from screen side edges
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 2, 
    },
    nameAgeText: { // REMOVED paddingHorizontal
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-bold',
        fontWeight: 'bold',
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    metaRow: { // REMOVED paddingHorizontal
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    metaLabel: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 16,
        color: '#CCCCCC',
    },
    metaValue: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    interestsSection: { // REMOVED paddingHorizontal
        marginBottom: 12,
    },
    sectionLabel: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
        fontSize: 16,
        color: '#E0E0E0',
        marginBottom: 8,
        fontWeight: '600',
    },
    interestsTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    interestTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 6,
    },
    interestTagText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    lookingForSection: { // REMOVED paddingHorizontal
    },
    lookingForText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-semibold',
        fontSize: 18,
        color: '#FF5C8D',
        fontWeight: '600',
    },
    animatedHeartContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3, 
    },
    heartIcon: {
        textShadowColor: 'rgba(255, 92, 141, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
});

export default ProfileCard;
