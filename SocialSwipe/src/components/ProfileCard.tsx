import React, { useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Dimensions,
    Platform,
    SafeAreaView,
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
    profile_pictures: string[];
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
    const primaryImage = profile.profile_pictures?.[0] || null;

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

    if (!isVisible) {
        return null;
    }

    const CardContents = () => (
        <>
            <LinearGradient
                colors={['#001F3F00', '#001F3FCC']}
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
        <SafeAreaView style={styles.fullScreenSafe}>
            <TapGestureHandler
                ref={doubleTapRef}
                onHandlerStateChange={onDoubleTapEvent}
                numberOfTaps={2}
            >
                <Reanimated.View style={styles.fullScreenView} collapsable={false}>
                    {primaryImage ? (
                        <ImageBackground
                            source={{ uri: primaryImage }}
                            style={styles.backgroundImage}
                            resizeMode="cover"
                            onError={(error) => console.log("Image loading error: ", error.nativeEvent.error)}
                        >
                            <CardContents />
                        </ImageBackground>
                    ) : (
                        <View style={[styles.backgroundImage, styles.fallbackBackground]}>
                            <CardContents />
                        </View>
                    )}
                </Reanimated.View>
            </TapGestureHandler>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    fullScreenSafe: {
        flex: 1,
        backgroundColor: '#000', // Fallback for SafeAreaView edges
    },
    fullScreenView: {
        flex: 1,
    },
    backgroundImage: { // Common styles for both ImageBackground and fallback View
        flex: 1,
        width: screenWidth,
        height: screenHeight,
        justifyContent: 'flex-end', // Aligns infoContainer (child of CardContents) to the bottom
    },
    fallbackBackground: {
        backgroundColor: '#001F3F', // Deep navy, matching the gradient start color
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: screenHeight * 0.6, // Adjust gradient height as needed
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
    lookingForSection: {},
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