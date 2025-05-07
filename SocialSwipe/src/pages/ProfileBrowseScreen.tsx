// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView, // We'll use this for content padding inside the gradient
    Alert,
    Pressable,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure this is installed
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../../App';

import ProfileCard, { Profile } from '../components/ProfileCard';

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
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        console.log(`Workspaceing profiles, excluding user ID: ${user.id}`);
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
                console.log(`Workspaceed ${data.length} raw profiles.`);
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
        if (user) fetchProfiles();
        else {
            setProfiles([]);
            setCurrentIndex(0);
            setLoading(false);
            setError(null);
        }
    }, [user, fetchProfiles]);

    const goToNextProfile = useCallback(() => setCurrentIndex(prev => Math.min(prev + 1, profiles.length - 1)), [profiles.length]);
    const goToPrevProfile = useCallback(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), []);

    const handleLikeProfile = useCallback(async (likedProfileId: string) => {
        if (!user) { Alert.alert("Login Required", "Please log in to like profiles."); return; }
        try {
            const { error: likeError } = await supabase.from('profile_likes').insert({ liker_user_id: user.id, liked_profile_id: likedProfileId });
            if (likeError) throw likeError;
            Alert.alert("Liked!", `${profiles.find(p => p.id === likedProfileId)?.first_name || 'Profile'} has been liked.`);
        } catch (err: any) {
            console.error("Error liking profile:", err.message);
            Alert.alert("Error", err.message || "Could not record like.");
        }
    }, [user, profiles]);

    // Conditional returns for login, loading, error, no profiles (these do not use the gradient)
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
                    <Text style={styles.loadingText}>Finding profiles...</Text>
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
    if (profiles.length === 0 && user) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>No other profiles found yet. Check back soon!</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}><Text style={styles.buttonText}>Refresh</Text></Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const currentProfile = profiles[currentIndex];

    // Main return with Gradient Background
    return (
        <LinearGradient
            colors={['#FF6B6B', '#FFD166']} // Example: Dark slate to very dark gray (Left to Right)
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientFullScreen} // Gradient covers the entire screen
        >
            <SafeAreaView style={styles.safeAreaWithGradientContent}> {/* SafeArea for content padding */}
                <View style={styles.storyContainer}> {/* This View now just handles layout inside SafeArea */}
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
                            <View style={styles.centeredMessageContainer}> 
                                <Text style={styles.infoText}>No profile to display.</Text>
                            </View>
                        )
                    )}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientFullScreen: { // Style for the LinearGradient root component
        flex: 1,
    },
    safeAreaWithGradientContent: { // SafeAreaView *inside* the gradient
        flex: 1,
        backgroundColor: 'transparent', // Crucial: allows gradient to show through
    },
    safeAreaSolidBackground: { // For loading/error/login states (NO GRADIENT)
        flex: 1,
        backgroundColor: '#1c1c1e', // Original dark background
    },
    storyContainer: { // This View is inside SafeAreaView, used for centering content
        flex: 1,
        justifyContent: 'center', 
        alignItems: 'center', 
        position: 'relative', 
        // No background color needed here; it sits on the gradient via transparent SafeAreaView
    },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
        color: '#d3d3d3',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    button: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FF6347',
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressBarsContainer: {
        position: 'absolute',
        top: 0, // Positioned at the top of the storyContainer (which is inside safe area)
        left: 10,
        right: 10,
        flexDirection: 'row',
        height: 3,
        zIndex: 10, 
        gap: 4, 
        paddingTop: 10, // Add some padding if status bar is transparent
    },
    progressBarSegment: {
        flex: 1,
        height: '100%',
        borderRadius: 1.5,
    },
    progressBarSegmentActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    progressBarSegmentInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
});