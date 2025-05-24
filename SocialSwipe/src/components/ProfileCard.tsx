// components/ProfileCard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Dimensions,
    Platform,
    // Pressable, // Removed as it was only used for arrow buttons
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TapGestureHandler, State, FlingGestureHandler, Directions, FlingGestureHandlerStateChangeEvent } from 'react-native-gesture-handler'; // Added FlingGestureHandler, Directions, FlingGestureHandlerStateChangeEvent
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
    
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    const goToPrevImage = useCallback(() => {
        setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }, []);

    const goToNextImage = useCallback(() => {
        if (profile.profile_pictures) {
            setCurrentImageIndex(prev => Math.min(profile.profile_pictures.length - 1, prev + 1));
        }
    }, [profile.profile_pictures]);

    // Swipe handlers for image navigation
    const onSwipeLeft = useCallback((event: FlingGestureHandlerStateChangeEvent) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            if (profile.profile_pictures && profile.profile_pictures.length > 1) {
                goToNextImage();
            }
        }
    }, [goToNextImage, profile.profile_pictures]);

    const onSwipeRight = useCallback((event: FlingGestureHandlerStateChangeEvent) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            if (profile.profile_pictures && profile.profile_pictures.length > 1) {
                goToPrevImage();
            }
        }
    }, [goToPrevImage, profile.profile_pictures]);


    if (!isVisible) {
        return null;
    }

    const CardContents = () => (
        <>
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
            />

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

            {/* Image Navigation Arrows REMOVED */}

            <Reanimated.View style={[styles.animatedHeartContainer, animatedHeartStyle]}>
                <Icon name="heart" size={100} color="#FFFFFF" style={styles.heartIcon} />
            </Reanimated.View>

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
            <FlingGestureHandler
                direction={Directions.RIGHT}
                onHandlerStateChange={onSwipeRight}
            >
                <FlingGestureHandler
                    direction={Directions.LEFT}
                    onHandlerStateChange={onSwipeLeft}
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
                                <CardContents /> 
                                <View style={styles.noImageTextContainer}>
                                    <Text style={styles.noImageText}>No image available</Text>
                                </View>
                            </View>
                        )}
                    </Reanimated.View>
                </FlingGestureHandler>
            </FlingGestureHandler>
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
        justifyContent: 'flex-end',
    },
    fallbackBackground: {
        backgroundColor: '#001F3F', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageTextContainer: {
        position: 'absolute',
        top: '40%',
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
        height: screenHeight * 0.5,
    },
    navTapZoneContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        zIndex: 1,
    },
    navTapArea: {
        flex: 1, 
        height: '100%',
    },
    navTapCenterArea: {
        flex: 1,
        height: '100%',
    },
    // Styles for image navigation arrows - REMOVED
    // imageNavigationContainer, imageNavButtonWrapper, imageNavButton, imageNavButtonLeft, imageNavButtonRight, navIconShadow
    infoContainer: {
        backgroundColor: 'rgba(0, 12, 40, 0.7)',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20, 
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginHorizontal: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 2, 
    },
    nameAgeText: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-bold',
        fontWeight: 'bold',
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    metaRow: {
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
    interestsSection: {
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
    lookingForSection: {
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