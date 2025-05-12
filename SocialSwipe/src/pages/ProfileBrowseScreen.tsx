// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView, // Still used for full-screen error/loading states and progress bars overlay
    Alert,
    Pressable,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../../App';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <<<< ADDED IMPORT

import ProfileCard, { Profile } from '../components/ProfileCard';

type RootStackParamList = {
    ProfileBrowse: undefined;
    EditProfileScreen: undefined;
    WelcomeScreen: undefined;
};

type ProfileBrowseScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileBrowse'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FetchedUserProfileData {
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures: string[] | null;
    created_at: string;
    updated_at: string;
    is_profile_complete: boolean;
}

export default function ProfileBrowseScreen() {
    const { user } = useApp();
    const navigation = useNavigation<ProfileBrowseScreenNavigationProp>();
    const insets = useSafeAreaInsets(); // <<<< GET SAFE AREA INSETS
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        const { error: signOutError } = await supabase.auth.signOut();
                        if (signOutError) {
                            Alert.alert("Logout Error", signOutError.message);
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEditProfile = () => {
        navigation.navigate('EditProfileScreen');
    };

    const getPublicImageUrl = useCallback((pathOrUrl: string | null | undefined): string | null => {
        if (!pathOrUrl) return null;
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
        try {
            const { data } = supabase.storage.from('profile_pictures').getPublicUrl(pathOrUrl);
            return data?.publicUrl ?? null;
        } catch (err) {
            console.error(`getPublicImageUrl: Error for path "${pathOrUrl}":`, err);
            return null;
        }
    }, []);

    const fetchProfiles = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('individual_profiles')
                .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, created_at, updated_at, is_profile_complete')
                .eq('is_profile_complete', true)
                .neq('user_id', user.id)
                .limit(50);

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                const transformedProfiles: Profile[] = await Promise.all(
                    data.map(async (rawProfile: FetchedUserProfileData) => {
                        const profilePicturesValues = Array.isArray(rawProfile.profile_pictures) ? rawProfile.profile_pictures : [];
                        const publicUrlsPromises = profilePicturesValues.map(pathOrUrl => getPublicImageUrl(pathOrUrl));
                        const resolvedUrls = await Promise.all(publicUrlsPromises);
                        const validPublicUrls = resolvedUrls.filter(url => url !== null) as string[];
                        return {
                            id: rawProfile.user_id,
                            first_name: rawProfile.first_name,
                            last_name: rawProfile.last_name,
                            date_of_birth: rawProfile.date_of_birth,
                            gender: rawProfile.gender,
                            bio: rawProfile.bio,
                            interests: rawProfile.interests,
                            location: rawProfile.location,
                            looking_for: rawProfile.looking_for,
                            profile_pictures: validPublicUrls,
                            created_at: rawProfile.created_at || new Date().toISOString(),
                            updated_at: rawProfile.updated_at || new Date().toISOString(),
                        };
                    })
                );
                setProfiles(transformedProfiles);
                setCurrentIndex(0);
            } else {
                setProfiles([]);
                setCurrentIndex(0);
            }
        } catch (err: any) {
            console.error("Error fetching profiles:", err.message);
            setError(err.message || "Failed to fetch profiles.");
            setProfiles([]);
            setCurrentIndex(0);
        } finally {
            setLoading(false);
        }
    }, [user, getPublicImageUrl]);

    useEffect(() => {
        if (user) {
            fetchProfiles();
        } else {
            setProfiles([]);
            setCurrentIndex(0);
            setError(null);
        }
    }, [user, fetchProfiles]);

    const goToNextProfile = useCallback(() => setCurrentIndex(prev => Math.min(prev + 1, profiles.length - 1)), [profiles.length]);
    const goToPrevProfile = useCallback(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), []);

    const handleLikeProfile = useCallback(async (likedProfileId: string) => {
        if (!user) {
            Alert.alert("Login Required", "Please log in to like profiles.");
            return;
        }
        try {
            const likerUserId = user.id;
            const likeData = { liker_user_id: likerUserId, liked_user_id: likedProfileId };
            const { error: insertError } = await supabase.from('likes').insert([likeData]);

            if (insertError) {
                if (insertError.code === '23505') {
                    Alert.alert("Already Liked", `You've already liked ${profiles.find(p => p.id === likedProfileId)?.first_name || 'this profile'}.`);
                } else {
                    throw new Error(`Failed to insert like: ${insertError.message} (Code: ${insertError.code})`);
                }
            } else {
                Alert.alert("Liked!", `${profiles.find(p => p.id === likedProfileId)?.first_name || 'Profile'} has been liked.`);
            }
        } catch (err: any) {
            console.error("Error in handleLikeProfile:", err);
            Alert.alert("Error Liking Profile", err.message || "Could not record like. Please try again.");
        }
    }, [user, profiles]);

    // Dynamic header style using insets
    const headerDynamicStyle = {
        paddingTop: insets.top + styles.headerContainer.paddingVertical, // Add top inset to base vertical padding
        paddingBottom: styles.headerContainer.paddingVertical, // Keep base bottom vertical padding
        paddingLeft: insets.left + styles.headerContainer.paddingHorizontal, // Add left inset to base horizontal padding
        paddingRight: insets.right + styles.headerContainer.paddingHorizontal, // Add right inset to base horizontal padding
    };

    if (!user && !loading) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>Please log in to browse profiles.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>
                        {user && profiles.length === 0 && !error ? 'Finding profiles...' : 'Processing...'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}><Text style={styles.buttonText}>Try Again</Text></Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (user && !loading && profiles.length === 0) {
        return (
            <LinearGradient
                colors={['#FF6B6B', '#FFD166']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.gradientFullScreen}
            >
                <View style={[styles.headerContainer, headerDynamicStyle]}>
                    <Pressable onPress={handleEditProfile} style={[styles.headerButton, styles.headerButtonLeft]}>
                        <Text style={styles.headerButtonText}>Edit Profile</Text>
                    </Pressable>
                    <Pressable onPress={handleLogout} style={[styles.headerButton, styles.headerButtonRight]}>
                        <Text style={styles.headerButtonText}>Logout</Text>
                    </Pressable>
                </View>
                <View style={styles.centeredMessageContainerOnGradient}>
                    <Text style={styles.infoText}>No other profiles found yet. Check back soon!</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}><Text style={styles.buttonText}>Refresh</Text></Pressable>
                </View>
            </LinearGradient>
        );
    }

    const currentProfile = profiles[currentIndex];

    return (
        <LinearGradient
            colors={['#fe9494', '#00008b']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientFullScreen}
        >
            <View style={[styles.headerContainer, headerDynamicStyle]}>
                <Pressable onPress={handleEditProfile} style={[styles.headerButton, styles.headerButtonLeft]}>
                    <Text style={styles.headerButtonText}>Edit Profile</Text>
                </Pressable>
                <Pressable onPress={handleLogout} style={[styles.headerButton, styles.headerButtonRight]}>
                    <Text style={styles.headerButtonText}>Logout</Text>
                </Pressable>
            </View>

            {currentProfile ? (
                <ProfileCard
                    profile={currentProfile}
                    onLike={handleLikeProfile}
                    isVisible={true}
                    onRequestNextProfile={goToNextProfile}
                    onRequestPrevProfile={goToPrevProfile}
                />
            ) : (
                !loading && (
                    <View style={styles.centeredMessageContainerOnGradient}>
                        <Text style={styles.infoText}>No profile to display.</Text>
                    </View>
                )
            )}

            {profiles.length > 0 && currentProfile && (
                // This SafeAreaView ensures progress bars are not under system UI if they were at the very top/bottom edge
                // Its main purpose here is to provide a positioned container for the absolutely positioned progress bars.
                <SafeAreaView style={styles.progressSafeArea}>
                    <View style={styles.progressBarsContainer}>
                        {profiles.map((_, index) => (
                            <View
                                key={`progress-${index}`}
                                style={[
                                    styles.progressBarSegment,
                                    index === currentIndex ? styles.progressBarSegmentActive : styles.progressBarSegmentInactive,
                                ]}
                            />
                        ))}
                    </View>
                </SafeAreaView>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientFullScreen: {
        flex: 1,
    },
    // headerSafeArea style is no longer needed as we apply insets directly
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15, // Base horizontal padding
        paddingVertical: -6,   // <<<< INCREASED base vertical padding for a slightly taller header (was 10)
        minHeight: 40,         // Content height for buttons
        zIndex: 20,            // Ensure header is above other content
        // The actual paddingTop, Left, Right will be dynamically set using insets
    },
    headerButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    headerButtonLeft: {},
    headerButtonRight: {},
    headerButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    safeAreaSolidBackground: {
        flex: 1,
        backgroundColor: '#1c1c1e',
    },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredMessageContainerOnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#f0f0f0',
    },
    errorText: {
        color: '#FF6347',
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 20,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 16,
        color: 'white',
        paddingHorizontal: 20,
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    button: {
        marginTop: 10,
        paddingVertical: 12,
        paddingHorizontal: 25,
        backgroundColor: '#FF6347',
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressSafeArea: { // This SafeAreaView contains the progress bars
        position: 'absolute',
        top: 0, // It's placed at the top of the LinearGradient
        left: 0,
        right: 0,
        zIndex: 10,
        // Its content (progressBarsContainer) will inherently respect insets.top due to being inside a SafeAreaView
    },
    progressBarsContainer: {
        flexDirection: 'row',
        height: 4,
        marginHorizontal: 10,
        gap: 4,
        // The new base header height: minHeight (40) + paddingVertical*2 (15*2=30) = 70px.
        // This marginTop is from the top of the content area of progressSafeArea (which already accounts for system status bar).
        marginTop: 70 + 15, // Base header height (70) + desired gap (15) = 85
    },
    progressBarSegment: {
        flex: 1,
        height: '100%',
        borderRadius: 2,
    },
    progressBarSegmentActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    progressBarSegmentInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
});