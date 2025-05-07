// src/components/ProfileCard.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    FlatList,
    Dimensions,
    Pressable,
    ActivityIndicator,
    GestureResponderEvent,
} from "react-native";
import { differenceInYears } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

export interface Profile { // Ensure this interface matches your data structure
    id: string;
    created_at: string;
    updated_at: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures?: string[] | null;
}

interface ProfileCardProps {
    profile: Profile;
    isVisible?: boolean;
    onLike?: (profileId: string) => void;
    onRequestNextProfile?: () => void;
    onRequestPrevProfile?: () => void;
}

const calculateAge = (dobString: string): number | null => {
    try {
        const dob = new Date(dobString);
        if (isNaN(dob.getTime())) {
            // console.warn("Invalid date of birth received:", dobString);
            return null;
        }
        return differenceInYears(new Date(), dob);
    } catch (e) {
        // console.error("Error calculating age:", e);
        return null;
    }
};

const { width: screenWidth } = Dimensions.get("window");
const cardWidth = screenWidth * 0.90; // Card width is 95% of screen width

interface CarouselImageItemProps { url: string; }
const CarouselImageItem: React.FC<CarouselImageItemProps> = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    return (
        <View style={styles.carouselItemContainer}>
            {isLoading && !hasError && (<ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#cccccc" />)}
            <Image
                source={{ uri: url }}
                style={styles.carouselImage}
                resizeMode="cover"
                onLoadStart={() => { setIsLoading(true); setHasError(false); }}
                onLoadEnd={() => setIsLoading(false)}
                onError={(error) => {
                    setIsLoading(false);
                    setHasError(true);
                    console.warn("Failed to load image in ProfileCard:", url, error.nativeEvent?.error);
                }}
            />
            {hasError && (
                <View style={[StyleSheet.absoluteFill, styles.imageErrorOverlay]}>
                    <Ionicons name="alert-circle-outline" size={40} color="#fff" />
                    <Text style={styles.imageErrorText}>Image Error</Text>
                </View>
            )}
        </View>
    );
};

const ProfileCard: React.FC<ProfileCardProps> = ({
    profile,
    onLike,
    isVisible,
    onRequestNextProfile,
    onRequestPrevProfile,
}) => {
    const age = calculateAge(profile.date_of_birth);
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const lastTapTimestamp = useRef<number | null>(null);
    const DOUBLE_PRESS_DELAY = 300;

    const images = Array.isArray(profile.profile_pictures) ? profile.profile_pictures : [];

    useEffect(() => {
        // Reset active index and scroll to start when profile changes or card becomes visible
        if (isVisible === true || isVisible === undefined) {
            setActiveIndex(0);
            if (images.length > 0 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: 0, animated: false });
            }
        }
    }, [isVisible, profile.id, images.length]);

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / cardWidth);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    // For chevron presses - strictly image navigation
    const goToPrevImage = useCallback(() => {
        if (activeIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
        }
    }, [activeIndex]);

    const goToNextImage = useCallback(() => {
        if (activeIndex < images.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        }
    }, [activeIndex, images.length]);

    // For main card press - double tap like, single tap profile navigation
    const mainCardPressHandler = useCallback((event: GestureResponderEvent) => {
        const now = Date.now();
        const { locationX } = event.nativeEvent;

        if (lastTapTimestamp.current && (now - lastTapTimestamp.current) < DOUBLE_PRESS_DELAY) {
            // Double tap for liking
            if (onLike) {
                onLike(profile.id);
            }
            lastTapTimestamp.current = null; // Reset for next tap sequence
        } else {
            // Single tap for profile navigation
            lastTapTimestamp.current = now;
            
            if (locationX < cardWidth / 2) { // Tapped on left half for previous profile
                if (onRequestPrevProfile) {
                    onRequestPrevProfile();
                }
            } else { // Tapped on right half for next profile
                if (onRequestNextProfile) {
                    onRequestNextProfile();
                }
            }
        }
    }, [profile.id, onLike, cardWidth, onRequestPrevProfile, onRequestNextProfile, DOUBLE_PRESS_DELAY]);


    const renderImageItem = useCallback(({ item: url }: { item: string }) => {
        return <CarouselImageItem url={url} />;
    }, []);

    if (!profile) return null;

    // Disabled state for image navigation chevrons
    const isPrevImageDisabled = activeIndex === 0;
    const isNextImageDisabled = activeIndex >= images.length - 1; // >= handles empty or single image correctly (chevrons hidden anyway)

    return (
        <Pressable 
            onPress={mainCardPressHandler} 
            style={styles.card} 
            // Disable main card pressable if no interaction (like or profile nav) is possible
            disabled={!(onLike || onRequestNextProfile || onRequestPrevProfile)}
        >
            <View style={styles.carouselContainer}>
                {images.length > 0 ? (
                    <>
                        <FlatList
                            ref={flatListRef}
                            data={images}
                            renderItem={renderImageItem}
                            keyExtractor={(item, index) => `${profile.id}-img-${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            style={styles.flatList}
                            contentContainerStyle={styles.flatListContent}
                            getItemLayout={(data, index) => ({
                                length: cardWidth,
                                offset: cardWidth * index,
                                index,
                            })}
                            bounces={false} // Prevent bouncing past ends if not desired
                            initialNumToRender={1} // Performance
                            maxToRenderPerBatch={3} // Performance
                            windowSize={5} // Performance
                            removeClippedSubviews={true} // Performance
                        />
                        {/* Image Navigation Chevrons - only for image changes */}
                        {images.length > 1 && ( // Only show chevrons if there are multiple images
                            <>
                                <Pressable
                                    style={[styles.carouselControl, styles.carouselPrev]}
                                    onPress={goToPrevImage} // Strictly navigates images
                                    disabled={isPrevImageDisabled}
                                    hitSlop={10} // Makes it easier to tap
                                >
                                    <Ionicons name="chevron-back-circle" size={36} color={isPrevImageDisabled ? "rgba(255, 255, 255, 0.3)" : "#fff"} style={styles.controlIconShadow} />
                                </Pressable>
                                <Pressable
                                    style={[styles.carouselControl, styles.carouselNext]}
                                    onPress={goToNextImage} // Strictly navigates images
                                    disabled={isNextImageDisabled}
                                    hitSlop={10}
                                >
                                    <Ionicons name="chevron-forward-circle" size={36} color={isNextImageDisabled ? "rgba(255, 255, 255, 0.3)" : "#fff"} style={styles.controlIconShadow}/>
                                </Pressable>
                            </>
                        )}
                        {/* Pagination Dots for images */}
                        {images.length > 1 && (
                             <View style={styles.paginationContainer}>
                                {images.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.paginationDot,
                                            activeIndex === index ? styles.paginationDotActive : {},
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera-outline" size={60} color="#ccc" />
                        <Text style={styles.imagePlaceholderText}>No profile pictures</Text>
                    </View>
                )}
            </View>

            {/* Content Section (Name, Age, Bio, etc.) */}
            <View style={styles.content}>
                <Text style={styles.nameAgeText}>
                    {profile.first_name}
                    {age !== null ? `, ${age}` : ""}
                </Text>
                {profile.gender && (
                    <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Gender:</Text> {profile.gender}
                    </Text>
                )}
                {profile.location && (
                    <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Location:</Text> {profile.location}
                    </Text>
                )}
                {profile.bio && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>About Me</Text>
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    </View>
                )}
                {profile.interests && profile.interests.length > 0 && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Interests</Text>
                        <View style={styles.badgeContainer}>
                            {profile.interests.map((interest, index) => (
                                <View key={index} style={styles.badge}>
                                    <Text style={styles.badgeText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
                {profile.looking_for && (
                    <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Looking For</Text>
                        <Text style={styles.detailTextValue}>{profile.looking_for}</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

// --- Styles --- (Styles remain the same as your provided version)
const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        width: cardWidth,
        alignSelf: 'center',
        overflow: 'hidden',
        marginBottom: 10,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,

    },
    carouselContainer: {
        aspectRatio: 3 / 4, 
        width: '100%', 
        backgroundColor: '#e0e0e0',
        position: 'relative',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden', 
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
    },
    carouselItemContainer: {
        width: cardWidth, 
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e9e9e9',
    },
    carouselImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        aspectRatio: 3 / 4, 
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    imagePlaceholderText: { 
        marginTop: 10,
        color: '#b0b0b0',
        fontSize: 16,
    },
    imageErrorOverlay: { 
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    imageErrorText: { 
        color: "#fff",
        fontWeight: "bold",
        marginTop: 5,
    },
    content: {
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
    },
    nameAgeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    detailSection: {
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    detailText: {
        fontSize: 15,
        color: '#444',
        marginBottom: 6,
        lineHeight: 20,
    },
    detailTextValue: {
        fontSize: 15,
        color: '#444',
        lineHeight: 20,
    },
    bioText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 21,
    },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    badge: {
        backgroundColor: '#FFA07A',
        borderRadius: 15,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 6,
        marginBottom: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.00,
        elevation: 1,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    carouselControl: {
        position: 'absolute',
        top: '50%',
        marginTop: -18, 
        zIndex: 10, // Ensure chevrons are above the FlatList content for touch
    },
    carouselPrev: { left: 8 },
    carouselNext: { right: 8 },
    controlIconShadow: {
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 5,
        zIndex: 10, // Ensure dots are also above FlatList content
    },
    paginationDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        marginHorizontal: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(0, 0, 0, 0.3)',
    },
    paginationDotActive: {
        backgroundColor: '#ffffff',
        width: 8,
        height: 8,
        borderRadius: 4,
        borderColor: 'rgba(0, 0, 0, 0.0)',
    },
});

export default React.memo(ProfileCard);